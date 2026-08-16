"use client";

import { FormEvent, KeyboardEvent, useEffect, useMemo, useState } from "react";
import {
  demoSteps,
  plans,
  type DemoStep,
  type Plan,
  type ProductCategory,
} from "./data";
import { useLanguage } from "./language-context";
import type { ChatGPTUser } from "./chatgpt-auth";
import ChatGPTSubscriptionWizard from "./chatgpt-subscription-wizard";
import {
  DesktopSidebar,
  MobileNavigation,
  SiteHeader,
  Toast,
} from "./site-chrome";

const DEMOSTEP_LABEL_KEYS: Record<string, string> = {
  login: "demostep.login",
  confirm: "demostep.confirm",
  complete: "demostep.complete",
};

const HIDDEN_PLAN_IDS = new Set(["claude", "claude-api"]);
const AUTH_API_ERRORS = new Set([
  "invalid_email",
  "code_too_frequent",
  "email_send_failed",
  "email_service_unavailable",
  "invalid_code",
  "code_expired",
  "invalid_password",
  "email_exists",
  "invalid_credentials",
  "auth_unavailable",
]);

type AuthIntent = "account" | "checkout";

export default function SubscriptionPage({
  chatGPTUser,
  chatGPTSignInPath,
  resumeChatGPTFlow = false,
}: {
  chatGPTUser: ChatGPTUser | null;
  chatGPTSignInPath: string;
  resumeChatGPTFlow?: boolean;
}) {
  const { t } = useLanguage();

  const tabs: Array<{
    id: ProductCategory;
    label: string;
    mobileLabel?: string;
    badge?: string;
  }> = useMemo(
    () => [{ id: "official", label: t("subscribe.tab.official") }],
    [t],
  );

  const [activeCategory, setActiveCategory] =
    useState<ProductCategory>("official");
  const [selectedId, setSelectedId] = useState("chatgpt");
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loginMethod, setLoginMethod] = useState<"password" | "code">(
    "password",
  );
  const [demoStep, setDemoStep] = useState<DemoStep["id"]>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [authInviteCode, setAuthInviteCode] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authIntent, setAuthIntent] = useState<AuthIntent>("account");
  const [toast, setToast] = useState("");
  const [chatGPTWizardOpen, setChatGPTWizardOpen] = useState(
    resumeChatGPTFlow,
  );
  const [chatGPTWizardStartStep, setChatGPTWizardStartStep] = useState(
    resumeChatGPTFlow ? (chatGPTUser ? 4 : 3) : 1,
  );

  useEffect(() => {
    let active = true;
    fetch("/api/auth/session")
      .then(
        (response) =>
          response.json() as Promise<{ user?: { id: string } | null }>,
      )
      .then((result) => {
        if (active) setIsAuthenticated(Boolean(result.user));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const visiblePlans = useMemo(
    () =>
      plans.filter(
        (plan) =>
          plan.category === activeCategory && !HIDDEN_PLAN_IDS.has(plan.id),
      ),
    [activeCategory],
  );
  const selectedPlan =
    plans.find((plan) => plan.id === selectedId) ?? plans[0];
  const stepIndex = demoSteps.findIndex((step) => step.id === demoStep);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  }

  function changeCategory(category: ProductCategory) {
    setActiveCategory(category);
    const firstPlan = plans.find((plan) => plan.category === category);
    if (firstPlan) setSelectedId(firstPlan.id);
  }

  function choosePlan(plan: Plan) {
    setSelectedId(plan.id);
  }

  function openChatGPTWizard() {
    setChatGPTWizardStartStep(1);
    setChatGPTWizardOpen(true);
  }

  function closeChatGPTWizard() {
    setChatGPTWizardOpen(false);
  }

  function openAuth(nextIntent: AuthIntent) {
    setAuthIntent(nextIntent);
    setMode("login");
    setLoginMethod("password");
    setDemoStep("login");
    setModalOpen(true);
  }

  function openAccountAuth() {
    openAuth("account");
  }

  function continueCheckout() {
    if (selectedPlan.id === "chatgpt") {
      openChatGPTWizard();
      return;
    }

    setDemoStep("confirm");
    setModalOpen(true);
  }

  function beginCheckout() {
    if (!isAuthenticated) {
      openAuth("checkout");
      return;
    }

    continueCheckout();
  }

  function closeModal() {
    setModalOpen(false);
    setDemoStep("login");
  }

  function authErrorMessage(error: string) {
    return t(
      AUTH_API_ERRORS.has(error)
        ? `auth.toast.${error}`
        : "auth.toast.email_service_unavailable",
    );
  }

  async function sendEmailCode() {
    if (!email.trim()) {
      showToast(t("auth.toast.email_required"));
      return;
    }
    setSendingCode(true);
    try {
      const response = await fetch("/api/auth/email-code", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          purpose: mode === "register" ? "register" : "login",
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        showToast(authErrorMessage(result.error ?? ""));
        return;
      }
      showToast(t("auth.toast.code_sent"));
    } catch {
      showToast(t("auth.toast.email_service_unavailable"));
    } finally {
      setSendingCode(false);
    }
  }

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) {
      showToast(t("auth.toast.email_required"));
      return;
    }
    if (mode === "login" && loginMethod === "password" && !password.trim()) {
      showToast(t("auth.toast.password_required"));
      return;
    }
    if (mode === "login" && loginMethod === "code" && !code.trim()) {
      showToast(t("auth.toast.code_required"));
      return;
    }
    if (
      mode === "register" &&
      (!password.trim() || !confirmPassword.trim() || !code.trim())
    ) {
      showToast(t("auth.toast.fill_all"));
      return;
    }
    if (mode === "register" && password !== confirmPassword) {
      showToast(t("auth.toast.password_mismatch"));
      return;
    }
    if (!agreed) {
      showToast(t("auth.toast.agree_required"));
      return;
    }

    setVerifyingCode(true);
    try {
      const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          code,
          method: loginMethod,
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        showToast(authErrorMessage(result.error ?? ""));
        return;
      }
    } catch {
      showToast(t("auth.toast.auth_unavailable"));
      return;
    } finally {
      setVerifyingCode(false);
    }

    setIsAuthenticated(true);
    if (authIntent === "checkout") {
      if (selectedPlan.id === "chatgpt") {
        setModalOpen(false);
        setDemoStep("login");
        openChatGPTWizard();
      } else {
        setDemoStep("confirm");
      }
      return;
    }

    closeModal();
    showToast(
      mode === "register"
        ? t("auth.toast.register_success")
        : t("auth.toast.login_success"),
    );
  }

  function handleDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") closeModal();
  }

  function getDemoStepTitle(id: string): string {
    return t(DEMOSTEP_LABEL_KEYS[id] ?? id);
  }

  return (
    <div className="site-shell">
      <SiteHeader authAction={openAccountAuth} />

      <div className="page-layout">
        <DesktopSidebar active="subscribe" ariaLabel="主导航" />

        <main className="subscribe-main">
          <div className="primary-tabs" role="tablist" aria-label="订阅分类">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeCategory === tab.id}
                className={
                  activeCategory === tab.id ? "primary-tab active" : "primary-tab"
                }
                onClick={() => changeCategory(tab.id)}
              >
                {tab.badge && <span className="save-badge">{tab.badge}</span>}
                <span className="desktop-tab-label">{tab.label}</span>
                <span className="mobile-tab-label">
                  {tab.mobileLabel ?? tab.label}
                </span>
              </button>
            ))}
          </div>

          <section
            className={`plans-section ${activeCategory !== "official" ? "single-plan" : ""}`}
            aria-label="可选套餐"
          >
            <div className="plan-grid">
              {visiblePlans.map((plan) => (
                <button
                  type="button"
                  className={
                    selectedId === plan.id ? "plan-card selected" : "plan-card"
                  }
                  key={plan.id}
                  onClick={() => choosePlan(plan)}
                  aria-pressed={selectedId === plan.id}
                >
                  <span className="plan-copy">
                    <span className="plan-title">{plan.title}</span>
                    <span className="plan-subtitle">{plan.subtitle}</span>
                  </span>
                  <span className="price-block">
                    <span className="price-label">
                      {t("subscribe.price.original")}
                    </span>
                    <span className="price">
                      <small>$</small>
                      {plan.price}
                    </span>
                    <span className="price-suffix">{plan.suffix}</span>
                  </span>
                  <span className="plan-detail">{plan.detail}</span>
                  <span
                    className="plan-icon plan-card-icon"
                    style={
                      {
                        "--plan-accent": plan.accent,
                      } as React.CSSProperties
                    }
                    aria-hidden="true"
                  >
                    {plan.icon}
                  </span>
                  {selectedId === plan.id && (
                    <span className="selected-check" aria-hidden="true">
                      ✓
                    </span>
                  )}
                </button>
              ))}
            </div>

            <p className="guarantee">
              <span aria-hidden="true">✓</span>
              {activeCategory === "developer-api"
                ? t("subscribe.guarantee.developer")
                : activeCategory === "coding"
                  ? t("subscribe.guarantee.coding")
                  : t("subscribe.guarantee.official")}
            </p>
          </section>

          <section className="checkout-panel" aria-label="订阅操作">
            <button
              className="next-button"
              type="button"
              onClick={beginCheckout}
            >
              {t("subscribe.cta")}
              <span aria-hidden="true">→</span>
            </button>
          </section>
        </main>
      </div>

      <MobileNavigation active="subscribe" />

      <button
        className="support-button"
        type="button"
        onClick={() => showToast(t("support.toast"))}
      >
        <span aria-hidden="true">◌</span>
        {t("support")}
      </button>

      {modalOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div
            className="demo-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="demo-title"
            onKeyDown={handleDialogKeyDown}
          >
            <button
              className="close-button"
              type="button"
              onClick={closeModal}
              aria-label={t("auth.close")}
              autoFocus
            >
              ×
            </button>

            {demoStep !== "login" && (
              <div className="stepper" aria-label="订阅进度">
                {demoSteps.map((step, index) => (
                  <div
                    key={step.id}
                    className={
                      index <= stepIndex
                        ? "step-indicator active"
                        : "step-indicator"
                    }
                  >
                    <span>{index < stepIndex ? "✓" : index + 1}</span>
                    <small>{getDemoStepTitle(step.id)}</small>
                  </div>
                ))}
              </div>
            )}

            {demoStep === "login" && (
              <div className="auth-panel">
                <h1 id="demo-title">
                  {mode === "register"
                    ? t("auth.title.register")
                    : loginMethod === "password"
                      ? t("auth.title.login")
                      : t("auth.title.login_code")}
                </h1>
                <form onSubmit={submitLogin} className="auth-form">
                  <input
                    className="auth-input"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder={t("auth.placeholder.email")}
                    aria-label={t("auth.placeholder.email")}
                  />

                  {(mode === "register" || loginMethod === "password") && (
                    <div className="password-field">
                      <input
                        className="auth-input"
                        type="password"
                        autoComplete={
                          mode === "register" ? "new-password" : "current-password"
                        }
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder={t("auth.placeholder.password")}
                        aria-label={t("auth.placeholder.password")}
                      />
                      {mode === "login" && (
                        <button
                          className="forgot-password"
                          type="button"
                          onClick={() =>
                            showToast(t("auth.toast.forgot_password_demo"))
                          }
                        >
                          {t("auth.forgot_password")}
                        </button>
                      )}
                    </div>
                  )}

                  {mode === "register" && (
                    <input
                      className="auth-input"
                      type="password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder={t("auth.placeholder.confirm_password")}
                      aria-label={t("auth.placeholder.confirm_password")}
                    />
                  )}

                  {(mode === "register" || loginMethod === "code") && (
                    <div className="auth-code-field">
                      <input
                        inputMode="numeric"
                        value={code}
                        onChange={(event) => setCode(event.target.value)}
                        placeholder={t("auth.placeholder.code")}
                        aria-label={t("auth.placeholder.code")}
                      />
                      <button
                        type="button"
                        disabled={sendingCode}
                        onClick={sendEmailCode}
                      >
                        {t(sendingCode ? "auth.sending_code" : "auth.get_code")}
                      </button>
                    </div>
                  )}

                  {mode === "register" && (
                    <input
                      className="auth-input"
                      value={authInviteCode}
                      onChange={(event) => setAuthInviteCode(event.target.value)}
                      placeholder={t("auth.placeholder.invite_code")}
                      aria-label={t("auth.placeholder.invite_code")}
                    />
                  )}

                  <button
                    className="modal-primary auth-submit"
                    type="submit"
                    disabled={verifyingCode}
                  >
                    {verifyingCode
                      ? t("auth.verifying_code")
                      : mode === "register"
                        ? t("auth.submit.register")
                      : t("auth.submit.login")}
                  </button>

                  {mode === "login" && (
                    <button
                      className="auth-method-button"
                      type="button"
                      onClick={() =>
                        setLoginMethod((current) =>
                          current === "password" ? "code" : "password",
                        )
                      }
                    >
                      {loginMethod === "password"
                        ? t("auth.switch.to_code")
                        : t("auth.switch.to_password")}
                    </button>
                  )}

                  <label className="agreement">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(event) => setAgreed(event.target.checked)}
                    />
                    <span>
                      {t("auth.agreement.prefix")}
                      <button
                        type="button"
                        onClick={() =>
                          showToast(t("auth.toast.agreement_demo"))
                        }
                      >
                        {t("auth.agreement.link")}
                      </button>
                    </span>
                  </label>
                </form>

                <div className="auth-mode-footer">
                  <span>
                    {mode === "login"
                      ? t("auth.no_account")
                      : t("auth.has_account")}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setMode(mode === "login" ? "register" : "login");
                      setLoginMethod("password");
                    }}
                  >
                    {mode === "login"
                      ? t("auth.switch_mode.register")
                      : t("auth.switch_mode.login")}
                  </button>
                </div>
              </div>
            )}

            {demoStep === "confirm" && (
              <div className="confirm-content">
                <span className="confirm-icon" aria-hidden="true">
                  ✓
                </span>
                <h1 id="demo-title">{t("confirm.title")}</h1>
                <p className="modal-description">
                  {t("confirm.description")}
                </p>
                <div className="confirm-card">
                  <span
                    className="plan-icon"
                    style={
                      {
                        "--plan-accent": selectedPlan.accent,
                      } as React.CSSProperties
                    }
                  >
                    {selectedPlan.icon}
                  </span>
                  <span>
                    <strong>{selectedPlan.title}</strong>
                    <small>{selectedPlan.detail}</small>
                  </span>
                  <b>${selectedPlan.price}</b>
                </div>
                <button
                  className="modal-primary"
                  type="button"
                  onClick={() => setDemoStep("complete")}
                >
                  {t("confirm.continue")}
                </button>
                <button
                  className="modal-secondary"
                  type="button"
                  onClick={() => setDemoStep("login")}
                >
                  {t("confirm.back")}
                </button>
              </div>
            )}

            {demoStep === "complete" && (
              <div className="complete-content">
                <span className="success-ring" aria-hidden="true">
                  ✓
                </span>
                <h1 id="demo-title">{t("complete.title")}</h1>
                <p>{t("complete.description")}</p>
                <button
                  className="modal-primary"
                  type="button"
                  onClick={closeModal}
                >
                  {t("complete.done")}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {chatGPTWizardOpen && (
        <ChatGPTSubscriptionWizard
          chatGPTUser={chatGPTUser}
          initialStep={chatGPTWizardStartStep}
          signInPath={chatGPTSignInPath}
          onClose={closeChatGPTWizard}
          onNotice={showToast}
        />
      )}

      <Toast>{toast}</Toast>
    </div>
  );
}
