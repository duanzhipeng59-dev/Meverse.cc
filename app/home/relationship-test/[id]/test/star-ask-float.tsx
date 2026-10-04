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

// AI 追问:右下角悬浮按钮 + 竖版对话面板。
// 首次提问由服务端把报告全文+问题发给 DeepSeek(可换模型);历史按用户+报告持久化。
export default function StarAskFloat({
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
  const [open, setOpen] = useState(false);
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

  useEffect(() => {
    let active = true;
    void fetch(`/api/myfate/star-report-ask?starId=${encodeURIComponent(starId)}&type=${reportType}`, { cache: "no-store" })
      .then((response) => (response.ok ? (response.json() as Promise<{ messages?: AskEntry[]; hasMore?: boolean }>) : null))
      .then((data) => {
        if (!active || !data || dirtyRef.current) return;
        setEntries(data.messages ?? []);
        setHasMore(Boolean(data.hasMore));
        setLoaded(true);
      })
      .catch(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, [starId, reportType]);

  useEffect(() => {
    if (open && entries.length) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [entries.length, loading, open]);

  async function loadOlder() {
    const oldest = entries[0]?.id;
    if (!oldest || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const response = await fetch(`/api/myfate/star-report-ask?starId=${encodeURIComponent(starId)}&type=${reportType}&before=${oldest}`, { cache: "no-store" });
      const data = await response.json() as { messages?: AskEntry[]; hasMore?: boolean };
      setEntries((prev) => [...(data.messages ?? []), ...prev]);
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
      setEntries((prev) => {
        const marked = prev.map((entry) => (entry.id === optimisticId ? { ...entry, id: body.messageId && body.messageId > 0 ? body.messageId : entry.id, status: "completed" as const } : entry));
        return [...marked, { id: -Date.now() - 1, role: "assistant", content: body.answer as string, status: "completed", createdAt: answerAt }];
      });
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
  const greeting = `已经阅读完「${starName}」的报告——从性格底色、事业财富，到感情节奏和未来几年都梳理完了。想深入了解哪一部分？直接问我就好。`;

  return (
    <>
      {!open ? (
        <button className="mf-askfab" type="button" aria-label="打开 AI 追问" onClick={() => setOpen(true)}>
          <i aria-hidden="true">✦</i>
          <span>AI 追问</span>
        </button>
      ) : null}

      {open ? (
        <div className="mf-askpanel" role="dialog" aria-label={`关于 ${starName} 的 AI 追问`}>
          <header className="mf-askpanel-head">
            <div>
              <b>✦ AI 追问</b>
              <small>{starName} · 基于报告解答{metered && typeof asksRemaining === "number" ? ` · 剩余 ${asksRemaining} 次` : ""}</small>
            </div>
            <div className="mf-askpanel-head-actions">
              {hasHistory ? (
                <button type="button" aria-label="清空对话" onClick={() => void clearChat()}>清空</button>
              ) : null}
              <button type="button" aria-label="关闭对话" onClick={() => setOpen(false)}>×</button>
            </div>
          </header>

          <div className="mf-askpanel-log" ref={scrollRef}>
            {loaded && hasMore ? (
              <button type="button" className="mf-askpanel-older" disabled={loadingOlder} onClick={() => void loadOlder()}>
                {loadingOlder ? "正在加载…" : "查看更早的消息"}
              </button>
            ) : null}
            {loaded && !hasHistory ? (
              <div className="mf-askpanel-msg assistant">
                <p>{greeting}</p>
              </div>
            ) : null}
            {entries.map((entry) => (
              <div className={`mf-askpanel-msg ${entry.role} ${entry.status === "failed" ? "is-failed" : ""}`} key={entry.id}>
                <p>{entry.content}</p>
                {entry.status === "failed" ? (
                  <div className="mf-askpanel-retry">
                    <small>回答失败</small>
                    <button type="button" disabled={loading} onClick={() => void ask(entry.content, entry.id > 0 ? entry.id : undefined)}>重新生成</button>
                  </div>
                ) : (
                  <small>{timeOf(entry.createdAt)}</small>
                )}
              </div>
            ))}
            {loading ? (
              <div className="mf-askpanel-msg assistant">
                <p className="is-typing">正在推演<i>…</i></p>
              </div>
            ) : null}
          </div>

          {!hasHistory ? (
            <div className="mf-askpanel-chips">
              {suggestions.map((item) => (
                <button type="button" key={item} onClick={() => void ask(item)} disabled={loading}>{item}</button>
              ))}
            </div>
          ) : null}

          {error ? <p className="mf-askpanel-error" role="alert">{error}</p> : null}

          <form
            className="mf-askpanel-form"
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
            <button type="submit" disabled={loading || !input.trim()} aria-label="发送">↑</button>
          </form>
        </div>
      ) : null}
    </>
  );
}
