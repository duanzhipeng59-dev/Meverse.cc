"use client";

import { useEffect, useRef, useState } from "react";

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
  metered = true,
  reportType = "bazi",
}: {
  starId: string;
  starName: string;
  suggestions: string[];
  metered?: boolean;
  reportType?: "bazi" | "astrology" | "dual";
}) {
  const [entries, setEntries] = useState<AskEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [asksRemaining, setAsksRemaining] = useState<number | null>(null);
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
    setInput("");
    const optimisticId = retryOf ?? -Date.now();
    const optimistic: AskEntry = { id: optimisticId, role: "user", content: text, status: "sending", createdAt: new Date().toISOString() };
    if (retryOf) {
      setEntries((prev) => prev.map((entry) => (entry.id === retryOf ? { ...entry, status: "sending" } : entry)));
    } else {
      setEntries((prev) => [...prev, optimistic]);
    }
    setLoading(true);
    try {
      const response = await fetch("/api/myfate/star-report-ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ starId, reportType, question: text, retryOf }),
      });
      if (response.status === 401) {
        window.location.reload();
        return;
      }
      if (response.status === 402) {
        if (!retryOf) setEntries((prev) => prev.filter((entry) => entry.id !== optimisticId));
        setError("追问额度不足：每 1 次解读附赠 10 次追问，请先购买解读套餐。");
        setTimeout(() => { window.location.href = "/home/upgrade"; }, 2200);
        return;
      }
      const body = await response.json() as { answer?: string; asksRemaining?: number | null; messageId?: number };
      if (!response.ok || !body.answer) {
        if (body.messageId) {
          // 服务端已留存失败问题,替换为可重试记录
          setEntries((prev) => prev.map((entry) => (entry.id === optimisticId ? { ...entry, id: body.messageId as number, status: "failed" } : entry)));
        } else if (!retryOf) {
          setEntries((prev) => [...prev.slice(0, -1), { ...optimistic, status: "failed" }]);
        } else {
          setEntries((prev) => prev.map((entry) => (entry.id === optimisticId ? { ...entry, status: "failed" } : entry)));
        }
        setError("回答失败，请点击该问题重试。");
        return;
      }
      if (metered && typeof body.asksRemaining === "number") setAsksRemaining(body.asksRemaining);
      const answerAt = new Date().toISOString();
      const answerId = -Date.now() - 1;
      setEntries((prev) => {
        const marked = prev.map((entry) => (entry.id === optimisticId ? { ...entry, id: body.messageId && body.messageId > 0 ? body.messageId : entry.id, status: "completed" as const } : entry));
        return [...marked, { id: answerId, role: "assistant", content: cleanText(body.answer as string), status: "completed", createdAt: answerAt }];
      });
      startTyping(answerId, cleanText(body.answer as string));
    } catch {
      setEntries((prev) => prev.map((entry) => (entry.id === optimisticId ? { ...entry, status: "failed" } : entry)));
      setError("网络异常，请重试。");
    } finally {
      setLoading(false);
    }
  }

  async function clearChat() {
    if (!window.confirm("清空这份报告的追问记录？报告正文不受影响。")) return;
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
          <button type="button" className="mf-zr-ask-clear" onClick={() => void clearChat()}>清空对话</button>
        ) : null}
      </div>
      {!hasHistory || (metered && typeof asksRemaining === "number") ? (
        <p className="mf-zr-ask-sub">

          {hasHistory && metered && typeof asksRemaining === "number" ? `剩余追问 ${asksRemaining} 次` : ""}
        </p>
      ) : null}

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
          disabled={loading}
        />
        <button type="submit" disabled={loading || !input.trim()}>追问</button>
      </form>
    </section>
  );
}
