"use client";

import { useEffect, useRef, useState } from "react";
import { Button, ConfirmDialog } from "../../../../components/ui";

type AskEntry = {
  id: number;
  role: "user" | "assistant";
  content: string;
  status: "sending" | "completed" | "failed";
  createdAt: string;
};

function timeOf(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const day = date.toDateString() === now.toDateString() ? "今天" : date.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
  return `${day} ${date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`;
}

// 早期落库的回答可能残留 markdown 星号,展示前统一清洗
function cleanText(text: string) {
  return text.replaceAll("*", "");
}

export default function StarAskPanel({
  starId,
  starName,
  suggestions,
  reportType = "bazi",
}: {
  starId: string;
  starName: string;
  suggestions: string[];
  reportType?: "bazi" | "astrology" | "dual";
}) {
  const [entries, setEntries] = useState<AskEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const dirtyRef = useRef(false);
  // 逐字呈现:最新的 AI 回答打字机输出
  const [typedId, setTypedId] = useState<number | null>(null);
  const [typedText, setTypedText] = useState("");
  const typerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (typerRef.current !== null) window.clearInterval(typerRef.current);
  }, []);

  function startTyping(id: number, fullText: string) {
    if (typerRef.current !== null) window.clearInterval(typerRef.current);
    setTypedId(id);
    setTypedText("");
    let index = 0;
    typerRef.current = window.setInterval(() => {
      index += 2; // 每帧 2 字,约 30 字/秒
      setTypedText(fullText.slice(0, index));
      if (index >= fullText.length) {
        window.clearInterval(typerRef.current!);
        typerRef.current = null;
        setTypedId(null);
      }
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    }, 65);
  }

  useEffect(() => {
    let active = true;
    void fetch(`/api/myfate/star-report-ask?starId=${encodeURIComponent(starId)}&type=${reportType}`, { cache: "no-store" })
      .then((response) => (response.ok ? (response.json() as Promise<{ messages?: AskEntry[]; hasMore?: boolean }>) : null))
      .then((data) => {
        if (!active || !data || dirtyRef.current) return;
        setEntries((data.messages ?? []).map((entry) => ({ ...entry, content: cleanText(entry.content) })));
        setHasMore(Boolean(data.hasMore));
        setLoaded(true);
      })
      .catch(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, [starId, reportType]);

  useEffect(() => {
    if (entries.length) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [entries.length, loading]);

  // 章节「就这段问 AI」按钮:预填章节上下文并聚焦输入框
  useEffect(() => {
    const onSection = (event: Event) => {
      const label = (event as CustomEvent<string>).detail;
      setInput(`关于「${label}」章节：`);
      document.querySelector<HTMLInputElement>(".mf-zr-ask-form input")?.focus();
    };
    window.addEventListener("mf-ask-section", onSection);
    return () => window.removeEventListener("mf-ask-section", onSection);
  }, []);

  async function loadOlder() {
    const oldest = entries[0]?.id;
    if (!oldest || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const response = await fetch(`/api/myfate/star-report-ask?starId=${encodeURIComponent(starId)}&type=${reportType}&before=${oldest}`, { cache: "no-store" });
      const data = await response.json() as { messages?: AskEntry[]; hasMore?: boolean };
      setEntries((prev) => [...(data.messages ?? []).map((entry) => ({ ...entry, content: cleanText(entry.content) })), ...prev]);
      setHasMore(Boolean(data.hasMore));
    } catch { /* 保持现状 */ } finally {
      setLoadingOlder(false);
    }
  }

  async function ask(question: string, retryOf?: number) {
    const text = question.trim();
    if (!text || loading) return;
    dirtyRef.current = true;
    setError("");
    const optimisticId = retryOf ?? -Date.now();
    const optimistic: AskEntry = { id: optimisticId, role: "user", content: text, status: "sending", createdAt: new Date().toISOString() };
    if (retryOf) {
      setEntries((prev) => prev.map((entry) => (entry.id === retryOf ? { ...entry, status: "sending" } : entry)));
    } else {
      setEntries((prev) => [...prev, optimistic]);
    }
    setLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;
    let succeeded = false;
    try {
      const response = await fetch("/api/myfate/star-report-ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ starId, reportType, question: text, retryOf }),
        signal: controller.signal,
      });
      if (response.status === 401) {
        window.location.reload();
        return;
      }
      const body = await response.json() as { answer?: string; messageId?: number };
      if (!response.ok || !body.answer) {
        if (body.messageId) {
          // 服务端已留存失败问题,替换为可重试记录
          setEntries((prev) => prev.map((entry) => (entry.id === optimisticId ? { ...entry, id: body.messageId as number, status: "failed" } : entry)));
        } else if (!retryOf) {
          setEntries((prev) => [...prev.slice(0, -1), { ...optimistic, status: "failed" }]);
        } else {
          setEntries((prev) => prev.map((entry) => (entry.id === optimisticId ? { ...entry, status: "failed" } : entry)));
        }
        setError("回答失败,输入已保留,可点击该问题重试。");
        if (!retryOf) setInput(text);
        return;
      }
      const answerAt = new Date().toISOString();
      const answerId = -Date.now() - 1;
      setEntries((prev) => {
        const marked = prev.map((entry) => (entry.id === optimisticId ? { ...entry, id: body.messageId && body.messageId > 0 ? body.messageId : entry.id, status: "completed" as const } : entry));
        return [...marked, { id: answerId, role: "assistant", content: cleanText(body.answer as string), status: "completed", createdAt: answerAt }];
      });
      startTyping(answerId, cleanText(body.answer as string));
      succeeded = true;
    } catch (error) {
      setEntries((prev) => prev.map((entry) => (entry.id === optimisticId ? { ...entry, status: "failed" } : entry)));
      setError(controller.signal.aborted ? "已停止生成,该问题可重新发送。" : "网络异常,输入已保留,请重试。");
    } finally {
      // 成功才清空输入;失败/停止都保留,便于直接重发
      if (succeeded) setInput("");
      setLoading(false);
      abortRef.current = null;
    }
  }

  async function clearChat() {
    setConfirmClear(false);
    setEntries([]);
    setHasMore(false);
    await fetch(`/api/myfate/star-report-ask?starId=${encodeURIComponent(starId)}&type=${reportType}`, { method: "DELETE" }).catch(() => undefined);
  }

  const hasHistory = entries.length > 0;

  return (
    <section className="mf-zr-card mf-zr-ask">
      <div className="mf-zr-ask-head">
        <h2 className="mf-zr-card-title">✦ AI追问</h2>
        {hasHistory ? (
          <button type="button" className="mf-zr-ask-clear" onClick={() => setConfirmClear(true)}>清空对话</button>
        ) : null}
      </div>

      <div className="mf-zr-ask-log" ref={scrollRef}>
        {loaded ? (
          <div className="mf-zr-ask-msg assistant">
            <p>{`已经阅读完「${starName}」的报告——从性格底色、事业财富，到感情节奏和未来几年都梳理完了。想深入了解哪一部分？直接问我就好。`}</p>
          </div>
        ) : null}
        {loaded && hasMore ? (
          <button type="button" className="mf-zr-ask-older" disabled={loadingOlder} onClick={() => void loadOlder()}>
            {loadingOlder ? "正在加载…" : "查看更早的消息"}
          </button>
        ) : null}
        {entries.map((entry) => (
          <div className={`mf-zr-ask-msg ${entry.role} ${entry.status === "failed" ? "is-failed" : ""}`} key={entry.id}>
            <p>{entry.id === typedId ? <>{typedText}<i className="mf-ask-caret" aria-hidden="true" /></> : entry.content}</p>
            {entry.status === "failed" ? (
              <div className="mf-zr-ask-retry">
                <small>回答失败</small>
                <button type="button" disabled={loading} onClick={() => void ask(entry.content, entry.id > 0 ? entry.id : undefined)}>重新生成</button>
              </div>
            ) : (
              <small className="mf-zr-ask-time">{timeOf(entry.createdAt)}</small>
            )}
          </div>
        ))}
        {loading ? (
          <div className="mf-zr-ask-msg assistant">
            <p className="mf-zr-ask-typing">正在推演<i>…</i></p>
          </div>
        ) : null}
      </div>

      {!hasHistory ? (
        <div className="mf-zr-ask-chips">
          {suggestions.map((item) => (
            <button type="button" key={item} onClick={() => void ask(item)} disabled={loading}>{item}</button>
          ))}
        </div>
      ) : null}

      {error ? <p className="mf-zr-ask-error" role="alert">{error}</p> : null}

      <ConfirmDialog
        open={confirmClear}
        title="清空追问记录"
        message="确定清空这份报告的全部追问记录吗？报告正文不受影响。"
        confirmText="清空"
        onConfirm={() => void clearChat()}
        onCancel={() => setConfirmClear(false)}
      />

      <form
        className="mf-zr-ask-form"
        onSubmit={(event) => {
          event.preventDefault();
          void ask(input);
        }}
      >
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="输入你想追问的问题…"
          maxLength={500}
        />
        {loading ? (
          <Button variant="ghost" type="button" onClick={() => abortRef.current?.abort()}>停止</Button>
        ) : (
          <button type="submit" disabled={!input.trim()}>追问</button>
        )}
      </form>
    </section>
  );
}
