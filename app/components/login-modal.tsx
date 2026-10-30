"use client";

// /home 工作台内的登录入口:不跳转 /login 页,以居中弹窗呈现(登录页同款卡片样式,
// 背后是唤起页的模糊倒影)。登录成功后就地刷新登录态并留当前页;首页营销入口仍走 /login 页面链路。
// 注意:卡片视觉复用登录页 mf-login-card 体系,样式在 home.css 内有一份副本,改版需两处同步。
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { clearSentCodeState, markCodeSent } from "./login-code-store";
import { createPortal } from "react-dom";
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

type AuthApiResult = { error?: string; user?: { id: string; email?: string } };

export default function LoginModal({ className, children, open: openProp, onOpenChange, onAuthenticated }: {
  className?: string;
  children?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onAuthenticated?: () => void;
}) {
  const { markAuthenticated } = useAuth();
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = (next: boolean) => {
    setOpenState(next);
    onOpenChange?.(next);
  };
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sentEmail, setSentEmail] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [codeCooldown, setCodeCooldown] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (codeCooldown <= 0) return;
    const timer = window.setTimeout(() => setCodeCooldown((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [codeCooldown]);

  // 关闭弹窗即回到初始状态(邮箱输入第一步):重复发码由服务端全局原子锁兜底,
  // 再点发送会收到 alreadySent 提示与剩余倒计时,不会重复发信
  useEffect(() => {
    if (open) { setError(""); setMessage(""); return; }
    setSentEmail("");
    setCode("");
    setCodeCooldown(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function authErrorMessage(code?: string) {
    return AUTH_ERROR_MESSAGES[code ?? ""] ?? "请求失败，请稍后重试";
  }

  async function sendCode() {
    const normalized = normalizeEmail(email);
    if (!/^\S+@\S+\.\S+$/.test(normalized)) {
      setError("请输入有效的邮箱地址");
      return;
    }
    if (sendingCode || codeCooldown > 0) return;
    // 点击瞬间即锁定(禁用+倒计时+持久化),不等接口返回;失败再回滚
    setSendingCode(true);
    setCodeCooldown(60);
    markCodeSent(normalized);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/auth/email-code", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: normalized }),
      });
      const result = (await response.json()) as AuthApiResult & { alreadySent?: boolean; retryAfter?: number };
      if (!response.ok) {
        setCodeCooldown(0);
        clearSentCodeState();
        setError(authErrorMessage(result.error));
        return;
      }
      setSentEmail(normalized);
      setCode("");
      if (result.alreadySent) {
        // 全局锁判定:验证码刚才已发出,展示剩余倒计时,不误报为失败
        const retryAfter = Math.min(Math.max(result.retryAfter ?? 60, 1), 60);
        setCodeCooldown(retryAfter);
        markCodeSent(normalized, retryAfter);
        setMessage(`验证码已发送，请查看邮箱，${retryAfter} 秒后可重新获取`);
      } else {
        setCodeCooldown(result.retryAfter ?? 60);
        markCodeSent(normalized, result.retryAfter ?? 60);
        setMessage("验证码已发送，请检查收件箱和垃圾邮件");
      }
    } catch {
      setCodeCooldown(0);
      clearSentCodeState();
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
      clearSentCodeState();
      setOpen(false);
      onAuthenticated?.();
    } catch {
      setError(AUTH_ERROR_MESSAGES.auth_unavailable);
    } finally {
      setVerifyingCode(false);
    }
  }

  return (
    <>
      {children !== undefined ? (
        <button type="button" className={className} onClick={() => setOpen(true)}>{children}</button>
      ) : null}
      {open && typeof document !== "undefined" ? createPortal((
        <div className="mf-login-modal-overlay" role="dialog" aria-modal="true" aria-label="登录">
          <div className="mf-login-modal-mask" aria-hidden="true" onClick={() => setOpen(false)} />
          <section className="mf-login-card mf-login-modal-card">
            <button type="button" className="mf-login-modal-close" aria-label="关闭登录弹窗" onClick={() => setOpen(false)}>×</button>
            <div className="mf-login-card-head">
              <div className="mf-login-mark" aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/favicon.svg?v=8" alt="" />
            </div>
              <button type="button" className="mf-login-back" onClick={() => setOpen(false)}>
                <span aria-hidden="true">←</span>
                <span>关闭</span>
              </button>
            </div>
            <span className="mf-login-kicker">WELCOME TO MEVERSE</span>

            {/* 两步式:第一步填邮箱点「发送验证码」;发送后进入第二步,单独的验证码输入框+登录 */}
            <form className="mf-login-form" onSubmit={sentEmail ? submit : (event) => { event.preventDefault(); void sendCode(); }}>
              {sentEmail ? (
                <div className="mf-login-step" key="code">
                  <h1>输入验证码</h1>
                  <p className="mf-login-code-sent">验证码已发送至 <b>{sentEmail}</b></p>
                  <input
                    className="mf-login-code-input"
                    type="text"
                    value={code}
                    onChange={(event) => { setCode(event.target.value.replace(/\D/g, "").slice(0, EMAIL_CODE_LENGTH)); setError(""); }}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="000000"
                    maxLength={EMAIL_CODE_LENGTH}
                    required
                  />
                </div>
              ) : (
                <div className="mf-login-step" key="email">
                  <h1>登录 / 注册</h1>
                  <p>登录后查看你的人生轨迹和天赋</p>
                  <div className="mf-login-divider" aria-hidden="true" />
                  <label>
                    <span>邮箱</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => { setEmail(event.target.value); setError(""); }}
                      autoComplete="email"
                      placeholder="youremail@gmail.com"
                      required
                    />
                  </label>
                </div>
              )}

              {error || message ? (
                <div className="mf-login-feedback" aria-live="polite">
                  {error ? <span className="error">{error}</span> : <span>{message}</span>}
                </div>
              ) : null}

              <button className="mf-login-submit" type="submit" disabled={sentEmail ? verifyingCode : sendingCode}>
                {sentEmail
                  ? verifyingCode ? "正在验证…" : "登录"
                  : sendingCode ? "发送中…" : "发送验证码"}
              </button>

              {sentEmail ? (
                <div className="mf-login-resend">
                  {sendingCode ? <span>发送中…</span>
                    : codeCooldown > 0 ? <span>{codeCooldown} 秒后可重新获取</span>
                    : <button type="button" onClick={() => void sendCode()}>重新发送</button>}
                </div>
              ) : null}
            </form>
          </section>
        </div>
      ), document.body) : null}
    </>
  );
}
