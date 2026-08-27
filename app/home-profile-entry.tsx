"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "./auth-context";
import { readBasicProfile, writeBasicProfile } from "./myfate-progressive-profile";

export default function HomeProfileEntry() {
  const { status, email } = useAuth();
  const [nickname, setNickname] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [location, setLocation] = useState("");
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (status === "loading") return;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setNickname("");
      setBirthDate("");
      setLocation("");
      setSaved(false);
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, [status, email]);

  function save(patch: { nickname?: string; birthDate?: string; location?: string }) {
    const profile = readBasicProfile(email);
    writeBasicProfile(email, { ...profile, ...patch });
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
            placeholder="输入昵称"
            disabled={!ready}
            onChange={(event) => {
              const nextNickname = event.target.value;
              setNickname(nextNickname);
              save({ nickname: nextNickname });
            }}
          />
        </label>

        <label>
          <span>出生日期</span>
          <div className="mf-home-date-input">
            <input
              className={birthDate ? undefined : "is-placeholder"}
              type="date"
              value={birthDate}
              max={today}
              aria-label="出生日期"
              disabled={!ready}
              onChange={(event) => {
                const nextBirthDate = event.target.value;
                setBirthDate(nextBirthDate);
                save({ birthDate: nextBirthDate });
              }}
            />
            {!birthDate ? <span aria-hidden="true">选择出生日期</span> : null}
          </div>
        </label>

        <label>
          <span>地点</span>
          <input
            type="text"
            value={location}
            maxLength={40}
            autoComplete="address-level2"
            placeholder="输入城市或地区"
            disabled={!ready}
            onChange={(event) => {
              const nextLocation = event.target.value;
              setLocation(nextLocation);
              save({ location: nextLocation });
            }}
          />
        </label>
        <Link className="mf-primary-button mf-home-profile-submit" href="/home/celebrity-match">
          <span>选择心动对象</span><b aria-hidden="true">→</b>
        </Link>
      </div>

      {saved ? (
        <div className="mf-home-profile-meta" aria-live="polite">
          <span>✓ 资料已自动保存</span>
        </div>
      ) : null}

    </section>
  );
}
