"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../auth-context";
import { readBasicProfile, writeBasicProfile } from "../../myfate-progressive-profile";

const MBTI_TYPES = [
  "INTJ", "INTP", "ENTJ", "ENTP",
  "INFJ", "INFP", "ENFJ", "ENFP",
  "ISTJ", "ISFJ", "ESTJ", "ESFJ",
  "ISTP", "ISFP", "ESTP", "ESFP",
];

export default function WorkspaceProfile() {
  const { status, email } = useAuth();
  const [nickname, setNickname] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [mbti, setMbti] = useState("");
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
        setMbti(MBTI_TYPES.includes(profile.mbti) ? profile.mbti : "");
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

  function saveProfile(nextNickname: string, nextBirthDate: string, nextMbti: string) {
    try {
      writeBasicProfile(email, { nickname: nextNickname, birthDate: nextBirthDate, mbti: nextMbti });
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
          <h2>让每一次缘分报告真正属于你</h2>
          <p>出生日期与 MBTI 填写一次即可，之后测试不同对象时会自动复用。</p>
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
                  saveProfile(nextNickname, birthDate, mbti);
                }}
              />
            </label>

            <label className="mf-profile-field">
              <span>登录邮箱</span>
              <div className="mf-profile-readonly">
                <input
                  type="email"
                  value={status === "loading" ? "正在读取…" : email ?? "尚未登录"}
                  readOnly
                  aria-readonly="true"
                />
                <span aria-hidden="true">锁定</span>
              </div>
            </label>
          </div>

          <div className="mf-profile-editable-grid">
            <label className="mf-profile-field">
              <span>出生年月日</span>
              <input
                type="date"
                value={birthDate}
                max={today}
                disabled={!ready}
                onChange={(event) => {
                  const nextBirthDate = event.target.value;
                  setBirthDate(nextBirthDate);
                  saveProfile(nickname, nextBirthDate, mbti);
                }}
              />
            </label>

            <label className="mf-profile-field">
              <span>MBTI</span>
              <select
                value={mbti}
                disabled={!ready}
                onChange={(event) => {
                  const nextMbti = event.target.value;
                  setMbti(nextMbti);
                  saveProfile(nickname, birthDate, nextMbti);
                }}
              >
                <option value="">请选择你的 MBTI</option>
                {MBTI_TYPES.map((type) => <option value={type} key={type}>{type}</option>)}
              </select>
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
