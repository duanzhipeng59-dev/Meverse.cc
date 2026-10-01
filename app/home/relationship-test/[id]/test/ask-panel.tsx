"use client";

import { useEffect, useRef, useState } from "react";

type ChatEntry = { role: "user" | "assistant"; content: string };

export default function StarAskPanel({
  starId,
  starName,
  suggestions,
}: {
  starId: string;
  starName: string;
  suggestions: string[];
}) {
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [entries, loading]);

  async function ask(question: string) {
    const text = question.trim();
    if (!text || loading) return;
    setError("");
    setInput("");
    const history = entries.slice(-12);
    setEntries((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);
    try {
      const response = await fetch("/api/myfate/star-report-ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ starId, history, question: text }),
      });
      if (response.status === 401) {
        window.location.reload();
        return;
      }
      if (response.status === 503) throw new Error("暂时无法回答，请稍后再试。");
      if (!response.ok) throw new Error("追问失败，请稍后再试。");
      const body = await response.json() as { answer?: string };
      if (!body.answer) throw new Error("追问失败，请稍后再试。");
      setEntries((prev) => [...prev, { role: "assistant", content: body.answer as string }]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "追问失败，请稍后再试。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mf-zr-card mf-zr-ask">
      <h2 className="mf-zr-card-title">✦ 继续追问</h2>
      <p className="mf-zr-ask-sub">基于 {starName} 的八字盘与上方报告，继续问你想知道的</p>

      <div className="mf-zr-ask-log" ref={scrollRef}>
        {entries.length === 0 && !loading ? (
          <p className="mf-zr-ask-empty">✦ 从下面的引导问题开始，或直接输入你的追问</p>
        ) : null}
        {entries.map((entry, index) => (
          <div className={`mf-zr-ask-msg ${entry.role}`} key={index}>
            <p>{entry.content}</p>
          </div>
        ))}
        {loading ? (
          <div className="mf-zr-ask-msg assistant">
            <p className="mf-zr-ask-typing">正在起卦<i>…</i></p>
          </div>
        ) : null}
      </div>

      <div className="mf-zr-ask-chips">
        {suggestions.map((item) => (
          <button type="button" key={item} onClick={() => void ask(item)} disabled={loading}>{item}</button>
        ))}
      </div>

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
