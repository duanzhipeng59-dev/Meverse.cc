"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ReportTopbar from "../../../report-topbar";
import DualProfileCards, { type DualProfilePerson } from "../dual-profile-cards";
import LoginModal from "../../../components/login-modal";
import { readLocalSession } from "../../../local-auth";
import { vedicCities } from "../../../myfate-cities";
import { buildDualChart } from "../../../myfate-dual-engine";
import { CONFIRM_STORAGE_KEY, readConfirmPayload, type ConfirmPayload, type ConfirmSubject } from "../confirm-storage";

// 自填/记录解读的确认页(两段式第一步):解读页弹窗点「开始排盘/开始合盘」跳到这里,
// subject 经 sessionStorage 传递(单人一张卡、双人两张卡,同款资料卡样式),客户端实时排盘。
// 进页即落一条「待生成」记录(重复信息去重),中途退出也会保留在生成记录里;
// 点「开始解读/开始分析」把该记录推进为 generating 并后台生成(reading_reports 体系)。
export default function ReadingConfirmPage() {
  const router = useRouter();
  const [payload, setPayload] = useState<ConfirmPayload | null>(null);
  const [ready, setReady] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [loginOpen, setLoginOpen] = useState(false);
  // 全新进入时后台落「待生成」记录;点开始时若还在途就等它(失败则退回完整创建)
  const pendingCreate = useRef<Promise<string | null> | null>(null);

  useEffect(() => {
    const loaded = readConfirmPayload();
    setPayload(loaded);
    setReady(true);
    // 续开(带 reportId)不重复建;落库失败静默——「开始解读」会退回完整创建兜底
    if (loaded && !loaded.reportId) {
      pendingCreate.current = (async () => {
        try {
          const body = loaded.mode === "dual"
            ? { mode: "dual" as const, subjectA: loaded.subjectA, subjectB: loaded.subjectB, pending: true }
            : { mode: "single" as const, subjectA: loaded.subjectA, pending: true };
          const response = await fetch("/api/reading/create", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          });
          const data = await response.json() as { reportId?: string };
          return response.ok && data.reportId ? data.reportId : null;
        } catch {
          return null;
        }
      })();
    }
  }, []);

  // 四柱:与偶像确认页同款资料卡数据(cityId 折算站点城市坐标,引擎排盘);单人一张、双人两张
  const people = useMemo<DualProfilePerson[] | null>(() => {
    if (!payload) return null;
    const toBirth = (subject: ConfirmSubject) => {
      const city = vedicCities.find((item) => item.id === subject.cityId) ?? vedicCities.find((item) => item.id === "seoul")!;
      return {
        starId: `reading-${city.id}`,
        name: subject.name,
        birthDate: subject.birthDate,
        birthTime: subject.birthTime,
        birthPlace: subject.cityName,
        lat: city.lat,
        lon: city.lon,
        tz: city.tz,
        gender: subject.gender,
      };
    };
    const subjects = payload.mode === "dual" ? [payload.subjectA, payload.subjectB!] : [payload.subjectA];
    return subjects.map((subject) => {
      const chart = buildDualChart(toBirth(subject)).chart;
      return {
        name: subject.name,
        dayMaster: chart.dayMaster,
        pillars: chart.pillars.map((pillar) => ({ label: pillar.label, gan: pillar.ganzhi[0] ?? "", zhi: pillar.ganzhi[1] ?? "" })),
      };
    });
  }, [payload]);

  const single = payload?.mode === "single";

  async function begin() {
    if (creating || !payload) return;
    if (!readLocalSession()) {
      setLoginOpen(true);
      return;
    }
    setCreating(true);
    setError("");
    try {
      // 优先推进进页时落的「待生成」记录(在途则等它);没有则退回完整创建
      const pendingId = payload.reportId ?? (await pendingCreate.current);
      const response = pendingId
        ? await fetch("/api/reading/start", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ reportId: pendingId }),
        })
        : await fetch("/api/reading/create", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload.mode === "dual"
            ? { mode: "dual", subjectA: payload.subjectA, subjectB: payload.subjectB }
            : { mode: "single", subjectA: payload.subjectA }),
        });
      const data = await response.json() as { reportId?: string; detail?: string };
      if (!response.ok || !data.reportId) {
        setError(data.detail || "生成请求失败，请重试。");
        setCreating(false);
        return;
      }
      sessionStorage.removeItem(CONFIRM_STORAGE_KEY);
      router.push(`/home/reading/${data.reportId}`);
    } catch {
      setError("网络异常，请重试。");
      setCreating(false);
    }
  }

  if (!ready) return <div className="mf-zr" />;

  if (!payload || !people) {
    // 直开链接/数据已被消费:送回解读页重新选择
    return (
      <div className="mf-zr">
        <ReportTopbar backHref="/home/dual-star-match" backLabel="" title="解读确认" />
        <div className="mf-dual-status mf-dual-confirm">
          <p className="mf-dual-status-note">解读信息已失效，正在返回解读页…</p>
          <button className="mf-primary-button mf-dual-generate" type="button" onClick={() => { router.push("/home/dual-star-match"); }}>返回解读页</button>
        </div>
      </div>
    );
  }

  const title = single ? people[0].name : `${people[0].name} × ${people[1].name}`;

  return (
    <div className="mf-zr">
      <ReportTopbar backHref="/home/dual-star-match" backLabel="" title={title} />

      <div className="mf-dual-status mf-dual-confirm">
        <DualProfileCards people={people} />
        <p className="mf-dual-status-note mf-dual-confirm-hint">{single ? "点击下方按钮，看见你的八字解读。" : "点击下方按钮，看见你们的合盘。"}</p>
        <div className="mf-dual-confirm-cta">
          <button className="mf-primary-button mf-dual-generate" type="button" disabled={creating} onClick={() => void begin()}>
            {creating ? "正在创建…" : single ? "开始解读" : "开始分析"}
          </button>
          {error ? <p className="mf-dual-error" role="alert">{error}</p> : null}
          <LoginModal open={loginOpen} onOpenChange={setLoginOpen} onAuthenticated={() => { setLoginOpen(false); void begin(); }} />
        </div>
      </div>
    </div>
  );
}
