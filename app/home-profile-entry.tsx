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

const WHEEL_ITEM_HEIGHT = 48;

function DateWheel({
  label,
  values,
  value,
  suffix,
  onChange,
}: {
  label: string;
  values: string[];
  value: string;
  suffix: string;
  onChange: (value: string) => void;
}) {
  const wheelRef = useRef<HTMLDivElement>(null);
  const scrollFrameRef = useRef<number | null>(null);
  const emittedValueRef = useRef("");

  useEffect(() => {
    if (emittedValueRef.current === value) {
      emittedValueRef.current = "";
      return;
    }
    const index = values.indexOf(value);
    if (index < 0 || !wheelRef.current) return;
    wheelRef.current.scrollTo({ top: index * WHEEL_ITEM_HEIGHT, behavior: "auto" });
  }, [value, values]);

  useEffect(() => () => {
    if (scrollFrameRef.current !== null) window.cancelAnimationFrame(scrollFrameRef.current);
  }, []);

  return (
    <div
      className="mf-date-wheel"
      ref={wheelRef}
      role="listbox"
      aria-label={label}
      tabIndex={0}
      onScroll={(event) => {
        if (scrollFrameRef.current !== null) window.cancelAnimationFrame(scrollFrameRef.current);
        const target = event.currentTarget;
        scrollFrameRef.current = window.requestAnimationFrame(() => {
          const index = Math.max(0, Math.min(values.length - 1, Math.round(target.scrollTop / WHEEL_ITEM_HEIGHT)));
          if (values[index] && values[index] !== value) {
            emittedValueRef.current = values[index];
            onChange(values[index]);
          }
        });
      }}
    >
      {values.map((item) => (
        <button
          type="button"
          role="option"
          aria-selected={item === value}
          className={item === value ? "is-selected" : undefined}
          key={item}
          onClick={() => onChange(item)}
        >
          {Number(item)}{suffix}
        </button>
      ))}
    </div>
  );
}

export default function HomeProfileEntry() {
  const { status, email } = useAuth();
  const [nickname, setNickname] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [mbti, setMbti] = useState("");
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pickerYear, setPickerYear] = useState("");
  const [pickerMonth, setPickerMonth] = useState("");
  const [pickerDay, setPickerDay] = useState("");
  const datePickerRef = useRef<HTMLDialogElement>(null);
  const currentDate = new Date();
  const today = currentDate.toISOString().slice(0, 10);
  const currentYear = currentDate.getFullYear();
  const years = Array.from({ length: 100 }, (_, index) => String(currentYear - 99 + index));
  const maxPickerMonth = pickerYear === String(currentYear) ? currentDate.getMonth() + 1 : 12;
  const months = Array.from({ length: maxPickerMonth }, (_, index) => String(index + 1).padStart(2, "0"));
  const pickerMonthDays = new Date(Number(pickerYear || currentYear), Number(pickerMonth || 1), 0).getDate();
  const maxPickerDay = pickerYear === String(currentYear) && pickerMonth === String(currentDate.getMonth() + 1).padStart(2, "0")
    ? currentDate.getDate()
    : pickerMonthDays;
  const days = Array.from({ length: maxPickerDay }, (_, index) => String(index + 1).padStart(2, "0"));

  useEffect(() => {
    if (status === "loading") return;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      const profile = readBasicProfile(email);
      setNickname(profile.nickname);
      setBirthDate(profile.birthDate);
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

  function openDatePicker() {
    const [year, month, day] = birthDate.split("-");
    setPickerYear(year || String(currentYear - 25));
    setPickerMonth(month || "01");
    setPickerDay(day || "01");
    if (!datePickerRef.current?.open) datePickerRef.current?.showModal();
  }

  function changePickerYear(nextYear: string) {
    const nextMonthNumber = nextYear === String(currentYear)
      ? Math.min(Number(pickerMonth), currentDate.getMonth() + 1)
      : Number(pickerMonth);
    const nextMonth = String(nextMonthNumber || 1).padStart(2, "0");
    const nextMonthDays = new Date(Number(nextYear), nextMonthNumber || 1, 0).getDate();
    const nextMaxDay = nextYear === String(currentYear) && nextMonthNumber === currentDate.getMonth() + 1
      ? currentDate.getDate()
      : nextMonthDays;
    setPickerYear(nextYear);
    setPickerMonth(nextMonth);
    setPickerDay(String(Math.min(Number(pickerDay) || 1, nextMaxDay)).padStart(2, "0"));
  }

  function changePickerMonth(nextMonth: string) {
    const nextMonthDays = new Date(Number(pickerYear), Number(nextMonth), 0).getDate();
    const nextMaxDay = pickerYear === String(currentYear) && Number(nextMonth) === currentDate.getMonth() + 1
      ? currentDate.getDate()
      : nextMonthDays;
    setPickerMonth(nextMonth);
    setPickerDay(String(Math.min(Number(pickerDay) || 1, nextMaxDay)).padStart(2, "0"));
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
            max={today}
            disabled={!ready}
            onChange={(event) => {
              const nextBirthDate = event.target.value;
              setBirthDate(nextBirthDate);
              save(nickname, nextBirthDate, mbti);
            }}
          />
          <button
            className={birthDate ? "mf-home-birth-trigger" : "mf-home-birth-trigger is-placeholder"}
            type="button"
            disabled={!ready}
            aria-haspopup="dialog"
            onClick={openDatePicker}
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
        className="mf-date-picker-dialog"
        ref={datePickerRef}
        aria-label="选择出生日期"
        onCancel={(event) => {
          event.preventDefault();
          datePickerRef.current?.close();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) datePickerRef.current?.close();
        }}
      >
        <div className="mf-date-picker-panel">
          <div className="mf-date-picker-summary" aria-live="polite">
            {pickerYear}年 {Number(pickerMonth)}月 {Number(pickerDay)}日
          </div>
          <div className="mf-date-picker-wheels">
            <DateWheel label="出生年份" values={years} value={pickerYear} suffix="年" onChange={changePickerYear} />
            <DateWheel label="出生月份" values={months} value={pickerMonth} suffix="月" onChange={changePickerMonth} />
            <DateWheel label="出生日期" values={days} value={pickerDay} suffix="日" onChange={setPickerDay} />
          </div>
          <div className="mf-date-picker-actions">
            <button type="button" onClick={() => datePickerRef.current?.close()}>取消</button>
            <button
              type="button"
              aria-label="确认出生日期"
              onClick={() => {
                const nextBirthDate = `${pickerYear}-${pickerMonth}-${pickerDay}`;
                setBirthDate(nextBirthDate);
                save(nickname, nextBirthDate, mbti);
                datePickerRef.current?.close();
              }}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.2 4.2L19.5 6.5" /></svg>
            </button>
          </div>
        </div>
      </dialog>

    </section>
  );
}
