"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "../../auth-context";
import { readBasicProfile, writeBasicProfile } from "../../myfate-progressive-profile";

export default function WorkspaceProfile() {
  const { status, email } = useAuth();
  const [nickname, setNickname] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [location, setLocation] = useState("");
  const [ready, setReady] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">("idle");
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (status === "loading") return;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        const profile = readBasicProfile(email);
        setNickname(profile.nickname);
        setBirthDate(profile.birthDate);
        setLocation(profile.location);
        setSaveState("idle");
      } catch {
        setSaveState("error");
      } finally {
        setReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, [status, email]);

  function saveProfile(nextNickname: string, nextBirthDate: string, nextLocation: string) {
    try {
      const { mbti } = readBasicProfile(email);
      writeBasicProfile(email, { nickname: nextNickname, birthDate: nextBirthDate, mbti, location: nextLocation });
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  return (
    <div className="mf-profile-workspace">
      <section className="mf-profile-panel">
        <div className="mf-profile-purpose">
          <span>建议完整填写</span>
          <h2>让每一次关系报告真正属于你</h2>
          <p>你可以在这里保存个人资料；当前关系测试不会读取这些信息。</p>
        </div>
        <div className="mf-profile-form">
          <div className="mf-profile-identity-grid">
            <label className="mf-profile-field">
              <span>昵称</span>
              <input
                type="text"
                value={nickname}
                maxLength={20}
                autoComplete="nickname"
                placeholder="输入你的昵称"
                disabled={!ready}
                onChange={(event) => {
                  const nextNickname = event.target.value;
                  setNickname(nextNickname);
                  saveProfile(nextNickname, birthDate, location);
                }}
              />
            </label>

            <label className="mf-profile-field">
              <span>登录邮箱</span>
              {status === "anonymous" ? (
                <Link className="mf-profile-login-email" href="/login?next=%2Fhome%2Fprofile&from=%2Fhome%2Fprofile">
                  <span>尚未登录</span><strong>登录 <i aria-hidden="true">→</i></strong>
                </Link>
              ) : (
                <div className="mf-profile-readonly">
                  <input
                    type="email"
                    value={status === "loading" ? "正在读取…" : email ?? "尚未登录"}
                    readOnly
                    aria-readonly="true"
                  />
                  <span aria-hidden="true">锁定</span>
                </div>
              )}
            </label>
          </div>

          <div className="mf-profile-editable-grid">
            <label className="mf-profile-field">
              <span className="mf-profile-birth-label-desktop">出生年月日</span>
              <span className="mf-profile-birth-label-mobile">出生日期</span>
              <input
                type="date"
                value={birthDate}
                max={today}
                disabled={!ready}
                onChange={(event) => {
                  const nextBirthDate = event.target.value;
                  setBirthDate(nextBirthDate);
                  saveProfile(nickname, nextBirthDate, location);
                }}
              />
            </label>

            <label className="mf-profile-field">
              <span>地点</span>
              <input
                type="text"
                value={location}
                maxLength={40}
                autoComplete="address-level2"
                placeholder="城市或地区"
                disabled={!ready}
                onChange={(event) => {
                  const nextLocation = event.target.value;
                  setLocation(nextLocation);
                  saveProfile(nickname, birthDate, nextLocation);
                }}
              />
            </label>
          </div>

          <div className="mf-profile-autosave-status" aria-live="polite">
            {saveState === "saved" ? <span className="success">✓ 已自动保存</span> : null}
            {saveState === "error" ? <span className="error">暂时无法保存，请稍后重试</span> : null}
          </div>
        </div>
      </section>

      <p className="mf-profile-storage-note">
        当前资料仅保存在这台设备的浏览器中。
      </p>
    </div>
  );
}
