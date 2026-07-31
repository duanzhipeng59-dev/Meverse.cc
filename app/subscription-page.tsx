"use client";

import { FormEvent, KeyboardEvent, useMemo, useState } from "react";
import {
  demoSteps,
  navigationItems,
  plans,
  type DemoStep,
  type Plan,
  type ProductCategory,
} from "./data";

const tabs: Array<{
  id: ProductCategory;
  label: string;
  mobileLabel?: string;
  badge?: string;
}> = [
  { id: "official", label: "新订阅" },
  {
    id: "coding",
    label: "Claude Code/Codex",
    mobileLabel: "CC/Codex",
    badge: "最多省 50%",
  },
  { id: "developer-api", label: "开发者 API" },
];

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

export default function SubscriptionPage() {
  const [activeCategory, setActiveCategory] =
    useState<ProductCategory>("official");
  const [selectedId, setSelectedId] = useState("chatgpt");
  const [inviteCode, setInviteCode] = useState("");
  const [inviteApplied, setInviteApplied] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [demoStep, setDemoStep] = useState<DemoStep["id"]>("login");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [toast, setToast] = useState("");

  const visiblePlans = useMemo(
    () => plans.filter((plan) => plan.category === activeCategory),
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

  function openDemo(nextMode: "login" | "register" = "login") {
    setMode(nextMode);
    setDemoStep("login");
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setDemoStep("login");
  }

  function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!phone.trim() || !code.trim()) {
      showToast("请填写手机号和验证码");
      return;
    }
    if (!agreed) {
      showToast("请先阅读并同意服务条款");
      return;
    }
    setDemoStep("confirm");
  }

  function applyInvite() {
    if (!inviteCode.trim()) {
      showToast("请输入邀请码");
      return;
    }
    setInviteApplied(true);
    showToast("邀请码已应用（演示）");
  }

  function handleDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") closeModal();
  }

  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="brand" href="/subscribe" aria-label="WildAI 订阅首页">
          <BrandMark />
          <span>WildAI</span>
        </a>
        <div className="header-actions">
          <button
            className="language-button"
            type="button"
            onClick={() => showToast("第一版暂仅提供中文")}
          >
            EN
            <span aria-hidden="true">⌄</span>
          </button>
          <button
            className="login-link"
            type="button"
            onClick={() => openDemo("login")}
          >
            登录
          </button>
          <button
            className="register-button"
            type="button"
            onClick={() => openDemo("register")}
          >
            注册
          </button>
        </div>
      </header>

      <div className="page-layout">
        <aside className="sidebar" aria-label="主导航">
          <nav>
            {navigationItems.map((item) => (
              <button
                className={item.active ? "nav-item active" : "nav-item"}
                key={item.id}
                type="button"
                aria-current={item.active ? "page" : undefined}
                onClick={() =>
                  item.active
                    ? undefined
                    : showToast(`${item.label}将在后续版本开放`)
                }
              >
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

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
                  <span
                    className="plan-icon"
                    style={
                      {
                        "--plan-accent": plan.accent,
                      } as React.CSSProperties
                    }
                    aria-hidden="true"
                  >
                    {plan.icon}
                  </span>
                  <span className="plan-copy">
                    <span className="plan-title">{plan.title}</span>
                    <span className="plan-subtitle">{plan.subtitle}</span>
                  </span>
                  <span className="price-block">
                    <span className="price-label">原价</span>
                    <span className="price">
                      <small>$</small>
                      {plan.price}
                    </span>
                    <span className="price-suffix">{plan.suffix}</span>
                  </span>
                  <span className="plan-detail">{plan.detail}</span>
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
                ? "在 Cursor / Cline / OpenClaw 中直接配置，或写入你自己的代码。"
                : activeCategory === "coding"
                  ? "无需账户和外卡支付，远离封号和网络问题。"
                  : "升级你自己的账户 · 订阅失败全额退款 · 7×12h 在线客服"}
            </p>
          </section>

          <section className="checkout-panel" aria-label="订阅操作">
            {activeCategory === "official" && (
              <div className="invite-row">
                <label htmlFor="inviteCode">邀请码</label>
                <div className="invite-control">
                  <input
                    id="inviteCode"
                    value={inviteCode}
                    onChange={(event) => {
                      setInviteCode(event.target.value);
                      setInviteApplied(false);
                    }}
                    placeholder="输入邀请码"
                  />
                  <button type="button" onClick={applyInvite}>
                    {inviteApplied ? "已应用" : "确认"}
                  </button>
                </div>
              </div>
            )}

            <div className="selected-summary">
              <span>
                已选择
                <strong>{selectedPlan.title}</strong>
              </span>
              <span className="summary-price">
                ${selectedPlan.price}
                <small>{selectedPlan.suffix}</small>
              </span>
            </div>

            <button
              className="next-button"
              type="button"
              onClick={() => openDemo("login")}
            >
              立即订阅
              <span aria-hidden="true">→</span>
            </button>
          </section>
        </main>
      </div>

      <nav className="mobile-nav" aria-label="移动端主导航">
        {navigationItems.map((item, index) => (
          <button
            type="button"
            key={item.id}
            className={item.active ? "active" : ""}
            onClick={() =>
              item.active
                ? undefined
                : showToast(`${item.label}将在后续版本开放`)
            }
          >
            <span aria-hidden="true">
              {index === 0 ? "▦" : index === 1 ? "↻" : "♙"}
            </span>
            {item.label}
          </button>
        ))}
      </nav>

      <button
        className="support-button"
        type="button"
        onClick={() => showToast("在线客服为前端演示入口")}
      >
        <span aria-hidden="true">◌</span>
        客服
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
              aria-label="关闭"
              autoFocus
            >
              ×
            </button>

            <div className="stepper" aria-label="演示进度">
              {demoSteps.map((step, index) => (
                <div
                  key={step.id}
                  className={
                    index <= stepIndex ? "step-indicator active" : "step-indicator"
                  }
                >
                  <span>{index < stepIndex ? "✓" : index + 1}</span>
                  <small>{step.title}</small>
                </div>
              ))}
            </div>

            {demoStep === "login" && (
              <>
                <div className="modal-brand">
                  <BrandMark />
                  <span>WildAI</span>
                </div>
                <h1 id="demo-title">
                  {mode === "login" ? "登录 WildAI" : "注册 WildAI"}
                </h1>
                <p className="modal-description">
                  {mode === "login"
                    ? "登录后继续完成你的 AI 服务订阅"
                    : "创建账户，开始使用 WildAI"}
                </p>
                <div className="mode-switch" role="tablist" aria-label="账户操作">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === "login"}
                    className={mode === "login" ? "active" : ""}
                    onClick={() => setMode("login")}
                  >
                    登录
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === "register"}
                    className={mode === "register" ? "active" : ""}
                    onClick={() => setMode("register")}
                  >
                    注册
                  </button>
                </div>
                <form onSubmit={submitLogin} className="auth-form">
                  <label>
                    手机号
                    <span className="phone-input">
                      <span>+86</span>
                      <input
                        inputMode="tel"
                        autoComplete="tel"
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        placeholder="请输入手机号"
                        aria-label="手机号"
                      />
                    </span>
                  </label>
                  <label>
                    验证码
                    <span className="code-input">
                      <input
                        inputMode="numeric"
                        value={code}
                        onChange={(event) => setCode(event.target.value)}
                        placeholder="请输入验证码"
                        aria-label="验证码"
                      />
                      <button
                        type="button"
                        onClick={() => showToast("验证码已发送（演示）")}
                      >
                        获取验证码
                      </button>
                    </span>
                  </label>
                  <label className="agreement">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(event) => setAgreed(event.target.checked)}
                    />
                    <span>
                      我已阅读并同意《服务条款》和《隐私政策》
                    </span>
                  </label>
                  <button className="modal-primary" type="submit">
                    {mode === "login" ? "登录并继续" : "注册并继续"}
                  </button>
                </form>
              </>
            )}

            {demoStep === "confirm" && (
              <div className="confirm-content">
                <span className="confirm-icon" aria-hidden="true">
                  ✓
                </span>
                <h1 id="demo-title">确认订阅套餐</h1>
                <p className="modal-description">
                  这是前端演示，不会创建订单或产生扣款。
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
                  确认并继续
                </button>
                <button
                  className="modal-secondary"
                  type="button"
                  onClick={() => setDemoStep("login")}
                >
                  上一步
                </button>
              </div>
            )}

            {demoStep === "complete" && (
              <div className="complete-content">
                <span className="success-ring" aria-hidden="true">
                  ✓
                </span>
                <h1 id="demo-title">前端演示完成</h1>
                <p>
                  套餐选择、登录与订单确认界面已走通。真实支付和账号逻辑将在后续版本接入。
                </p>
                <button
                  className="modal-primary"
                  type="button"
                  onClick={closeModal}
                >
                  完成
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </div>
  );
}
