"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "./auth-context";
import { readBasicProfile, writeBasicProfile } from "./myfate-progressive-profile";

const MBTI_TYPES = [
  "INTJ", "INTP", "ENTJ", "ENTP",
  "INFJ", "INFP", "ENFJ", "ENFP",
  "ISTJ", "ISFJ", "ESTJ", "ESFJ",
  "ISTP", "ISFP", "ESTP", "ESFP",
];

export default function HomeProfileEntry() {
  const { status, email } = useAuth();
  const [nickname, setNickname] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [mbti, setMbti] = useState("");
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState(false);
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const currentYear = today.getFullYear();
  const years = Array.from({ length: 100 }, (_, index) => String(currentYear - index));
  const maxMonth = birthYear === String(currentYear) ? today.getMonth() + 1 : 12;
  const months = Array.from({ length: maxMonth }, (_, index) => String(index + 1).padStart(2, "0"));
  const selectedYear = Number(birthYear || currentYear);
  const selectedMonth = Number(birthMonth || 1);
  const monthDayCount = new Date(selectedYear, selectedMonth, 0).getDate();
  const maxDay = birthYear === String(currentYear) && birthMonth === String(today.getMonth() + 1).padStart(2, "0")
    ? today.getDate()
    : monthDayCount;
  const days = Array.from({ length: maxDay }, (_, index) => String(index + 1).padStart(2, "0"));

  useEffect(() => {
    if (status === "loading") return;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      const profile = readBasicProfile(email);
      const [year = "", month = "", day = ""] = profile.birthDate.split("-");
      setNickname(profile.nickname);
      setBirthDate(profile.birthDate);
      setBirthYear(year);
      setBirthMonth(month);
      setBirthDay(day);
      setMbti(MBTI_TYPES.includes(profile.mbti) ? profile.mbti : "");
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, [status, email]);

  function save(nextNickname: string, nextBirthDate: string, nextMbti: string) {
    writeBasicProfile(email, { nickname: nextNickname, birthDate: nextBirthDate, mbti: nextMbti });
    setSaved(true);
  }

  function updateBirthParts(nextYear: string, nextMonth: string, nextDay: string) {
    const availableMonth = nextYear === String(currentYear) && Number(nextMonth) > today.getMonth() + 1 ? "" : nextMonth;
    const availableDayCount = availableMonth
      ? Math.min(
        new Date(Number(nextYear || currentYear), Number(availableMonth), 0).getDate(),
        nextYear === String(currentYear) && availableMonth === String(today.getMonth() + 1).padStart(2, "0") ? today.getDate() : 31,
      )
      : 31;
    const availableDay = Number(nextDay) > availableDayCount ? String(availableDayCount).padStart(2, "0") : nextDay;
    const nextBirthDate = nextYear && availableMonth && availableDay ? `${nextYear}-${availableMonth}-${availableDay}` : "";

    setBirthYear(nextYear);
    setBirthMonth(availableMonth);
    setBirthDay(availableDay);
    setBirthDate(nextBirthDate);
    save(nickname, nextBirthDate, mbti);
  }

  return (
    <section className="mf-home-profile-entry" aria-label="个人测试资料入口">
      <div className="mf-home-profile-fields">
        <label>
          <span>昵称</span>
          <input
            type="text"
            value={nickname}
            maxLength={20}
            autoComplete="nickname"
            placeholder="怎么称呼你"
            disabled={!ready}
            onChange={(event) => {
              const nextNickname = event.target.value;
              setNickname(nextNickname);
              save(nextNickname, birthDate, mbti);
            }}
          />
        </label>

        <label>
          <span>出生日期</span>
          <input
            className="mf-home-birth-desktop"
            type="date"
            value={birthDate}
            max={todayIso}
            disabled={!ready}
            onChange={(event) => {
              const [year = "", month = "", day = ""] = event.target.value.split("-");
              updateBirthParts(year, month, day);
            }}
          />
          <div className="mf-home-birth-selects mf-home-birth-mobile">
            <select
              value={birthYear}
              aria-label="出生年份"
              disabled={!ready}
              onChange={(event) => updateBirthParts(event.target.value, birthMonth, birthDay)}
            >
              <option value="">年</option>
              {years.map((year) => <option value={year} key={year}>{year}</option>)}
            </select>
            <select
              value={birthMonth}
              aria-label="出生月份"
              disabled={!ready || !birthYear}
              onChange={(event) => updateBirthParts(birthYear, event.target.value, birthDay)}
            >
              <option value="">月</option>
              {months.map((month) => <option value={month} key={month}>{month}</option>)}
            </select>
            <select
              value={birthDay}
              aria-label="出生日期"
              disabled={!ready || !birthYear || !birthMonth}
              onChange={(event) => updateBirthParts(birthYear, birthMonth, event.target.value)}
            >
              <option value="">日</option>
              {days.map((day) => <option value={day} key={day}>{day}</option>)}
            </select>
          </div>
        </label>

        <label>
          <span>MBTI</span>
          <select
            value={mbti}
            disabled={!ready}
            onChange={(event) => {
              const nextMbti = event.target.value;
              setMbti(nextMbti);
              save(nickname, birthDate, nextMbti);
            }}
          >
            <option value="">选择类型</option>
            {MBTI_TYPES.map((type) => <option value={type} key={type}>{type}</option>)}
          </select>
        </label>
        <Link className="mf-primary-button mf-home-profile-submit" href="/home/celebrity-match">
          <span>选择心动对象</span><b aria-hidden="true">→</b>
        </Link>
      </div>

      <div className="mf-home-profile-meta" aria-live="polite">
        <span>{saved ? "✓ 资料已自动保存" : "填写一次，后续测试自动复用"}</span>
        <Link href="/home/profile">个人中心 <i aria-hidden="true">→</i></Link>
      </div>
    </section>
  );
}
