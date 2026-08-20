"use client";

import {
  FormEvent,
  KeyboardEvent,
  lazy,
  MouseEvent as ReactMouseEvent,
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  demoSteps,
  plans,
  type DemoStep,
  type Plan,
  type ProductCategory,
} from "./data";
import { useAuth } from "./auth-context";
import { useLanguage } from "./language-context";
import type { ChatGPTUser } from "./chatgpt-auth";
import type {
  GeminiBillingMode,
  InitialGeminiPayment,
} from "./gemini-family-wizard";
import {
  DesktopSidebar,
  MobileNavigation,
  SiteHeader,
  Toast,
} from "./site-chrome";

const loadChatGPTSubscriptionWizard = () =>
  import("./chatgpt-subscription-wizard");
const loadGeminiFamilyWizard = () => import("./gemini-family-wizard");
const ChatGPTSubscriptionWizard = lazy(loadChatGPTSubscriptionWizard);
const GeminiFamilyWizard = lazy(loadGeminiFamilyWizard);

function WizardLoadingFallback() {
  const { t } = useLanguage();

  return (
    <div
      className="chatgpt-wizard-backdrop wizard-loading-fallback"
      role="status"
      aria-label={t("common.loading")}
      aria-live="polite"
    >
      <span className="spinner" aria-hidden="true" />
    </div>
  );
}

const DEMOSTEP_LABEL_KEYS: Record<string, string> = {
  login: "demostep.login",
  confirm: "demostep.confirm",
  complete: "demostep.complete",
};

const HOMEPAGE_PLAN_IDS = new Set(["gemini"]);
const AUTH_API_ERRORS = new Set([
  "invalid_email",
  "code_too_frequent",
  "email_send_failed",
  "email_service_unavailable",
  "invalid_code",
  "code_expired",
  "auth_unavailable",
]);

type AuthIntent = "account" | "checkout";

