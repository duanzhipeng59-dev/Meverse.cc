"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../auth-context";
import LoginModal from "../../components/login-modal";
import { vedicCities } from "../../myfate-cities";
import { buildDualChart } from "../../myfate-dual-engine";
import DualHistoryRow from "./dual-history-row";
import StartReadingForm, { BirthInfoFields, buildBirthSubject, emptyBirthState, type BirthFieldErrors, type BirthState, type StartSubject } from "./start-reading-form";
import { writeConfirmPayload } from "./confirm-storage";
import RouteSkeleton from "../../route-skeleton";

// 解读页枢纽:两张入口卡(单人解读/双人合盘,点击弹窗填写信息) + 自填生成记录。
// pending = 进了排盘页但没点「开始解读」就退出,点记录行可回去续走。
const STATUS_LABELS: Record<string, string> = { ready: "已完成", generating: "生成中", failed: "生成失败", pending: "待生成" };

type SubjectInfo = { name: string; gender: "male" | "female"; birthDate: string; birthTime: string; cityId: string; cityName: string };
type ReadingRow = { id: string; mode: "single" | "dual"; dualType?: "love" | "career"; status: string; subjectA: SubjectInfo; subjectB: SubjectInfo | null; createdAt: string };

type PersonRecord = { key: string; label: string; subject: SubjectInfo };
type RecordsStatus = "loading" | "ready" | "error";
type PersonErrors = BirthFieldErrors & { card?: string };

// 双人弹窗的「本人/对方」组卡:从记录选(含加载/失败/空状态)或手动填写。
// 手动填写显示虚线占位;点击进入弹窗级的单人填写页(左上角返回),返回后占位呈现所选日期。
function DualPersonCard({ label, records, status, source, setSource, pick, setPick, draft, visited, onEdit, errors, onRetry }: {
  label: string;
  records: PersonRecord[];
  status: RecordsStatus;
  source: "record" | "manual";
  setSource: (next: "record" | "manual") => void;
  pick: string;
  setPick: (next: string) => void;
  draft: BirthState;
  visited: boolean;
  onEdit: () => void;
  errors: PersonErrors;
  onRetry: () => void;
}) {
  const hasError = Boolean(errors.card || errors.date || errors.region);
  const summary = visited
    ? `${draft.parts.y}年${draft.parts.m < 0 ? `闰${-draft.parts.m}` : draft.parts.m}月${draft.parts.d}日${draft.calendar === "lunar" ? "（农历）" : ""}`
    : "点击填写出生信息";
  return (
    <section className={`mf-reading-person${hasError ? " has-error" : ""}`}>
      <h3>{label}</h3>
      <div className="mf-reading-source">
        <button type="button" className={source === "manual" ? "is-on" : ""} onClick={() => setSource("manual")}>手动填写</button>
        <button type="button" className={source === "record" ? "is-on" : ""} disabled={status === "ready" && !records.length} onClick={() => setSource("record")}>从记录选</button>
      </div>
      {source === "record" ? (
        status === "loading" ? (
          <div className="mf-reading-record-state">正在加载命盘记录…</div>
        ) : status === "error" ? (
          <div className="mf-reading-record-state">命盘记录加载失败，<button type="button" onClick={onRetry}>重试</button></div>
        ) : records.length === 0 ? (
          <div className="mf-reading-record-state">暂无命盘记录，<button type="button" onClick={() => { setSource("manual"); onEdit(); }}>去手动填写</button></div>
        ) : (
          <select className="mf-reading-record" value={pick} onChange={(e) => setPick(e.target.value)} aria-label={`选择${label}的记录`}>
            {records.map((record) => (<option key={record.key} value={record.key}>{record.label}</option>))}
          </select>
        )
      ) : (
        <button type="button" className="mf-reading-fill-slot" onClick={onEdit}>
          <span>{summary}</span>
          <b aria-hidden="true">{visited ? "修改 →" : "填写 →"}</b>
        </button>
      )}
      {errors.card ? <small className="mf-reading-card-error" role="alert">{errors.card}</small> : null}
    </section>
  );
}

