"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { DualStarCandidate } from "../../myfate-dual-server";
import { portraitImage } from "../../myfate-image";
import { addPending } from "./dual-pending";

// 双星选择:顶部紧凑"双人关系卡"(头像A—连线—头像B),选完原地确认;面板手机双列网格。
// 两段式第一步:点「合盘」只跳资料确认页(/new),在那里点「开始分析」才登录+创建报告。
// 明星详情页带入的 ?star= 参数在客户端读取(页面壳保持静态)。
const STATE_KEY = "myfate_dual_pick_v1";


type Slot = DualStarCandidate | null;

// 槽位副标题:团体-英文名(无英文名数据时回退原始 role,如 BTS 成员-RM)
function roleEn(star: DualStarCandidate) {
  const group = star.role.split("-")[0];
  return star.nameEn ? `${group}-${star.nameEn}` : star.role;
}

export default function DualStarPicker({ candidates }: { candidates: DualStarCandidate[] }) {
  const starParam = useSearchParams().get("star");
  const [slotA, setSlotA] = useState<Slot>(null);
  const [slotB, setSlotB] = useState<Slot>(null);
  const [picking, setPicking] = useState<"A" | "B" | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (starParam) {
      setSlotA(candidates.find((c) => c.id === starParam) ?? null);
      return;
    }
    try {
      const saved = JSON.parse(sessionStorage.getItem(STATE_KEY) ?? "null") as { a?: string | null; b?: string | null } | null;
      if (saved?.a) setSlotA(candidates.find((c) => c.id === saved.a) ?? null);
      if (saved?.b) setSlotB(candidates.find((c) => c.id === saved.b) ?? null);
    } catch {
      // 忽略
    }
  }, [candidates, starParam]);

  // 点击合盘 Tab 进页时直接展示内容区顶部:路由可能带着上一页的滚动位置做平滑滑动
  // (html 的 scroll-behavior: smooth),挂载与下一帧各瞬时归顶一次,压制可见的滚动动画
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    const frame = requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "instant" }));
    return () => cancelAnimationFrame(frame);
  }, []);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return candidates;
    return candidates.filter((c) => c.name.toLowerCase().includes(keyword) || c.role.toLowerCase().includes(keyword));
  }, [candidates, query]);

  // 无搜索时按组合分节(role 格式「组合-本名」),76 人整墙不好找;组序按候选顺序首次出现
  const grouped = useMemo(() => {
    if (query.trim()) return null;
    const map = new Map<string, DualStarCandidate[]>();
    for (const candidate of candidates) {
      const group = candidate.role.includes("-") ? candidate.role.split("-")[0].trim() : "其他";
      const bucket = map.get(group);
      if (bucket) bucket.push(candidate);
      else map.set(group, [candidate]);
    }
    return [...map.entries()];
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
  }

  function goConfirm() {
    if (!slotA || !slotB) return;
    persist(slotA, slotB);
    // 待生成本地记录:历史合盘区出现「待生成」横条,点「开始分析」后由确认页移除
    addPending({ a: slotA.id, b: slotB.id, nameA: slotA.name, nameB: slotB.name, portraitA: slotA.portraitSrc, portraitB: slotB.portraitSrc });
    window.location.href = `/home/dual-star-match/new/${encodeURIComponent(slotA.id)}/${encodeURIComponent(slotB.id)}`;
  }

  const bothReady = Boolean(slotA && slotB);

  function renderCandidate(candidate: DualStarCandidate) {
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
        <img src={portraitImage(candidate.portraitSrc, 240)} alt={`${candidate.name}的人物肖像`} loading="lazy" />
        <span><b>{candidate.name}</b><small>{candidate.role}</small></span>
        <em>{used ? "已选择" : candidate.hasFullBirth ? "资料完整" : "资料待补充"}</em>
      </button>
    );
  }

  return (
    <div className="mf-dual">
      <header className="mf-dual-head">
        <h1>双人合盘</h1>
        <p>探索两位偶像之间的命理互动</p>
      </header>

      <section className="mf-dual-relation" aria-label="双人关系卡">
        <button className={slotA ? "mf-dual-node is-filled" : "mf-dual-node"} type="button" onClick={() => setPicking("A")} aria-label={slotA ? `更换偶像 A（当前 ${slotA.name}）` : "选择偶像 A"}>
          {slotA ? (<>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={portraitImage(slotA.portraitSrc, 360)} alt={`${slotA.name}的人物肖像`} />
            <b>{slotA.name}</b>
            <small>{roleEn(slotA)}</small>
          </>) : (<>
            <i aria-hidden="true">＋</i>
            <b>选择偶像 A</b>
            <small>点击选择</small>
          </>)}
        </button>
        <div className="mf-dual-link">
          <button type="button" className="mf-dual-swap" aria-label="交换 A 和 B" disabled={!(slotA && slotB)}
            onClick={() => { const next = [slotB, slotA]; setSlotA(next[0]); setSlotB(next[1]); persist(next[0], next[1]); }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><path d="M7 4v13M7 17l-3-3.2M7 17l3-3.2M17 20V7M17 7l-3 3.2M17 7l3 3.2" /></svg>
          </button>
        </div>
        <button className={slotB ? "mf-dual-node is-filled" : "mf-dual-node"} type="button" onClick={() => setPicking("B")} aria-label={slotB ? `更换偶像 B（当前 ${slotB.name}）` : "选择偶像 B"}>
          {slotB ? (<>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={portraitImage(slotB.portraitSrc, 360)} alt={`${slotB.name}的人物肖像`} />
            <b>{slotB.name}</b>
            <small>{roleEn(slotB)}</small>
          </>) : (<>
            <i aria-hidden="true">＋</i>
            <b>选择偶像 B</b>
            <small>点击选择</small>
          </>)}
        </button>
      </section>

      <div className="mf-dual-cta-zone">
        {/* 主操作常驻:未选满禁用,选满高亮;点击进入资料确认页,开始分析在那里 */}
        <div className="mf-dual-actions">
          <button
            className="mf-primary-button mf-dual-generate"
            type="button"
            disabled={!bothReady}
            onClick={goConfirm}
          >
            合盘
          </button>
        </div>

        <div className="mf-dual-guide">
        </div>
      </div>

      {picking ? (
        <div className="mf-dual-panel" role="dialog" aria-modal="true" aria-label="选择偶像">
          <div className="mf-dual-panel-mask" onClick={() => setPicking(null)} />
          <div className="mf-dual-panel-sheet">
            <header>
              <b>选择偶像 {picking === "A" ? "A" : "B"}</b>
              <button type="button" aria-label="关闭选择面板" onClick={() => setPicking(null)}>×</button>
            </header>
            <label className="mf-dual-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.6" /><path d="m16 16 4.5 4.5" /></svg>
              <input type="search" placeholder="搜索" value={query} onChange={(event) => setQuery(event.target.value)} />
            </label>
            <div className={query.trim() ? "mf-dual-list" : "mf-dual-groups"}>
              {grouped ? grouped.map(([group, members]) => (
                <div className="mf-dual-group" key={group}>
                  <h4 className="mf-dual-group-title">{group}</h4>
                  <div className="mf-dual-grid">
                    {members.map((candidate) => renderCandidate(candidate))}
                  </div>
                </div>
              )) : filtered.map((candidate) => renderCandidate(candidate))}
              {!filtered.length ? <p className="mf-dual-empty">没有找到相关偶像</p> : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