export default function SubscriptionPage({
  chatGPTUser,
  chatGPTSignInPath,
  resumeChatGPTFlow = false,
  initialGeminiPayment = null,
}: {
  chatGPTUser: ChatGPTUser | null;
  chatGPTSignInPath: string;
  resumeChatGPTFlow?: boolean;
  initialGeminiPayment?: InitialGeminiPayment | null;
}) {
  const { t } = useLanguage();
  const { status, email: authEmail, markAuthenticated } = useAuth();

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
  const [selectedId, setSelectedId] = useState("gemini");
  const [modalOpen, setModalOpen] = useState(false);
  const [demoStep, setDemoStep] = useState<DemoStep["id"]>("login");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [codeCooldown, setCodeCooldown] = useState(0);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [authIntent, setAuthIntent] = useState<AuthIntent>("account");
  const [toast, setToast] = useState("");
  const [chatGPTWizardOpen, setChatGPTWizardOpen] = useState(
    resumeChatGPTFlow,
  );
  const [chatGPTWizardStartStep, setChatGPTWizardStartStep] = useState(
    resumeChatGPTFlow ? (chatGPTUser ? 4 : 3) : 1,
  );
  const [geminiFamilyWizardOpen, setGeminiFamilyWizardOpen] = useState(
    Boolean(initialGeminiPayment),
  );
  const [geminiInitialBillingMode, setGeminiInitialBillingMode] =
    useState<GeminiBillingMode>("monthly");

  useEffect(() => {
    if (codeCooldown <= 0) return;
    const timer = window.setTimeout(
      () => setCodeCooldown((seconds) => Math.max(0, seconds - 1)),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [codeCooldown]);

  const visiblePlans = useMemo(
    () =>
      plans.filter(
        (plan) =>
          plan.category === activeCategory && HOMEPAGE_PLAN_IDS.has(plan.id),
      ),
    [activeCategory],
  );
  const selectedPlan =
    plans.find((plan) => plan.id === selectedId) ?? plans[0];
  const selectedPlanCopy = getPlanCopy(selectedPlan);
  const stepIndex = demoSteps.findIndex((step) => step.id === demoStep);

  function getPlanCopy(plan: Plan) {
    if (plan.id !== "gemini") {
      return {
        title: plan.title,
        subtitle: plan.subtitle,
        detail: plan.detail,
        suffix: plan.suffix,
      };
    }

    return {
      title: t("plan.gemini.title"),
      subtitle: t("plan.gemini.subtitle"),
      detail: t("plan.gemini.detail"),
      suffix: t("plan.gemini.suffix"),
    };
  }

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
    if (plan.id === "gemini") {
      setGeminiInitialBillingMode("monthly");
      setGeminiFamilyWizardOpen(true);
    }
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
    setDemoStep("login");
    setModalOpen(true);
  }

  function openAccountAuth() {
    openAuth("account");
  }

  function continueCheckout() {
    if (selectedPlan.id === "gemini") {
      setGeminiFamilyWizardOpen(true);
      return;
    }
    if (selectedPlan.id === "chatgpt") {
      openChatGPTWizard();
      return;
    }

    setDemoStep("confirm");
    setModalOpen(true);
  }

  function beginCheckout() {
    if (selectedPlan.id === "gemini") {
      setGeminiInitialBillingMode("monthly");
      setGeminiFamilyWizardOpen(true);
      return;
    }
    if (status !== "authenticated") {
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

  async function sendEmailCode(event: ReactMouseEvent<HTMLButtonElement>) {
    const formData = event.currentTarget.form
      ? new FormData(event.currentTarget.form)
      : null;
    const submittedEmail = String(formData?.get("email") ?? email).trim();

    if (!submittedEmail) {
      showToast(t("auth.toast.email_required"));
      return;
    }
    setSendingCode(true);
    try {
      const response = await fetch("/api/auth/email-code", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: submittedEmail }),
      });
      const result = (await response.json()) as {
        error?: string;
        user?: { id: string; email?: string };
      };
      if (!response.ok) {
        showToast(authErrorMessage(result.error ?? ""));
        return;
      }
      setCodeCooldown(60);
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
    if (!code.trim()) {
      showToast(t("auth.toast.code_required"));
      return;
    }
    if (!agreed) {
      showToast(t("auth.toast.agree_required"));
      return;
    }

    let authenticatedEmail = email.trim();
    setVerifyingCode(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          code,
        }),
      });
      const result = (await response.json()) as {
        error?: string;
        user?: { id: string; email?: string };
      };
      if (!response.ok) {
        showToast(authErrorMessage(result.error ?? ""));
        return;
      }
      authenticatedEmail = result.user?.email ?? authenticatedEmail;
    } catch {
      showToast(t("auth.toast.auth_unavailable"));
      return;
    } finally {
      setVerifyingCode(false);
    }

    markAuthenticated(authenticatedEmail);
    if (authIntent === "checkout") {
      setModalOpen(false);
      setDemoStep("login");
      continueCheckout();
      return;
    }

    closeModal();
    showToast(t("auth.toast.login_success"));
  }

  function handleDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") closeModal();
  }

  function getDemoStepTitle(id: string): string {
    return t(DEMOSTEP_LABEL_KEYS[id] ?? id);
  }

  return (
    <div className="site-shell">
      <SiteHeader onLogin={openAccountAuth} />

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
              {visiblePlans.map((plan) => {
                const planCopy = getPlanCopy(plan);
                return (
                  <button
                  type="button"
                  className={
                    selectedId === plan.id ? "plan-card selected" : "plan-card"
                  }
                  key={plan.id}
                  onClick={() => choosePlan(plan)}
                  onFocus={() => void loadGeminiFamilyWizard()}
                  onPointerEnter={() => void loadGeminiFamilyWizard()}
                  aria-pressed={selectedId === plan.id}
                >
                  <span className="plan-copy">
                    <span className="plan-title">{planCopy.title}</span>
                    <span className="plan-subtitle">{planCopy.subtitle}</span>
                  </span>
                  <span className="price-block">
                    <span className="price-label">
                      {t("subscribe.price.original")}
                    </span>
                    <span className="price">
                      <small>{plan.currency ?? "$"}</small>
                      {plan.price}
                    </span>
                    <span className="price-suffix">{planCopy.suffix}</span>
                  </span>
                  <span className="plan-detail">{planCopy.detail}</span>
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
                );
              })}
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
              onFocus={() => void loadGeminiFamilyWizard()}
              onPointerEnter={() => void loadGeminiFamilyWizard()}
            >
              {t("subscribe.cta")}
              <span aria-hidden="true">→</span>
            </button>
          </section>
        </main>
      </div>

      <MobileNavigation active="subscribe" />

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
                <h1 id="demo-title">{t("auth.title.login_code")}</h1>
                <form onSubmit={submitLogin} className="auth-form">
                  <input
                    className="auth-input"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder={t("auth.placeholder.email")}
                    aria-label={t("auth.placeholder.email")}
                  />

                  <div className="auth-code-field">
                      <input
                        name="code"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        value={code}
                        onChange={(event) => setCode(event.target.value)}
                        placeholder={t("auth.placeholder.code")}
                        aria-label={t("auth.placeholder.code")}
                      />
                      <button
                        type="button"
                        disabled={sendingCode || codeCooldown > 0}
                        onClick={sendEmailCode}
                      >
                        {sendingCode
                          ? t("auth.sending_code")
                          : codeCooldown > 0
                            ? t("auth.resend_code_in", {
                                seconds: codeCooldown,
                              })
                            : t("auth.get_code")}
                      </button>
                  </div>

                  <button
                    className="modal-primary auth-submit"
                    type="submit"
                    disabled={verifyingCode}
                  >
                    {verifyingCode
                      ? t("auth.verifying_code")
                      : t("auth.submit.login")}
                  </button>

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
                    <strong>{selectedPlanCopy.title}</strong>
                    <small>{selectedPlanCopy.detail}</small>
                  </span>
                  <b>
                    {selectedPlan.currency ?? "$"}
                    {selectedPlan.price}
                  </b>
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
        <Suspense fallback={<WizardLoadingFallback />}>
          <ChatGPTSubscriptionWizard
            chatGPTUser={chatGPTUser}
            initialStep={chatGPTWizardStartStep}
            signInPath={chatGPTSignInPath}
            onClose={closeChatGPTWizard}
            onNotice={showToast}
          />
        </Suspense>
      )}

      {geminiFamilyWizardOpen && (
        <Suspense fallback={<WizardLoadingFallback />}>
          <GeminiFamilyWizard
            accountEmail={authEmail}
            initialBillingMode={geminiInitialBillingMode}
            initialPayment={initialGeminiPayment}
            onClose={() => setGeminiFamilyWizardOpen(false)}
            onRequireAccount={(billingMode) => {
              setGeminiInitialBillingMode(billingMode);
              setGeminiFamilyWizardOpen(false);
              openAuth("checkout");
            }}
          />
        </Suspense>
      )}

      <Toast>{toast}</Toast>
    </div>
  );
}
