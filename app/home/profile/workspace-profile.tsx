"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "../../auth-context";
import { readBasicProfile, writeBasicProfile, type LocalBasicProfile } from "../../myfate-progressive-profile";

type AreaOption = { code: string; name: string };

export default function WorkspaceProfile() {
  const { status, email, markSignedOut } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<LocalBasicProfile | null>(null);
  const [saved, setSaved] = useState(false);
  const [provinceOptions, setProvinceOptions] = useState<AreaOption[]>([]);
  const [cityOptions, setCityOptions] = useState<AreaOption[]>([]);
  const [districtOptions, setDistrictOptions] = useState<AreaOption[]>([]);

  useEffect(() => {
    if (status !== "authenticated") return;
    setProfile(readBasicProfile(email));
    (async () => {
      const provinces = await fetch("/api/myfate/china-areas").then(r => r.json() as Promise<{ children?: AreaOption[] }>).then(d => d.children ?? []).catch(() => [] as AreaOption[]);
      setProvinceOptions(provinces);
      const p = readBasicProfile(email);
      if (!p.birthProvinceCode || !provinces.some(item => item.code === p.birthProvinceCode)) return;
      const cities = await fetch(`/api/myfate/china-areas?code=${p.birthProvinceCode}`).then(r => r.json() as Promise<{ children?: AreaOption[] }>).then(d => d.children ?? []).catch(() => [] as AreaOption[]);
      setCityOptions(cities);
      if (!p.birthCityCode || !cities.some(item => item.code === p.birthCityCode)) return;
      const districts = await fetch(`/api/myfate/china-areas?code=${p.birthCityCode}`).then(r => r.json() as Promise<{ children?: AreaOption[] }>).then(d => d.children ?? []).catch(() => [] as AreaOption[]);
      setDistrictOptions(districts);
    })();
  }, [status, email]);

  function update(patch: Partial<LocalBasicProfile>) {
    setProfile(prev => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      writeBasicProfile(email, next);
      return next;
    });
    setSaved(true);
  }

  async function chooseProvince(code: string) {
    setCityOptions([]);
    setDistrictOptions([]);
    update({ birthProvinceCode: code, birthCityCode: "", birthDistrictCode: "" });
    if (!code) return;
    const cities = await fetch(`/api/myfate/china-areas?code=${code}`).then(r => r.json() as Promise<{ children?: AreaOption[] }>).then(d => d.children ?? []).catch(() => [] as AreaOption[]);
    setCityOptions(cities);
  }

  async function chooseCity(code: string) {
    setDistrictOptions([]);
    update({ birthCityCode: code, birthDistrictCode: "" });
    if (!code) return;
    const districts = await fetch(`/api/myfate/china-areas?code=${code}`).then(r => r.json() as Promise<{ children?: AreaOption[] }>).then(d => d.children ?? []).catch(() => [] as AreaOption[]);
    setDistrictOptions(districts);
  }

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: currentYear - 1900 + 1 }, (_, index) => String(currentYear - index)).reverse();
  const monthOptions = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0"));
  const [y = "", m = "", d = ""] = (profile?.birthDate ?? "").split("-");
  const daysInMonth = y && m ? new Date(Number(y), Number(m), 0).getDate() : 31;
  const dayOptions = Array.from({ length: daysInMonth }, (_, index) => String(index + 1).padStart(2, "0"));
  const hourOptions = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
  const minuteOptions = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"));
  const [th = "00", tm = "00"] = (profile?.birthTime || "00:00").split(":");

  if (status === "loading") {
    return <div className="mf-bz-profile"><p className="mf-bz-profile-loading">正在读取…</p></div>;
  }

  return (
    <div className="mf-bz-profile">
      <header className="mf-bz-profile-head">
        <h1>个人中心</h1>
        <p>管理你的账号信息</p>
        <span>在这里管理你的资料与账号，信息修改后自动保存。</span>
      </header>

      <section className="mf-bz-account-card">
        <div className="mf-bz-avatar" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3.6" /><path d="M5 19.5c.9-3.6 3.4-5.4 7-5.4s6.1 1.8 7 5.4" /></svg>
        </div>
        <div className="mf-bz-account-details">
          <div>
            <span>昵称</span>
            <input
              type="text"
              value={profile?.nickname ?? ""}
              maxLength={20}
              placeholder="输入你的昵称"
              onChange={(event) => update({ nickname: event.target.value })}
            />
          </div>
          <div>
            <span>邮箱</span>
            <b>{email ?? "尚未登录"}</b>
          </div>
        </div>
        {status === "anonymous" ? (
          <Link className="mf-bz-account-button" href="/login?next=%2Fhome%2Fprofile&from=%2Fhome%2Fprofile">登录</Link>
        ) : (
          <button className="mf-bz-account-button" type="button" onClick={() => { markSignedOut(); router.replace("/"); }}>退出登录</button>
        )}
      </section>

      <section className="mf-bz-birth-card">
        <header className="mf-bz-birth-heading">
          <h2>出生信息</h2>
          <div className="mf-bz-save-status" aria-live="polite">
            {saved ? <><i aria-hidden="true" />已保存</> : null}
          </div>
        </header>

        <div className="mf-bz-birth-row">
          <label className="mf-bz-birth-field">
            <span>出生日期</span>
            <div className="mf-bz-birth-input">
              <svg viewBox="0 0 24 24" fill="none"><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 10h16" /></svg>
              <select value={y} onChange={(event) => {
                const year = event.target.value;
                const dim = year && m ? new Date(Number(year), Number(m), 0).getDate() : 31;
                update({ birthDate: year && m && d ? `${year}-${m}-${String(Math.min(Number(d), dim)).padStart(2, "0")}` : year ? `${year}-${m || "01"}-${d || "01"}` : "" });
              }}>
                <option value="">年</option>
                {yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
              <select value={m} onChange={(event) => {
                const month = event.target.value;
                const dim = y && month ? new Date(Number(y), Number(month), 0).getDate() : 31;
                update({ birthDate: y && month ? `${y}-${month}-${d ? String(Math.min(Number(d), dim)).padStart(2, "0") : "01"}` : "" });
              }} disabled={!y}>
                <option value="">月</option>
                {monthOptions.map((month) => <option key={month} value={month}>{month}</option>)}
              </select>
              <select value={d} onChange={(event) => update({ birthDate: event.target.value ? `${y}-${m}-${event.target.value}` : "" })} disabled={!y || !m}>
                <option value="">日</option>
                {dayOptions.map((day) => <option key={day} value={day}>{day}</option>)}
              </select>
            </div>
          </label>

          <label className="mf-bz-birth-field">
            <span>出生时间</span>
            <div className="mf-bz-birth-input">
              <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.4" /><path d="M12 7.5V12l3 2" /></svg>
              <select value={th} onChange={(event) => update({ birthTime: `${event.target.value}:${tm}` })}>
                {hourOptions.map((hour) => <option key={hour} value={hour}>{hour}</option>)}
              </select>
              <select value={tm} onChange={(event) => update({ birthTime: `${th}:${event.target.value}` })}>
                {minuteOptions.map((minute) => <option key={minute} value={minute}>{minute}</option>)}
              </select>
            </div>
          </label>
        </div>

        <div className="mf-bz-birth-row">
          <label className="mf-bz-birth-field">
            <span>出生省份</span>
            <div className="mf-bz-birth-input">
              <svg viewBox="0 0 24 24" fill="none"><path d="M12 21s-6.5-5.4-6.5-10A6.5 6.5 0 0 1 12 4.5 6.5 6.5 0 0 1 18.5 11c0 4.6-6.5 10-6.5 10Z" /><circle cx="12" cy="11" r="2.2" /></svg>
              <select value={profile?.birthProvinceCode ?? ""} onChange={(event) => void chooseProvince(event.target.value)}>
                <option value="">选择省份</option>
                {provinceOptions.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
              </select>
            </div>
          </label>

          <label className="mf-bz-birth-field">
            <span>城市 / 区县</span>
            <div className="mf-bz-birth-input">
              <svg viewBox="0 0 24 24" fill="none"><path d="M12 21s-6.5-5.4-6.5-10A6.5 6.5 0 0 1 12 4.5 6.5 6.5 0 0 1 18.5 11c0 4.6-6.5 10-6.5 10Z" /><circle cx="12" cy="11" r="2.2" /></svg>
              <select value={profile?.birthCityCode ?? ""} onChange={(event) => void chooseCity(event.target.value)} disabled={!profile?.birthProvinceCode}>
                <option value="">市</option>
                {cityOptions.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
              </select>
              <select value={profile?.birthDistrictCode ?? ""} onChange={(event) => update({ birthDistrictCode: event.target.value })} disabled={!profile?.birthCityCode}>
                <option value="">区/县</option>
                {districtOptions.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
              </select>
            </div>
          </label>
        </div>

        <p className="mf-bz-privacy-note">
          <svg viewBox="0 0 24 24" fill="none"><rect x="5.5" y="10.5" width="13" height="9" rx="2" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></svg>
          我们仅将这些信息用于生成你的明星合盘与个人解读报告，并严格保密。
        </p>
      </section>
    </div>
  );
}
