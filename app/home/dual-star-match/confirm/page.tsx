"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReportTopbar from "../../../report-topbar";
import DualProfileCards, { type DualProfilePerson } from "../dual-profile-cards";
import LoginModal from "../../../components/login-modal";
import RouteSkeleton from "../../../route-skeleton";
import PurchasePanel from "../../../components/purchase-panel";
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
  // 额度不足(402)时弹购买面板,支付成功后自动重试「开始解读」
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  // 解读额度余额:loading 期间用同尺寸占位,避免先闪「开始分析」再切成解锁板块
  const [creditsState, setCreditsState] = useState<"loading" | "known" | "unavailable">("loading");
  const [credits, setCredits] = useState<number | null>(null);

  // silent=true 用于支付到账后的刷新:不回退到整页等待,避免内容闪没
  function refreshCredits(silent = false) {
    if (!silent) setCreditsState("loading");
    fetch("/api/myfate/credits")
      .then((res) => (res.ok ? res.json() as Promise<{ balance?: number }> : Promise.reject(new Error(String(res.status)))))
      .then((data) => {
        if (typeof data?.balance === "number") {
          setCredits(data.balance);
          setCreditsState("known");
        } else {
          setCreditsState("unavailable");
        }
      })
      .catch(() => setCreditsState("unavailable"));
  }

  useEffect(() => {
    // 未登录(401)/查询失败落 unavailable:按有额度渲染,计费判断交给 begin 的 402 兜底
    refreshCredits();
  }, []);
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
  // 已知余额不足:按钮变「查看套餐 · 立即解锁」,点击直达购买面板而非 begin
  const needBuy = creditsState === "known" && credits !== null && credits < 1;
  // 余额未知:占位骨架,防止先闪「开始分析」再换板块
  const creditsLoading = creditsState === "loading";

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
        if (response.status === 402) {
          // 解读额度不足:弹购买面板,支付成功后 onPaid 自动重试 begin
          setPurchaseOpen(true);
          setCreating(false);
          return;
        }
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

  // 资料卡与按钮区一起渲染:余额未定(loading)时整页等待,杜绝"先出八字再补按钮"的两拍感;
  // 等待期间以整屏报告骨架提示加载,不让用户面对白屏
  if (!ready || creditsLoading) {
    return (
      <>
        <RouteSkeleton active />
        <div className="mf-zr" aria-hidden="true" />
      </>
    );
  }

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
        {needBuy ? (
          <div className="mf-confirm-unlock">
            <h2>解锁完整解读</h2>
            <p>购买报告次数后可查看完整内容：性格、事业、财富、感情全维度深度报告，以及 AI 追问。</p>
            <button className="mf-primary-button mf-dual-generate" type="button" onClick={() => router.push("/home/profile/upgrade")}>查看套餐 · 立即解锁</button>
            <Link className="mf-confirm-unlock-demo" href="/home/relationship-test">查看生辰画像示例报告 <span aria-hidden="true">↗</span></Link>
            {error ? <p className="mf-dual-error" role="alert">{error}</p> : null}
          </div>
        ) : (
          <>
            <p className="mf-dual-status-note mf-dual-confirm-hint">{single ? "点击下方按钮，看见你的八字解读。" : "点击下方按钮，看见你们的合盘。"}</p>
            <div className="mf-dual-confirm-cta">
              <button className="mf-primary-button mf-dual-generate" type="button" disabled={creating} onClick={() => void begin()}>
                {creating ? "正在创建…" : payload.retry ? "重新分析" : "开始分析"}
              </button>
              {payload.retry ? <p className="mf-confirm-retry-note">命盘信息已保留，次数已退还，可以重新生成一份报告</p> : null}
              {error ? <p className="mf-dual-error" role="alert">{error}</p> : null}
            </div>
          </>
        )}
        <LoginModal open={loginOpen} onOpenChange={setLoginOpen} onAuthenticated={() => { setLoginOpen(false); void begin(); }} />
        {purchaseOpen ? <PurchasePanel onClose={() => setPurchaseOpen(false)} onPaid={() => { refreshCredits(true); void begin(); }} /> : null}
      </div>
    </div>
  );
}
