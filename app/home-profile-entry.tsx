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
  const [mbti, setMbti] = useState("");
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

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
