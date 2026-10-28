"use client";

// 出生信息字段组与校验(「开始解读」单人弹窗 / 「新建合盘」双人卡片共用一套):
// - BirthInfoFields:受控字段组件(姓名可选/历法/年月日/时分/性别/真太阳时/出生地三级联动);
// - buildBirthSubject:纯校验+折算,输出 /api/reading/create 的 subject 契约;
// - StartReadingForm:单人弹窗 = BirthInfoFields + 提交按钮。
// 农历用 lunar-javascript 转公历后提交(闰月为负数月,回转校验杜绝不存在的日期);
// 关闭真太阳时校准时,按引擎同一公式(经度差+均时差)预扣除校正量,使排盘结果等价于"不校正";
// 契约时间到分钟、引擎校正到毫秒,存在 ≤1 分钟取整残差(时辰粒度排盘不受影响),公式只引用不修改。
import { useMemo, useState, type FormEvent } from "react";
import { Solar, Lunar } from "lunar-javascript";
import { vedicCities } from "../../myfate-cities";
import { regionProvinces } from "../../myfate-china-regions";
import { equationOfTimeMinutes } from "../../myfate-bazi-engine";

export type StartSubject = { name: string; gender: "male" | "female"; birthDate: string; birthTime: string; cityId: string; cityName: string };
export type BirthFieldErrors = { date?: string; region?: string };

export type BirthState = {
  name: string;
  calendar: "solar" | "lunar";
  parts: { y: number; m: number; d: number }; // lunar 时 m 可为负(闰月)
  hour: number;
  minute: number;
  gender: "female" | "male";
  solarOn: boolean;
  province: string;
  cityId: string;
  cityName: string;
  district: string;
};

export const emptyBirthState = (): BirthState => ({
  name: "",
  calendar: "solar",
  parts: { y: 1995, m: 1, d: 1 },
  hour: 12,
  minute: 0,
  gender: "female",
  solarOn: true,
  province: "",
  cityId: "",
  cityName: "",
  district: "",
});

const YEAR_MIN = 1901;
const YEAR_MAX = 2026;
const MONTH_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const pad = (value: number) => String(value).padStart(2, "0");

// 农历日期有效性 = 构造后转公历再转回,三轮相等(lunar-javascript 对不存在的闰月/越界日期抛异常或归一化,都判无效)
function isValidLunar(y: number, m: number, d: number): boolean {
  try {
    const round = Lunar.fromYmd(y, m, d).getSolar().getLunar();
    return round.getYear() === y && round.getMonth() === m && round.getDay() === d;
  } catch {
    return false;
  }
}

// 某农历年是否有闰月:逐月探测(仅表单渲染时算,一年最多 12 次回转)
function leapMonthOf(y: number): number {
  for (let m = 1; m <= 12; m += 1) if (isValidLunar(y, -m, 1)) return m;
  return 0;
}

// 农历某月天数:从 30 往下探测
function lunarMonthDays(y: number, m: number): number {
  for (let d = 30; d >= 29; d -= 1) if (isValidLunar(y, m, d)) return d;
  return 29;
}

