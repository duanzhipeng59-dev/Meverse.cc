"use client";

// /home 工作台内的登录入口:不跳转 /login 页,以居中弹窗呈现(登录页同款卡片样式,
// 背后是唤起页的模糊倒影)。登录成功后就地刷新登录态并留当前页;首页营销入口仍走 /login 页面链路。
// 注意:卡片视觉复用登录页 mf-login-card 体系,样式在 home.css 内有一份副本,改版需两处同步。
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
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

  useEffect(() => {
    if (open) { setError(""); setMessage(""); }
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
      {open ? (
        <div className="mf-login-modal-overlay" role="dialog" aria-modal="true" aria-label="登录">
          <div className="mf-login-modal-mask" aria-hidden="true" onClick={() => setOpen(false)} />
          <section className="mf-login-card mf-login-modal-card">
            <div className="mf-login-card-head">
              <div className="mf-login-mark" aria-hidden="true"><span>✦</span></div>
              <button type="button" className="mf-login-back" onClick={() => setOpen(false)}>
                <span aria-hidden="true">←</span>
                <span>关闭</span>
              </button>
            </div>
            <span className="mf-login-kicker">WELCOME TO MYFATE</span>
            <h1>登录后，继续探索</h1>
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
                  <button type="button" onClick={() => void sendCode()} disabled={sendingCode || codeCooldown > 0}>
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
        </div>
      ) : null}
    </>
  );
}