export default function ReadingHub() {
  const router = useRouter();
  const { status: authStatus, email } = useAuth();
  const loggedIn = authStatus === "authenticated" && Boolean(email);
  const [readings, setReadings] = useState<ReadingRow[]>([]);
  const [dialog, setDialog] = useState<"single" | "dual" | null>(null);
  const [manualA, setManualA] = useState<BirthState>(emptyBirthState);
  const [manualB, setManualB] = useState<BirthState>(emptyBirthState);
  const [sourceA, setSourceA] = useState<"record" | "manual">("record");
  const [sourceB, setSourceB] = useState<"record" | "manual">("record");
  const [visitA, setVisitA] = useState(false);
  const [visitB, setVisitB] = useState(false);
  const [personEditing, setPersonEditing] = useState<"a" | "b" | null>(null);
  const [pickA, setPickA] = useState("");
  const [pickB, setPickB] = useState("");
  const [recordsStatus, setRecordsStatus] = useState<RecordsStatus>("loading");
  const [personRecords, setPersonRecords] = useState<PersonRecord[]>([]);
  // 生成记录首拉完成标记:未完成前用骨架占位,避免先闪「还没有解读记录」再弹列表
  const [readingsLoaded, setReadingsLoaded] = useState(false);
  // 支付回跳提示:带 ?paid= 进入(收银台 return 路由跳来)时显示成功横幅,6 秒后自动消失并清掉参数
  const [paidNotice, setPaidNotice] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paid = params.get("paid");
    if (!paid) return;
    // 同一笔订单只提示一次:Next 客户端路由/浏览器返回可能带着旧 URL 复活,横幅只弹首次
    params.delete("paid");
    const query = params.toString();
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
    if (sessionStorage.getItem("mf_paid_notice") === paid) return;
    sessionStorage.setItem("mf_paid_notice", paid);
    const raf = requestAnimationFrame(() => setPaidNotice(true));
    const timer = window.setTimeout(() => setPaidNotice(false), 6000);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, []);
  // 后改动性别的一侧(默认"对方"):同性别冲突的提示只挂在这一侧
  const [lastGenderSide, setLastGenderSide] = useState<"a" | "b">("b");
  const [personErrors, setPersonErrors] = useState<{ a: PersonErrors; b: PersonErrors }>({ a: {}, b: {} });
  const [error, setError] = useState("");
  const [loginOpen, setLoginOpen] = useState(false);
  // 跳转确认页的瞬间以整屏骨架接管,不等新页 RSC 加载完成才切换
  const [entering, setEntering] = useState(false);
  const pendingDialog = useRef<null | "single" | "dual">(null);

  // 弹窗打开期间锁定背景滚动;Esc 分层退出(编辑页先返回,再关弹窗;登录弹窗让给它处理)
  useEffect(() => {
    if (!dialog) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (personEditing) setPersonEditing(null);
      else setDialog(null);
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [dialog, personEditing]);

  // 任一侧输入变动即清空上次的错误提示:错误只反映「点击开始那一刻」的校验状态,
  // 换性别/换记录/改填写后旧提示残留会误导用户
  useEffect(() => {
    setPersonErrors({ a: {}, b: {} });
  }, [sourceA, pickA, manualA, sourceB, pickB, manualB]);

  // 命盘记录拉取:双人弹窗「从记录选」的数据源(用户自填 subject + 已有报告的明星),带加载/失败态
  function loadRecords() {
    setRecordsStatus("loading");
    fetch("/api/reading/records")
      .then((res) => (res.ok ? res.json() as Promise<{ records?: PersonRecord[] }> : Promise.reject(new Error(String(res.status)))))
      .then((data) => { setPersonRecords(data.records ?? []); setRecordsStatus("ready"); })
      .catch(() => { setPersonRecords([]); setRecordsStatus("error"); });
  }

  useEffect(() => {
    // 未登录不展示任何生成记录
    if (!loggedIn) {
      setRecordsStatus("ready");
      setReadingsLoaded(true);
      return;
    }
    // 生成记录列表(自填解读) + 弹窗记录下拉(带状态);购买入口在确认页 402 时自动弹出
    fetch("/api/reading/list")
      .then((res) => (res.ok ? res.json() as Promise<{ reports?: ReadingRow[] }> : Promise.reject(new Error(String(res.status)))))
      .then((data) => setReadings(data.reports ?? []))
      .catch(() => setReadings([]))
      .finally(() => setReadingsLoaded(true));
    loadRecords();
  }, [loggedIn]);

  // 登录态解析中或已登录但列表未拉到:一律骨架,不闪空文案
  const recordsLoading = authStatus === "loading" || (loggedIn && !readingsLoaded);

  const records = useMemo(() => {
    type Item = { key: string; ts: number; node: React.ReactNode };
    const items: Item[] = [];
    // Safari 对超过 3 位毫秒精度的时间串返回 Invalid Date,截断到毫秒保证移动端排序一致
    const timeOf = (iso: string) => new Date(iso.replace(/(\.\d{3})\d+/, "$1").replace(/z$/i, "Z")).getTime() || 0;
    const fmt = (iso: string) => {
      const date = new Date(timeOf(iso) + 8 * 3600_000);
      return `${date.getUTCFullYear()}/${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
    };
    const displaySubjectName = (subject: SubjectInfo): string => {
      const name = subject.name.trim();
      if (name && name !== "本人") return name;
      const [year, month, day] = subject.birthDate.split("-");
      return `${year}年${month}月${day}日`;
    };
    // 单人行的副标题 = 该人四柱干支(引擎按 subject 实时排盘)
    const baziOf = (subject: SubjectInfo): string => {
      const city = vedicCities.find((item) => item.id === subject.cityId) ?? vedicCities.find((item) => item.id === "seoul")!;
      const chart = buildDualChart({
        starId: `reading-${city.id}`,
        name: subject.name,
        birthDate: subject.birthDate,
        birthTime: subject.birthTime,
        birthPlace: subject.cityName,
        lat: city.lat,
        lon: city.lon,
        tz: city.tz,
        gender: subject.gender,
      }).chart;
      return chart.pillars.map((pillar) => pillar.ganzhi).join(" ");
    };

    for (const row of readings) {
      const isDual = row.mode === "dual";
      const title = isDual ? `${displaySubjectName(row.subjectA)} × ${row.subjectB ? displaySubjectName(row.subjectB) : ""}` : displaySubjectName(row.subjectA);
      items.push({
        key: row.id,
        ts: timeOf(row.createdAt),
        node: (
          <DualHistoryRow
            key={row.id}
            id={row.id}
            title={title}
            sub={isDual ? undefined : baziOf(row.subjectA)}
            time={fmt(row.createdAt)}
            statusLabel={STATUS_LABELS[row.status] ?? row.status}
            status={row.status}
            href={`/home/reading/${row.id}`}
            deleteEndpoint="/api/reading/delete"
            onDeleted={(id) => setReadings((current) => current.filter((item) => item.id !== id))}
          />
        ),
      });
    }
    return items.sort((a, b) => b.ts - a.ts).map((item) => item.node);
  }, [readings]);

  // 未登录点击入口:弹登录,成功后自动进入对应填写弹窗
  function openOrLogin(mode: "single" | "dual") {
    if (!loggedIn) {
      pendingDialog.current = mode;
      setLoginOpen(true);
      return;
    }
    openDialog(mode);
  }

  function openDialog(mode: "single" | "dual") {
    setManualA(emptyBirthState());
    setManualB(emptyBirthState());
    setLastGenderSide("b");
    setError("");
    setPersonErrors({ a: {}, b: {} });
    setVisitA(false);
    setVisitB(false);
    setPersonEditing(null);
    // 双人弹窗默认直接进入手动填写；已有记录仍可通过切换按钮选择。
    setSourceA("manual");
    setSourceB("manual");
    setPickA(personRecords[0]?.key ?? "");
    setPickB(personRecords[1]?.key ?? personRecords[0]?.key ?? "");
    setDialog(mode);
  }

  // 单人:与双人同款两段式,先跳确认页展示单人资料卡(待生成记录与登录创建都在确认页)
  function submitSingle(subject: StartSubject) {
    writeConfirmPayload({ mode: "single", subjectA: subject });
    setEntering(true);
    router.push("/home/dual-star-match/confirm");
  }

  // 性别提示(不干预选择):记录"后改动性别的一侧",双方同性别时只在那一侧的卡片下提示;
  // 手动改性别/换记录/切来源都会改变该侧生效性别,均计入"后选择"。start() 提交时仍兜底拦截。
  function updateManualPerson(which: "a" | "b", next: BirthState) {
    const prev = which === "a" ? manualA : manualB;
    if (next.gender !== prev.gender) setLastGenderSide(which);
    (which === "a" ? setManualA : setManualB)(next);
  }

  const genderOf = (source: "record" | "manual", pick: string, draft: BirthState) =>
    source === "record" ? personRecords.find((item) => item.key === pick)?.subject.gender : draft.gender;
  // 侧别已填写:记录方=已选中某条记录,手动方=进过填写页;两侧都填过才允许显示性别提示
  const sideFilled = (source: "record" | "manual", pick: string, visited: boolean) =>
    source === "record" ? personRecords.some((item) => item.key === pick) : visited;
  const showGenderHint = dialog === "dual" && genderOf(sourceA, pickA, manualA) !== undefined
    && genderOf(sourceA, pickA, manualA) === genderOf(sourceB, pickB, manualB)
    && sideFilled(sourceA, pickA, visitA) && sideFilled(sourceB, pickB, visitB);

  async function start() {
    if (dialog !== "dual") return;
    // 记录模式用记录的完整出生信息(按记录 key,不只按姓名);手动模式走与单人弹窗同一套校验折算
    const resolve = (source: "record" | "manual", pick: string, draft: BirthState, visited: boolean): { subject: SubjectInfo | null; errors: PersonErrors } => {
      if (source === "record") {
        const record = personRecords.find((item) => item.key === pick);
        return record
          ? { subject: record.subject, errors: {} }
          : { subject: null, errors: { card: personRecords.length ? "请选择命盘记录" : "暂无命盘记录，请切换为手动填写" } };
      }
      const built = buildBirthSubject(draft);
      if (built.subject) return { subject: built.subject, errors: {} };
      // 尚未进入过填写页时引导点击「填写」;缺的只是出生地时点名地址
      return { subject: null, errors: { ...built.errors, card: !visited ? "请点击「填写」补全出生信息" : built.errors.region ? "请把地址填写完整" : "请把信息填写完整" } };
    };
    const a = resolve(sourceA, pickA, manualA, visitA);
    const b = resolve(sourceB, pickB, manualB, visitB);
    if (!a.subject || !b.subject) {
      setPersonErrors({ a: a.errors, b: b.errors });
      // 滚动到第一张出错的卡片(弹窗内部滚动,不清空已填数据)
      requestAnimationFrame(() => {
        document.querySelector(".mf-reading-person.has-error")?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      return;
    }
    // 记录模式下两边必须是不同的人，避免生成没有比较意义的自合盘。
    if (sourceA === "record" && sourceB === "record" && pickA === pickB) {
      const duplicateMessage = "本人和对方不能选择同一条命盘记录";
      setPersonErrors({ a: { card: duplicateMessage }, b: { card: duplicateMessage } });
      requestAnimationFrame(() => {
        document.querySelector(".mf-reading-person.has-error")?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      return;
    }
    // 合盘约束:双方必须一男一女(记录/手动两种来源都按解析后的性别校验)。
    // 同性别不写持久错误——卡片提示由派生的 showGenderHint 呈现(挂在后改动性别的一侧),
    // 任一侧性别改成不同后提示即时消失;持久写入会让提示在改动后残留。
    if (a.subject.gender === b.subject.gender) {
      requestAnimationFrame(() => {
        document.querySelector(".mf-reading-person")?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      return;
    }
    setPersonErrors({ a: {}, b: {} });
    // 两段式:先跳确认页展示双方八字资料卡(待生成记录与登录创建都在确认页的「开始分析」)
    writeConfirmPayload({ mode: "dual", subjectA: a.subject, subjectB: b.subject });
    setEntering(true);
    router.push("/home/dual-star-match/confirm");
  }

  return (
    <>
      <RouteSkeleton active={entering} />
      {paidNotice ? <div className="mf-reading-paid-banner" role="status">✓ 支付成功，次数已到账</div> : null}
      <div className="mf-reading-cards">
        <button type="button" className="mf-reading-card is-single" onClick={() => openOrLogin("single")}>
          <i className="mf-reading-card-mark" aria-hidden="true">✦</i>
          <span className="mf-reading-card-copy"><b>单人解读</b><small>看一个人的性格、事业、财运、感情</small></span>
          <span className="mf-reading-card-arrow" aria-hidden="true">›</span>
        </button>
        <button type="button" className="mf-reading-card is-dual" onClick={() => openOrLogin("dual")}>
          <i className="mf-reading-card-mark" aria-hidden="true">✦✦</i>
          <span className="mf-reading-card-copy"><b>双人合盘</b><small>看两个人合不合 · 感情 / 事业</small></span>
          <span className="mf-reading-card-arrow" aria-hidden="true">›</span>
        </button>
      </div>

      <section className="mf-reading-records" aria-label="生成记录">
        <h2>生成记录</h2>
        {recordsLoading ? (
          <div className="mf-reading-record-skel" aria-hidden="true">
            {[0, 1, 2].map((index) => (
              <div className="mf-reading-record-skel-row" key={index}>
                <span className="mf-reading-record-skel-main">
                  <span className="mf-reading-record-skel-line">
                    <span className="mf-skeleton mf-reading-record-skel-title" />
                    <span className="mf-skeleton mf-reading-record-skel-pill" />
                  </span>
                  <span className="mf-skeleton mf-reading-record-skel-sub" />
                </span>
                <span className="mf-skeleton mf-reading-record-skel-time" />
              </div>
            ))}
          </div>
        ) : records.length ? <div className="mf-reading-record-list">{records}</div> : <p className="mf-reading-empty">还没有解读记录，从上方开始第一次排盘。</p>}
      </section>

      {dialog ? (
        <div className="mf-login-modal-overlay" role="dialog" aria-modal="true" aria-label={dialog === "dual" ? "双人合盘信息" : "开始解读"}>
          <div className="mf-login-modal-mask" aria-hidden="true" onClick={() => setDialog(null)} />
          <section className="mf-login-card mf-login-modal-card mf-reading-dialog">
            {dialog === "dual" ? (
              personEditing ? (
                <>
                  <div className="mf-reading-dialog-head is-edit">
                    <button type="button" className="mf-reading-back" aria-label="返回合盘" onClick={() => setPersonEditing(null)}><span aria-hidden="true">←</span></button>
                    <h1>{personEditing === "a" ? "本人信息" : "对方信息"}</h1>
                  </div>
                  <BirthInfoFields
                    state={personEditing === "a" ? manualA : manualB}
                    onChange={(next) => updateManualPerson(personEditing === "a" ? "a" : "b", next)}
                    errors={personEditing === "a" ? personErrors.a : personErrors.b}
                  />
                  <button className="mf-login-submit mf-start-submit" type="button" onClick={() => setPersonEditing(null)}>完成</button>
                </>
              ) : (
                <>
                  <div className="mf-reading-dialog-head">
                    <h1>新建合盘</h1>
                    <button type="button" className="mf-reading-close" aria-label="关闭" onClick={() => setDialog(null)}>×</button>
                  </div>
                  <DualPersonCard label="本人" records={personRecords} status={recordsStatus} source={sourceA} setSource={(next) => { setSourceA(next); setLastGenderSide("a"); }} pick={pickA} setPick={(next) => { setPickA(next); setLastGenderSide("a"); }} draft={manualA} visited={visitA} onEdit={() => { setVisitA(true); setPersonEditing("a"); }} errors={showGenderHint && lastGenderSide === "a" ? { ...personErrors.a, card: "双方性别相同，请选择其他性别" } : personErrors.a} onRetry={loadRecords} />
                  <DualPersonCard label="对方" records={personRecords} status={recordsStatus} source={sourceB} setSource={(next) => { setSourceB(next); setLastGenderSide("b"); }} pick={pickB} setPick={(next) => { setPickB(next); setLastGenderSide("b"); }} draft={manualB} visited={visitB} onEdit={() => { setVisitB(true); setPersonEditing("b"); }} errors={showGenderHint && lastGenderSide === "b" ? { ...personErrors.b, card: "双方性别相同，请选择其他性别" } : personErrors.b} onRetry={loadRecords} />
                  {error ? <p className="mf-reading-dialog-error" role="alert">{error}</p> : null}
                  <button className="mf-login-submit mf-start-submit" type="button" onClick={() => void start()}>开始合盘</button>
                </>
              )
            ) : (
              <>
                <div className="mf-reading-dialog-head">
                  <h1>开始解读</h1>
                  <button type="button" className="mf-reading-close" aria-label="关闭" onClick={() => setDialog(null)}>×</button>
                </div>
                <StartReadingForm creating={false} apiError={error} onSubmit={submitSingle} />
              </>
            )}
          </section>
        </div>
      ) : null}
      <LoginModal open={loginOpen} onOpenChange={setLoginOpen} onAuthenticated={() => { setLoginOpen(false); const mode = pendingDialog.current; pendingDialog.current = null; if (mode) openDialog(mode); }} />
    </>
  );
}