// 校验+折算:通过返回 subject,失败返回字段级错误(不 throw,供单人/双人同一逻辑)
export function buildBirthSubject(state: BirthState, fallbackName = "本人"): { subject: StartSubject | null; errors: BirthFieldErrors } {
  let solar: { y: number; m: number; d: number };
  if (state.calendar === "solar") {
    const probe = new Date(state.parts.y, state.parts.m - 1, state.parts.d);
    if (probe.getFullYear() !== state.parts.y || probe.getMonth() !== state.parts.m - 1 || probe.getDate() !== state.parts.d) {
      return { subject: null, errors: { date: "出生日期不存在，请重新选择" } };
    }
    solar = { y: state.parts.y, m: state.parts.m, d: state.parts.d };
  } else if (!isValidLunar(state.parts.y, state.parts.m, state.parts.d)) {
    return { subject: null, errors: { date: "农历日期不存在，请重新选择" } };
  } else {
    const converted = Lunar.fromYmd(state.parts.y, state.parts.m, state.parts.d).getSolar();
    solar = { y: converted.getYear(), m: converted.getMonth(), d: converted.getDay() };
  }
  if (state.solarOn && (!state.province || !state.cityId || !state.district)) {
    return { subject: null, errors: { region: "开启真太阳时校准需要选择出生地（省/市/区/县）" } };
  }
  // 未选出生地(仅关闭校准时允许)默认北京;关闭时按引擎同一公式预扣除校正量
  const effective = vedicCities.find((item) => item.id === state.cityId) ?? vedicCities.find((item) => item.id === "beijing")!;
  let y = solar.y;
  let m = solar.m;
  let d = solar.d;
  let minutes = state.hour * 60 + state.minute;
  if (!state.solarOn) {
    const correction = Math.round((effective.lon - 120) * 4 + equationOfTimeMinutes(new Date(Date.UTC(y, m - 1, d))));
    minutes -= correction;
    while (minutes < 0) { minutes += 1440; const prev = new Date(Date.UTC(y, m - 1, d - 1)); y = prev.getUTCFullYear(); m = prev.getUTCMonth() + 1; d = prev.getUTCDate(); }
    while (minutes >= 1440) { minutes -= 1440; const next = new Date(Date.UTC(y, m - 1, d + 1)); y = next.getUTCFullYear(); m = next.getUTCMonth() + 1; d = next.getUTCDate(); }
  }
  return {
    subject: {
      name: state.name.trim() || fallbackName,
      gender: state.gender,
      birthDate: `${y}-${pad(m)}-${pad(d)}`,
      birthTime: `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`,
      cityId: effective.id,
      // cityId 是真太阳时锚点(非省会城市共用省会),显示名用用户实际选择的城市
      cityName: state.cityName || effective.name,
    },
    errors: {},
  };
}

// 出生信息字段组(受控):单人弹窗与双人卡片共用,视觉/校验/历法/真太阳时逻辑完全一致
export function BirthInfoFields({ state, onChange, errors = {} }: {
  state: BirthState;
  onChange: (next: BirthState) => void;
  errors?: BirthFieldErrors;
}) {
  const { parts } = state;

  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = YEAR_MAX; y >= YEAR_MIN; y -= 1) list.push(y);
    return list;
  }, []);

  // 月选项:公历 1-12;农历为该年月序,闰月(负数)插在同名正月之后
  const months = useMemo(() => {
    if (state.calendar === "solar") return MONTH_NUMBERS;
    const leap = leapMonthOf(parts.y);
    return leap ? [...MONTH_NUMBERS.slice(0, leap), -leap, ...MONTH_NUMBERS.slice(leap)] : MONTH_NUMBERS;
  }, [state.calendar, parts.y]);

  // 日选项天数:公历用 Date 构造器(自动处理大小月/闰年),农历探测月天数
  const dayCount = useMemo(() => {
    if (state.calendar === "solar") return new Date(parts.y, parts.m, 0).getDate();
    return lunarMonthDays(parts.y, parts.m);
  }, [state.calendar, parts.y, parts.m]);

  // 当前历法下某年某月的天数
  const daysOf = (y: number, m: number) => (state.calendar === "solar" ? new Date(y, m, 0).getDate() : lunarMonthDays(y, m));

  const city = useMemo(() => vedicCities.find((item) => item.id === state.cityId) ?? null, [state.cityId]);
  const provinceCities = useMemo(() => regionProvinces.find((item) => item.name === state.province)?.cities ?? [], [state.province]);
  // 城市按 cityId+城市名 双条件定位:非省会城市的 cityId 与省会锚点相同(真太阳时按省会折算),
  // 只按 cityId 匹配会命中省会的区县列表
  const districts = useMemo(() => provinceCities.find((item) => item.cityId === state.cityId && item.name === state.cityName)?.districts ?? [], [provinceCities, state.cityId, state.cityName]);

  // 历法切换:把当前日期换算成另一历法的同一时刻,其余字段不动
  function switchCalendar(next: "solar" | "lunar") {
    if (next === state.calendar) return;
    if (next === "lunar") {
      const lunar = Solar.fromYmd(parts.y, parts.m, parts.d).getLunar();
      onChange({ ...state, calendar: next, parts: { y: lunar.getYear(), m: lunar.getMonth(), d: lunar.getDay() } });
    } else {
      const solar = Lunar.fromYmd(parts.y, parts.m, parts.d).getSolar();
      onChange({ ...state, calendar: next, parts: { y: solar.getYear(), m: solar.getMonth(), d: solar.getDay() } });
    }
  }

  function setYear(y: number) {
    let m = parts.m;
    // 农历:新年份没有当前闰月(如闰四月)时退回同名普通月
    if (state.calendar === "lunar" && m < 0 && leapMonthOf(y) !== -m) m = -m;
    onChange({ ...state, parts: { y, m, d: Math.min(parts.d, daysOf(y, m)) } });
  }
  function setMonth(m: number) {
    onChange({ ...state, parts: { ...parts, m, d: Math.min(parts.d, daysOf(parts.y, m)) } });
  }
  function setDay(d: number) {
    onChange({ ...state, parts: { ...parts, d } });
  }

  const monthLabel = (m: number) => (m < 0 ? `闰${-m}月` : `${m}月`);

