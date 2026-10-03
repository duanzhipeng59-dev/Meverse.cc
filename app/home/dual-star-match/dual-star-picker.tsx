"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAuth } from "../../auth-context";
import type { DualStarCandidate } from "../../myfate-dual-server";

// 双星选择:两个选择位 + 明星面板(搜索/完整度) + 生成前确认区。
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

  // 登录前暂存选择,登录回来恢复
  useMemo(() => {
    if (status !== "loading") return;
  }, [status]);

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

  function restore() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STATE_KEY) ?? "null") as { a?: string | null; b?: string | null } | null;
      if (saved?.a) setSlotA(candidates.find((c) => c.id === saved.a) ?? null);
      if (saved?.b) setSlotB(candidates.find((c) => c.id === saved.b) ?? null);
    } catch {
      // 忽略
    }
  }

  // 挂载时若无携带明星,尝试恢复登录前暂存的选择
  useMemo(() => {
    if (!initialStarId) restore();
  }, [candidates]);

  function choose(candidate: DualStarCandidate) {
    if (picking === "A") {
      if (slotB?.id === candidate.id) return;
      setSlotA(candidate);
    } else if (picking === "B") {
      if (slotA?.id === candidate.id) return;
      setSlotB(candidate);
    }
    setPicking(null);
    setQuery("");
    setExisting(null);
    persist(picking === "A" ? candidate : slotA, picking === "B" ? candidate : slotB);
  }

  function swap() {
    setSlotA(slotB);
    setSlotB(slotA);
    persist(slotB, slotA);
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
        <span className="mf-kicker">双星合盘</span>
        <h1>双星合盘</h1>
        <p>选择两位明星，看看他们之间会形成怎样的关系动力。</p>
      </header>

      <section className="mf-dual-slots" aria-label="选择两位明星">
        <SlotCard slot={slotA} label="明星 A" emptyHint="点击选择" onPick={() => setPicking("A")} />
        <span className="mf-dual-times" aria-hidden="true">×</span>
        <SlotCard slot={slotB} label="明星 B" emptyHint="点击选择" onPick={() => setPicking("B")} />
      </section>

      {bothReady ? (
        <section className="mf-dual-confirm" aria-label="生成前确认">
          <div className="mf-dual-confirm-people">
            {[slotA, slotB].map((slot) => slot ? (
              <div key={slot.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={slot.portraitSrc} alt={`${slot.name}的人物肖像`} />
                <b>{slot.name}</b>
                <small>{slot.role}</small>
                <small>{slot.birthDate.replaceAll("-", ".")} · {slot.birthPlace}</small>
                <small className="mf-dual-full">资料完整 · 已含出生时间</small>
              </div>
            ) : null)}
          </div>
          <div className="mf-dual-confirm-info">
            <p>报告包含：关系总览、相互吸引、情绪与沟通、关系动力、合作与事业、矛盾与成长、长期倾向与命理依据，支持 AI 追问与分享。</p>
            <p>{upgradesEnabled ? "生成消耗 1 次解读额度；生成失败自动退回。" : "当前限时免费生成；生成后永久保存。"}</p>
            <p className="mf-dual-note">报告基于公开出生资料与命理模型，仅用于娱乐，不代表两位明星的现实关系。</p>
          </div>
          {existing ? (
            <div className="mf-dual-existing" role="status">
              <span>已经有一份「{existing.label}」的合盘报告</span>
              <Link href={`/home/dual-star-match/reports/${existing.reportId}`}>查看原报告</Link>
              <button type="button" onClick={() => generate(true)}>重新生成</button>
            </div>
          ) : null}
          <div className="mf-dual-actions">
            <button className="mf-primary-button mf-dual-generate" type="button" disabled={creating} onClick={() => generate(false)}>
              {creating ? "正在创建…" : "生成双星合盘报告"}
            </button>
            <button className="mf-dual-ghost" type="button" onClick={swap}>交换位置</button>
            <button className="mf-dual-ghost" type="button" onClick={() => { setPicking(slotA ? "B" : "A"); }}>更换明星</button>
          </div>
          {error ? <p className="mf-dual-error" role="alert">{error}</p> : null}
        </section>
      ) : (
        <p className="mf-dual-hint">选择两位资料完整的明星后，可以生成合盘报告。</p>
      )}

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
              <input type="search" placeholder="搜索" value={query} onChange={(event) => setQuery(event.target.value)} />
            </label>
            <div className="mf-dual-list">
              {filtered.map((candidate) => {
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

function SlotCard({ slot, label, emptyHint, onPick }: { slot: Slot; label: string; emptyHint: string; onPick: () => void }) {
  return (
    <button className={slot ? "mf-dual-slot is-filled" : "mf-dual-slot"} type="button" onClick={onPick} aria-label={slot ? `更换${label}` : `选择${label}`}>
      {slot ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={slot.portraitSrc} alt={`${slot.name}的人物肖像`} />
          <b>{slot.name}</b>
          <small>{slot.role}</small>
          <small className="mf-dual-full">{slot.hasFullBirth ? "资料完整" : "资料待补充"}</small>
          <span className="mf-dual-change">更换</span>
        </>
      ) : (
        <>
          <i className="mf-dual-slot-avatar" aria-hidden="true">＋</i>
          <b>选择明星</b>
          <small>{label} · {emptyHint}</small>
        </>
      )}
    </button>
  );
}
