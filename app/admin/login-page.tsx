"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

type Step = "email" | "code";

const ERROR_TEXT: Record<string, string> = {
  invalid_email: "请输入有效的邮箱地址。",
  code_too_frequent: "发送过于频繁，请稍后再试。",
  email_send_failed: "验证码邮件发送失败，请稍后重试。",
  invalid_code: "验证码不正确，请重新输入。",
  code_expired: "验证码已过期，请重新获取。",
  admin_required: "此账号没有管理后台权限。",
};

export function AdminLogin() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      if (step === "email") {
        const response = await fetch("/api/auth/email-code", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const result = (await response.json()) as { error?: string };
        if (!response.ok) throw new Error(result.error ?? "send_failed");
        setStep("code");
        return;
      }

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, code: String(form.get("code") ?? "") }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "login_failed");
      const adminResponse = await fetch("/api/admin/session", { cache: "no-store" });
      const adminResult = (await adminResponse.json()) as { error?: string };
      if (!adminResponse.ok) throw new Error(adminResult.error ?? "admin_required");
      window.location.assign("/admin");
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "unknown";
      setError(ERROR_TEXT[code] ?? "操作失败，请稍后重试。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="admin-login-page">
      <section className="admin-login-card">
        <div className="admin-login-brand">WildGPT</div>
        <p className="admin-kicker">管理后台</p>
        <h1>{step === "email" ? "管理员登录" : "输入邮箱验证码"}</h1>
        <p className="admin-login-copy">
          {step === "email"
            ? "使用已授权的管理员邮箱登录。"
            : `验证码已发送至 ${email}`}
        </p>
        <form onSubmit={submit}>
          {step === "email" ? (
            <label>
              邮箱
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@example.com"
                autoComplete="email"
                required
              />
            </label>
          ) : (
            <label>
              验证码
              <input
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                minLength={6}
                maxLength={8}
                placeholder="请输入验证码"
                autoFocus
                required
              />
            </label>
          )}
          {error ? <p className="admin-form-error" role="alert">{error}</p> : null}
          <button className="admin-primary-button" type="submit" disabled={busy}>
            {busy ? "请稍候…" : step === "email" ? "发送验证码" : "登录管理后台"}
          </button>
          {step === "code" ? (
            <button className="admin-text-button" type="button" onClick={() => setStep("email")}>
              更换邮箱
            </button>
          ) : null}
        </form>
        <Link href="/subscribe">返回 WildGPT</Link>
      </section>
    </main>
  );
}
