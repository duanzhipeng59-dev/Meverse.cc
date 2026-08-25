"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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
  const [draftBirthYear, setDraftBirthYear] = useState("");
  const [draftBirthMonth, setDraftBirthMonth] = useState("");
  const [draftBirthDay, setDraftBirthDay] = useState("");
  const [mbti, setMbti] = useState("");
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState(false);
  const birthPickerRef = useRef<HTMLDialogElement>(null);
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const currentYear = today.getFullYear();
  const years = Array.from({ length: 100 }, (_, index) => String(currentYear - index));
  const pickerMaxMonth = draftBirthYear === String(currentYear) ? today.getMonth() + 1 : 12;
  const pickerMonths = Array.from({ length: pickerMaxMonth }, (_, index) => String(index + 1).padStart(2, "0"));
  const pickerYear = Number(draftBirthYear || currentYear);
  const pickerMonth = Number(draftBirthMonth || 1);
  const pickerMonthDayCount = new Date(pickerYear, pickerMonth, 0).getDate();
  const pickerMaxDay = draftBirthYear === String(currentYear) && draftBirthMonth === String(today.getMonth() + 1).padStart(2, "0")
    ? today.getDate()
    : pickerMonthDayCount;
  const pickerDays = Array.from({ length: pickerMaxDay }, (_, index) => String(index + 1).padStart(2, "0"));

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

  function openBirthPicker() {
    const fallbackYear = String(currentYear - 25);
    setDraftBirthYear(birthYear || fallbackYear);
    setDraftBirthMonth(birthMonth || "01");
    setDraftBirthDay(birthDay || "01");
    if (!birthPickerRef.current?.open) birthPickerRef.current?.showModal();
  }

  function selectDraftYear(nextYear: string) {
    const nextMonth = nextYear === String(currentYear) && Number(draftBirthMonth) > today.getMonth() + 1
      ? String(today.getMonth() + 1).padStart(2, "0")
      : draftBirthMonth;
    const nextMaxDay = nextYear === String(currentYear) && nextMonth === String(today.getMonth() + 1).padStart(2, "0")
      ? today.getDate()
      : new Date(Number(nextYear), Number(nextMonth), 0).getDate();
    setDraftBirthYear(nextYear);
    setDraftBirthMonth(nextMonth);
    setDraftBirthDay(String(Math.min(Number(draftBirthDay), nextMaxDay)).padStart(2, "0"));
  }

  function selectDraftMonth(nextMonth: string) {
    const nextMaxDay = draftBirthYear === String(currentYear) && nextMonth === String(today.getMonth() + 1).padStart(2, "0")
      ? today.getDate()
      : new Date(Number(draftBirthYear), Number(nextMonth), 0).getDate();
    setDraftBirthMonth(nextMonth);
    setDraftBirthDay(String(Math.min(Number(draftBirthDay), nextMaxDay)).padStart(2, "0"));
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
          <button
            className={birthDate ? "mf-home-birth-trigger" : "mf-home-birth-trigger is-placeholder"}
            type="button"
            disabled={!ready}
            aria-haspopup="dialog"
            onClick={openBirthPicker}
          >
            <span>{birthDate ? birthDate.replaceAll("-", " / ") : "选择出生日期"}</span>
            <i aria-hidden="true">⌄</i>
          </button>
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

      <dialog
        className="mf-birth-picker"
        ref={birthPickerRef}
        aria-label="选择出生日期"
        onCancel={(event) => {
          event.preventDefault();
          birthPickerRef.current?.close();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) birthPickerRef.current?.close();
        }}
      >
        <div className="mf-birth-picker-panel">
          <div className="mf-birth-picker-heading">
            <button type="button" onClick={() => birthPickerRef.current?.close()}>取消</button>
            <strong>选择出生日期</strong>
            <button
              type="button"
              onClick={() => {
                updateBirthParts(draftBirthYear, draftBirthMonth, draftBirthDay);
                birthPickerRef.current?.close();
              }}
            >完成</button>
          </div>
          <div className="mf-birth-picker-wheels">
            <label>
              <span>年</span>
              <select size={5} value={draftBirthYear} onChange={(event) => selectDraftYear(event.target.value)}>
                {years.map((year) => <option value={year} key={year}>{year} 年</option>)}
              </select>
            </label>
            <label>
              <span>月</span>
              <select size={5} value={draftBirthMonth} onChange={(event) => selectDraftMonth(event.target.value)}>
                {pickerMonths.map((month) => <option value={month} key={month}>{Number(month)} 月</option>)}
              </select>
            </label>
            <label>
              <span>日</span>
              <select size={5} value={draftBirthDay} onChange={(event) => setDraftBirthDay(event.target.value)}>
                {pickerDays.map((day) => <option value={day} key={day}>{Number(day)} 日</option>)}
              </select>
            </label>
          </div>
        </div>
      </dialog>
    </section>
  );
}
