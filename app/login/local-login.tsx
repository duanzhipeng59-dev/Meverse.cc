"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../auth-context";
import { ensureLocalUser, normalizeEmail } from "../local-auth";
import { readBasicProfile, writeBasicProfile } from "../myfate-progressive-profile";

function routeParameter(name: string, fallback: string, homeOnly = false) {
  const requested = new URLSearchParams(window.location.search).get(name);
  if (!requested || !requested.startsWith("/") || requested.startsWith("//")) return fallback;
  if (homeOnly && !requested.startsWith("/home")) return fallback;
  return requested;
}

function destination() {
  return routeParameter("next", "/home/celebrity-match", true);
}

export default function LocalLogin() {
  const router = useRouter();
  const { status, markAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sentCode, setSentCode] = useState("");
  const [sentEmail, setSentEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [returnHref, setReturnHref] = useState("/");

  useEffect(() => {
    queueMicrotask(() => setReturnHref(routeParameter("from", "/")));
    if (status === "authenticated") router.replace(destination());
  }, [status, router]);

  function sendCode() {
    const normalized = normalizeEmail(email);
    if (!/^\S+@\S+\.\S+$/.test(normalized)) {
      setError("请输入有效的邮箱地址");
      return;
    }

    const nextCode = String(Math.floor(100000 + Math.random() * 900000));
    setSentCode(nextCode);
    setSentEmail(normalized);
    setCode("");
    setError("");
    setMessage(`本地验证码：${nextCode}`);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = normalizeEmail(email);

    if (!sentCode || sentEmail !== normalized) {
      setError("请先获取当前邮箱的验证码");
      return;
    }
    if (code !== sentCode) {
      setError("验证码不正确，请重新输入");
      return;
    }

    try {
      const user = ensureLocalUser(normalized);
      if (user.created) {
        const guestProfile = readBasicProfile(null);
        writeBasicProfile(user.email, guestProfile);
      }
      markAuthenticated(user.email);
      router.replace(destination());
    } catch {
      setError("本地登录信息暂时无法保存");
    }
  }

  if (status === "authenticated") {
    return <main className="mf-login-page"><div className="mf-login-loading">正在进入工作台…</div></main>;
  }

  return (
    <main className="mf-login-page">
      <Link className="mf-login-brand mf-brand" href="/" aria-label="返回 Myfate 首页">
        <span className="mf-brand-mark">M</span>
        <span>Myfate</span>
      </Link>

      <section className="mf-login-card">
        <Link className="mf-login-back" href={returnHref}>← 返回出发页</Link>
        <div className="mf-login-mark" aria-hidden="true"><span>✦</span></div>
        <span className="mf-login-kicker">WELCOME TO MYFATE</span>
        <h1>登录后，继续探索心动</h1>
        <p>使用邮箱验证码登录。首次使用的邮箱会自动创建账号。</p>

        <form className="mf-login-form" onSubmit={submit}>
          <label>
            <span>邮箱</span>
            <input
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError("");
                if (sentEmail && normalizeEmail(event.target.value) !== sentEmail) setMessage("");
              }}
              autoComplete="email"
              placeholder="name@example.com"
              required
            />
          </label>

          <label>
            <span>邮箱验证码</span>
            <div className="mf-login-code-field">
              <input
                type="text"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="6 位验证码"
                maxLength={6}
                required
              />
              <button type="button" onClick={sendCode}>{sentCode && sentEmail === normalizeEmail(email) ? "重新获取" : "获取验证码"}</button>
            </div>
          </label>

          <div className="mf-login-feedback" aria-live="polite">
            {error ? <span className="error">{error}</span> : message ? <span>{message}</span> : null}
          </div>

          <button className="mf-login-submit" type="submit">登录</button>
        </form>

        <small>当前版本的账号与资料仅保存在这台设备的浏览器中。</small>
      </section>
    </main>
  );
}
