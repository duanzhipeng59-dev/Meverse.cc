"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../auth-context";
import { EMAIL_CODE_LENGTH } from "../auth-code-config";
import { ensureLocalUser, normalizeEmail } from "../local-auth";
import { readBasicProfile, writeBasicProfile } from "../myfate-progressive-profile";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  invalid_email: "请输入有效的邮箱地址",
  code_too_frequent: "发送过于频繁，请稍后再试",
  email_send_failed: "验证码邮件发送失败，请稍后重试",
  email_service_unavailable: "邮箱验证服务暂时不可用",
  email_code_length_mismatch: "验证码服务正在调整，请稍后重试",
  invalid_code: "验证码不正确，请重新输入",
  code_expired: "验证码已过期，请重新获取",
  auth_unavailable: "登录服务暂时不可用",
};

type AuthApiResult = {
  error?: string;
  expiresIn?: number;
  user?: { id: string; email?: string };
};

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
  const [sentEmail, setSentEmail] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [codeCooldown, setCodeCooldown] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [returnHref, setReturnHref] = useState("/");

  useEffect(() => {
    const resetScroll = () => window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    const frame = window.requestAnimationFrame(resetScroll);
    window.addEventListener("pageshow", resetScroll);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pageshow", resetScroll);
    };
  }, []);

  useEffect(() => {
    queueMicrotask(() => setReturnHref(routeParameter("from", "/")));
    if (status === "authenticated") router.replace(destination());
  }, [status, router]);

  useEffect(() => {
    if (codeCooldown <= 0) return;
    const timer = window.setTimeout(
      () => setCodeCooldown((current) => Math.max(0, current - 1)),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [codeCooldown]);

  function authErrorMessage(error?: string) {
    return AUTH_ERROR_MESSAGES[error ?? ""] ?? "请求失败，请稍后重试";
  }

  async function sendCode() {
    const normalized = normalizeEmail(email);
    if (!/^\S+@\S+\.\S+$/.test(normalized)) {
      setError("请输入有效的邮箱地址");
      return;
    }
    if (sendingCode || codeCooldown > 0) return;

    setSendingCode(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/auth/email-code", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: normalized }),
      });
      const result = (await response.json()) as AuthApiResult;
      if (!response.ok) {
        setError(authErrorMessage(result.error));
        return;
      }
      setSentEmail(normalized);
      setCode("");
      setCodeCooldown(60);
      setMessage("验证码已发送，请检查收件箱和垃圾邮件");
    } catch {
      setError(AUTH_ERROR_MESSAGES.email_service_unavailable);
    } finally {
      setSendingCode(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = normalizeEmail(email);

    if (!sentEmail || sentEmail !== normalized) {
      setError("请先获取当前邮箱的验证码");
      return;
    }
    if (code.length !== EMAIL_CODE_LENGTH) {
      setError(`请输入 ${EMAIL_CODE_LENGTH} 位邮箱验证码`);
      return;
    }

    setVerifyingCode(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: normalized, code }),
      });
      const result = (await response.json()) as AuthApiResult;
      if (!response.ok) {
        setError(authErrorMessage(result.error));
        return;
      }

      const authenticatedEmail = normalizeEmail(result.user?.email ?? normalized);
      const user = ensureLocalUser(authenticatedEmail);
      if (user.created) {
        const guestProfile = readBasicProfile(null);
        writeBasicProfile(user.email, guestProfile);
      }
      markAuthenticated(user.email);
      router.replace(destination());
    } catch {
      setError(AUTH_ERROR_MESSAGES.auth_unavailable);
    } finally {
      setVerifyingCode(false);
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
        <div className="mf-login-card-head">
          <div className="mf-login-mark" aria-hidden="true"><span>✦</span></div>
          <Link className="mf-login-back" href={returnHref}>
            <span aria-hidden="true">←</span>
            <span>返回</span>
          </Link>
        </div>
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
                if (sentEmail && normalizeEmail(event.target.value) !== sentEmail) {
                  setSentEmail("");
                  setCode("");
                  setMessage("");
                }
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
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, EMAIL_CODE_LENGTH))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder={`${EMAIL_CODE_LENGTH} 位验证码`}
                maxLength={EMAIL_CODE_LENGTH}
                required
              />
              <button type="button" onClick={sendCode} disabled={sendingCode || codeCooldown > 0}>
                {sendingCode
                  ? "发送中…"
                  : codeCooldown > 0
                    ? `${codeCooldown}s 后重试`
                    : sentEmail === normalizeEmail(email)
                      ? "重新获取"
                      : "获取验证码"}
              </button>
            </div>
          </label>

          <div className="mf-login-feedback" aria-live="polite">
            {error ? <span className="error">{error}</span> : message ? <span>{message}</span> : null}
          </div>

          <button className="mf-login-submit" type="submit" disabled={verifyingCode}>
            {verifyingCode ? "正在验证…" : "登录"}
          </button>
        </form>

        <small>验证码仅用于本次登录，10 分钟内有效，请勿转发给他人。</small>
      </section>
    </main>
  );
}
