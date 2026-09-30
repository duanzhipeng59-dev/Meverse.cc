"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "../../auth-context";
import { readBasicProfile, writeBasicProfile } from "../../myfate-progressive-profile";

export default function WorkspaceProfile() {
  const { status, email, markSignedOut } = useAuth();
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [ready, setReady] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">("idle");
  const [compositeCount, setCompositeCount] = useState<number | null>(null);
  const [readingCount, setReadingCount] = useState<number | null>(null);
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    try {
      setNickname(readBasicProfile(email).nickname);
    } catch { /* defaults */ }
    setReady(true);
    fetch("/api/myfate/reports").then(r => r.json() as Promise<{ reports?: Array<{ starId?: string }> }>).then(data => {
      const rows = data.reports ?? [];
      setCompositeCount(rows.filter(row => row.starId !== "personal-reading" && row.starId !== "relationship-profile").length);
      setReadingCount(rows.filter(row => row.starId === "personal-reading").length);
    }).catch(() => undefined);
    fetch("/api/myfate/credits").then(r => r.json() as Promise<{ balance?: number }>).then(data => {
      if (typeof data.balance === "number") setCredits(data.balance);
    }).catch(() => undefined);
  }, [status, email]);

  function saveNickname(value: string) {
    setNickname(value);
    try {
      const profile = readBasicProfile(email);
      writeBasicProfile(email, { ...profile, nickname: value });
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  return (
    <div className="mf-bz-profile">
      <header className="mf-bz-profile-head">
        <h1>个人中心</h1>
        <p>管理你的账号信息</p>
      </header>
      <div className="mf-bz-profile-grid">
        <div className="mf-bz-profile-main">
          <section className="mf-bz-profile-card">
            <header>
              <span>基本信息</span>
              <h2>你的昵称</h2>
            </header>
            <div className="mf-bz-profile-nick">
              <input
                type="text"
                value={nickname}
                maxLength={20}
                placeholder="输入你的昵称"
                disabled={!ready}
                onChange={(event) => saveNickname(event.target.value)}
              />
              <button className="mf-bz-profile-save" type="button" onClick={() => saveNickname(nickname)}>保存</button>
            </div>
            <p className="mf-bz-profile-note" aria-live="polite">
              {saveState === "saved" ? "✓ 已自动保存" : saveState === "error" ? "暂时无法保存，请稍后重试" : "昵称仅保存在这台设备上，用于报告展示。"}
            </p>
          </section>

          <section className="mf-bz-profile-card">
            <header>
              <span>报告统计</span>
              <h2>你的使用情况</h2>
            </header>
            <div className="mf-bz-profile-stats">
              <div><b>{compositeCount ?? "—"}</b><span>合盘报告</span></div>
              <div><b>{readingCount ?? "—"}</b><span>个人解读</span></div>
              <div><b>{credits ?? "—"}</b><span>剩余额度</span></div>
            </div>
            <Link className="mf-bz-profile-stats-link" href="/home/upgrade">额度用完？前往订阅升级 →</Link>
          </section>
        </div>

        <aside className="mf-bz-profile-side">
          <section className="mf-bz-profile-card">
            <header>
              <span>账号信息</span>
            </header>
            <dl className="mf-bz-profile-account">
              <div><dt>账号邮箱</dt><dd>{status === "authenticated" ? email : status === "loading" ? "正在读取…" : "尚未登录"}</dd></div>
              <div><dt>登录方式</dt><dd>邮箱验证码</dd></div>
            </dl>
            {status === "anonymous" ? (
              <Link className="mf-bz-profile-logout" href="/login?next=%2Fhome%2Fprofile&from=%2Fhome%2Fprofile">登录</Link>
            ) : (
              <button className="mf-bz-profile-logout" type="button" onClick={() => { markSignedOut(); router.replace("/"); }}>退出登录</button>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
