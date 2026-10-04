"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth-context";
import type { DualStarCandidate } from "../../myfate-dual-server";

// 双星选择:顶部紧凑"双人关系卡"(头像A—连线—头像B),选完原地确认;面板手机双列网格。
// 未登录可完成选择,点生成时走登录并在登录后保留(选择存 sessionStorage)。
const STATE_KEY = "myfate_dual_pick_v1";

type Slot = DualStarCandidate | null;

export default function DualStarPicker({ candidates, initialStarId, upgradesEnabled }: { candidates: DualStarCandidate[]; initialStarId: string | null; upgradesEnabled: boolean }) {
  const { status } = useAuth();
  const [slotA, setSlotA] = useState<Slot>(candidates.find((c) => c.id === initialStarId) ?? null);
  const [slotB, setSlotB] = useState<Slot>(null);
  const [picking, setPicking] = useState<"A" | "B" | null>(null);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [existing, setExisting] = useState<{ reportId: string; label: string } | null>(null);

  useEffect(() => {
    if (initialStarId) return;
    try {
      const saved = JSON.parse(sessionStorage.getItem(STATE_KEY) ?? "null") as { a?: string | null; b?: string | null } | null;
      if (saved?.a) setSlotA(candidates.find((c) => c.id === saved.a) ?? null);
      if (saved?.b) setSlotB(candidates.find((c) => c.id === saved.b) ?? null);
    } catch {
      // 忽略
    }
  }, [candidates, initialStarId]);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return candidates;
    return candidates.filter((c) => c.name.toLowerCase().includes(keyword) || c.role.toLowerCase().includes(keyword));
  }, [candidates, query]);

  function persist(a: Slot, b: Slot) {
    try {
      sessionStorage.setItem(STATE_KEY, JSON.stringify({ a: a?.id ?? null, b: b?.id ?? null }));
    } catch {
      // 隐私模式忽略
    }
  }

  function choose(candidate: DualStarCandidate) {
    if (picking === "A") {
      if (slotB?.id === candidate.id) return;
      setSlotA(candidate);
      persist(candidate, slotB);
    } else if (picking === "B") {
      if (slotA?.id === candidate.id) return;
      setSlotB(candidate);
      persist(slotA, candidate);
    }
    setPicking(null);
    setQuery("");
    setExisting(null);
  }

  async function generate(regenerate = false) {
    if (!slotA || !slotB || creating) return;
    persist(slotA, slotB);
    if (status !== "authenticated") {
      window.location.href = `/login?next=${encodeURIComponent("/home/dual-star-match")}&from=${encodeURIComponent("/home/dual-star-match")}`;
      return;
    }
    setCreating(true);
    setError("");
    setExisting(null);
    try {
      const response = await fetch("/api/dual-star/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ starA: slotA.id, starB: slotB.id, regenerate }),
      });
      if (response.status === 402) {
        window.location.href = "/home/upgrade";
        return;
      }
      const data = await response.json() as { reportId?: string; existing?: boolean; error?: string };
      if (!response.ok || !data.reportId) {
        setError(data.error === "INCOMPLETE_BIRTH_DATA" ? "两位明星的出生资料都需要完整（日期、时间、地点）才能生成合盘。" : "生成请求失败，请重试。");
        return;
      }
      if (data.existing && !regenerate) {
        setExisting({ reportId: data.reportId, label: `${slotA.name} × ${slotB.name}` });
        return;
      }
      window.location.href = `/home/dual-star-match/reports/${data.reportId}`;
    } catch {
      setError("网络异常，请重试。");
    } finally {
      setCreating(false);
    }
  }

  const bothReady = Boolean(slotA && slotB);

  return (
    <div className="mf-dual">
      <header className="mf-dual-head">
        <span className="mf-kicker">偶像合盘</span>
        <h1>两位明星,一段关系动力</h1>
      </header>

      <section className="mf-dual-relation" aria-label="双人关系卡">
        <button className={slotA ? "mf-dual-node is-filled" : "mf-dual-node"} type="button" onClick={() => setPicking("A")} aria-label={slotA ? `更换明星 A（当前 ${slotA.name}）` : "选择明星 A"}>
          {slotA ? (<>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={slotA.portraitSrc} alt={`${slotA.name}的人物肖像`} />
            <b>{slotA.name}</b>
            <small>{slotA.role}</small>
          </>) : (<>
            <i aria-hidden="true">＋</i>
            <b>选择明星 A</b>
            <small>点击选择</small>
          </>)}
        </button>
        <div className="mf-dual-link" aria-hidden="true">
          <i />
          <span>{bothReady ? "关系建立" : "待选择"}</span>
          <i />
        </div>
        <button className={slotB ? "mf-dual-node is-filled" : "mf-dual-node"} type="button" onClick={() => setPicking("B")} aria-label={slotB ? `更换明星 B（当前 ${slotB.name}）` : "选择明星 B"}>
          {slotB ? (<>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={slotB.portraitSrc} alt={`${slotB.name}的人物肖像`} />
            <b>{slotB.name}</b>
            <small>{slotB.role}</small>
          </>) : (<>
            <i aria-hidden="true">＋</i>
            <b>选择明星 B</b>
            <small>点击选择</small>
          </>)}
        </button>
      </section>

      <div className="mf-dual-cta-zone">
        <p className="mf-dual-value">报告将从 <b>吸引力、情绪连接、沟通方式、冲突模式、合作互补、长期潜力</b> 与 <b>未来三年时间线</b> 等维度分析两人的关系动力。</p>
        {bothReady ? (
          <>
            <p className="mf-dual-meta">{slotA!.name}（{slotA!.birthDate.replaceAll("-", ".")} · {slotA!.birthPlace}） × {slotB!.name}（{slotB!.birthDate.replaceAll("-", ".")} · {slotB!.birthPlace}）</p>
            {existing ? (
              <div className="mf-dual-existing" role="status">
                <span>已经有一份「{existing.label}」的合盘报告</span>
                <Link href={`/home/dual-star-match/reports/${existing.reportId}`}>查看原报告</Link>
                <button type="button" onClick={() => generate(true)}>重新生成</button>
              </div>
            ) : null}
            <div className="mf-dual-actions">
              <button className="mf-primary-button mf-dual-generate" type="button" disabled={creating} onClick={() => generate(false)}>
                {creating ? "正在创建…" : "生成偶像合盘报告"}
              </button>
              <button className="mf-dual-ghost" type="button" onClick={() => setPicking("A")}>更换 A</button>
              <button className="mf-dual-ghost" type="button" onClick={() => setPicking("B")}>更换 B</button>
            </div>
            <p className="mf-dual-note">{upgradesEnabled ? "生成消耗 1 次解读额度,生成失败自动退回;报告生成后永久保存。" : "当前限时免费生成;报告生成后永久保存。"}报告基于公开出生资料与命理模型,不代表两位明星的现实关系。</p>
          </>
        ) : (
          <p className="mf-dual-hint">先选择两位资料完整的明星。资料待补充的明星暂不能参与合盘。</p>
        )}
        {error ? <p className="mf-dual-error" role="alert">{error}</p> : null}
      </div>

      {picking ? (
        <div className="mf-dual-panel" role="dialog" aria-modal="true" aria-label="选择明星">
          <div className="mf-dual-panel-mask" onClick={() => setPicking(null)} />
          <div className="mf-dual-panel-sheet">
            <header>
              <b>选择明星 {picking === "A" ? "A" : "B"}</b>
              <button type="button" aria-label="关闭选择面板" onClick={() => setPicking(null)}>×</button>
            </header>
            <label className="mf-dual-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.6" /><path d="m16 16 4.5 4.5" /></svg>
              <input type="search" placeholder="搜索" value={query} onChange={(event) => setQuery(event.target.value)} autoFocus />
            </label>
            <div className={query.trim() ? "mf-dual-list" : "mf-dual-grid"}>
              {(query.trim() ? filtered : filtered).map((candidate) => {
                const used = candidate.id === slotA?.id || candidate.id === slotB?.id;
                return (
                  <button
                    key={candidate.id}
                    type="button"
                    className={candidate.hasFullBirth ? undefined : "is-incomplete"}
                    disabled={!candidate.hasFullBirth || used}
                    onClick={() => choose(candidate)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={candidate.portraitSrc} alt={`${candidate.name}的人物肖像`} loading="lazy" />
                    <span><b>{candidate.name}</b><small>{candidate.role}</small></span>
                    <em>{used ? "已选择" : candidate.hasFullBirth ? "资料完整" : "资料待补充"}</em>
                  </button>
                );
              })}
              {!filtered.length ? <p className="mf-dual-empty">没有找到相关明星</p> : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