// 农历日名:初一~初十、十一~十九、二十、廿一~廿九、三十(值仍是数字日,仅展示名变化)
const LUNAR_DAY_ONES = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
function lunarDayLabel(day: number) {
  if (day <= 10) return `初${LUNAR_DAY_ONES[day - 1]}`;
  if (day < 20) return `十${LUNAR_DAY_ONES[day - 11]}`;
  if (day === 20) return "二十";
  if (day < 30) return `廿${LUNAR_DAY_ONES[day - 21]}`;
  return "三十";
}
  const regionHint = !state.solarOn
    ? "已关闭校准，将按标准时间排盘"
    : city
      ? `经度 ${city.lon.toFixed(2)}°，将校正真太阳时`
      : "选择出生地后，按当地经度校正真太阳时";

  return (
    <div className="mf-start-form">
      <label className="mf-start-field">
        <span className="mf-start-label">姓名（可选）</span>
        <input className="mf-start-input" value={state.name} maxLength={20} placeholder="如：张三" onChange={(e) => onChange({ ...state, name: e.target.value })} />
      </label>

      <div className="mf-start-field">
        <span className="mf-start-label">历法</span>
        <div className="mf-start-seg">
          <button type="button" className={state.calendar === "solar" ? "is-on" : ""} onClick={() => switchCalendar("solar")}>公历</button>
          <button type="button" className={state.calendar === "lunar" ? "is-on" : ""} onClick={() => switchCalendar("lunar")}>农历</button>
        </div>
      </div>

      <div className="mf-start-field">
        <span className="mf-start-label">出生日期</span>
        <div className="mf-start-row">
          <select className="mf-start-select" value={parts.y} onChange={(e) => setYear(Number(e.target.value))} aria-label="出生年份">
            {years.map((y) => (<option key={y} value={y}>{y}年</option>))}
          </select>
          <select className="mf-start-select" value={parts.m} onChange={(e) => setMonth(Number(e.target.value))} aria-label="出生月份">
            {months.map((m) => (<option key={m} value={m}>{monthLabel(m)}</option>))}
          </select>
          <select className="mf-start-select" value={parts.d} onChange={(e) => setDay(Number(e.target.value))} aria-label="出生日期">
            {Array.from({ length: dayCount }, (_, index) => index + 1).map((d) => (<option key={d} value={d}>{state.calendar === "lunar" ? lunarDayLabel(d) : `${d}日`}</option>))}
          </select>
        </div>
        {errors.date ? <small className="mf-start-error">{errors.date}</small> : null}
      </div>

      <div className="mf-start-field">
        <span className="mf-start-label">出生时间</span>
        <div className="mf-start-row is-two">
          <select className="mf-start-select" value={state.hour} onChange={(e) => onChange({ ...state, hour: Number(e.target.value) })} aria-label="出生小时">
            {Array.from({ length: 24 }, (_, index) => index).map((h) => (<option key={h} value={h}>{h}点</option>))}
          </select>
          <select className="mf-start-select" value={state.minute} onChange={(e) => onChange({ ...state, minute: Number(e.target.value) })} aria-label="出生分钟">
            {Array.from({ length: 60 }, (_, index) => index).map((mi) => (<option key={mi} value={mi}>{mi}分</option>))}
          </select>
        </div>
      </div>

      <div className="mf-start-field">
        <span className="mf-start-label">性别</span>
        <div className="mf-start-seg">
          <button type="button" className={state.gender === "female" ? "is-on" : ""} onClick={() => onChange({ ...state, gender: "female" })}>女</button>
          <button type="button" className={state.gender === "male" ? "is-on" : ""} onClick={() => onChange({ ...state, gender: "male" })}>男</button>
        </div>
      </div>

      <div className="mf-start-solar-card">
        <div className="mf-start-solar-copy">
          <b>真太阳时校准</b>
          <small>为了准确性，强烈建议开启此开关。</small>
        </div>
        <button type="button" role="switch" aria-checked={state.solarOn} aria-label="真太阳时校准" className={`mf-start-toggle${state.solarOn ? " is-on" : ""}`} onClick={() => onChange({ ...state, solarOn: !state.solarOn })}>
          <i aria-hidden="true" />
        </button>
      </div>

      <div className="mf-start-field">
        <span className="mf-start-label">出生地（精确到区/县，用于真太阳时校正）</span>
        <div className="mf-start-row">
          <select className="mf-start-select" value={state.province} onChange={(e) => onChange({ ...state, province: e.target.value, cityId: "", cityName: "", district: "" })} aria-label="省份">
            <option value="">省</option>
            {regionProvinces.map((item) => (<option key={item.name} value={item.name}>{item.name}</option>))}
          </select>
          <select className="mf-start-select" value={state.cityId ? `${state.cityId}|${state.cityName}` : ""} disabled={!state.province} onChange={(e) => {
            // 省内非省会城市共用省会锚点 cityId(真太阳时折算),value 用「锚点|城市名」保证唯一,
            // 否则选了地级市后 select 会回显到第一个同 value 的省会城市
            const [anchorId, cityName] = e.target.value.split("|");
            onChange({ ...state, cityId: anchorId, cityName: cityName ?? "", district: "" });
          }} aria-label="城市">
            <option value="">市</option>
            {provinceCities.map((item) => (<option key={`${item.cityId}-${item.name}`} value={`${item.cityId}|${item.name}`}>{item.name}</option>))}
          </select>
          <select className="mf-start-select" value={state.district} disabled={!state.cityId} onChange={(e) => onChange({ ...state, district: e.target.value })} aria-label="区县">
            <option value="">区/县</option>
            {districts.map((item) => (<option key={item} value={item}>{item}</option>))}
          </select>
        </div>
        {errors.region ? <small className="mf-start-error">{errors.region}</small> : <small className="mf-start-hint">{regionHint}</small>}
      </div>
    </div>
  );
}

// 单人「开始解读」弹窗表单:字段组 + 提交按钮
export default function StartReadingForm({ creating, apiError, onSubmit }: {
  creating: boolean;
  apiError: string;
  onSubmit: (subject: StartSubject) => void;
}) {
  const [state, setState] = useState<BirthState>(emptyBirthState);
  const [errors, setErrors] = useState<BirthFieldErrors>({});

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creating) return;
    const built = buildBirthSubject(state);
    if (!built.subject) {
      setErrors(built.errors);
      return;
    }
    setErrors({});
    onSubmit(built.subject);
  }

  return (
    <form onSubmit={submit} noValidate>
      <BirthInfoFields state={state} onChange={setState} errors={errors} />
      {apiError ? <p className="mf-reading-dialog-error" role="alert">{apiError}</p> : null}
      <button className="mf-login-submit mf-start-submit" type="submit" disabled={creating}>
        {creating ? "正在排盘…" : "开始排盘"}
      </button>
    </form>
  );
}
