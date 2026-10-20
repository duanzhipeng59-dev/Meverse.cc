"use client";

import { useState } from "react";
import type { ChatGPTUser } from "./chatgpt-auth";

type ChatGPTTier = "go" | "plus" | "pro5" | "pro20";

const CHATGPT_TIERS: Array<{
  id: ChatGPTTier;
  title: string;
  price: string;
  note: string;
}> = [
  { id: "go", title: "1 个月 Go", price: "10.99", note: "可续订" },
  { id: "plus", title: "1 个月 Plus", price: "23.99", note: "中途可升至 Pro" },
  { id: "pro5", title: "1 个月 Pro 5 倍", price: "105.99", note: "可续订" },
  { id: "pro20", title: "1 个月 Pro 20 倍", price: "205.99", note: "可续订" },
];

export default function ChatGPTSubscriptionWizard({
  chatGPTUser,
  initialStep,
  signInPath,
  onClose,
  onNotice,
}: {
  chatGPTUser: ChatGPTUser | null;
  initialStep: number;
  signInPath: string;
  onClose: () => void;
  onNotice: (message: string) => void;
}) {
  const [step, setStep] = useState(initialStep);
  const [subscriptionMode, setSubscriptionMode] = useState<"single" | "long">(
    "single",
  );
  const [tierId, setTierId] = useState<ChatGPTTier>("plus");
  const [processingPayment, setProcessingPayment] = useState(false);
  const selectedTier =
    CHATGPT_TIERS.find((tier) => tier.id === tierId) ?? CHATGPT_TIERS[1];

  function close() {
    setProcessingPayment(false);
    onClose();
  }

  function startPayment() {
    setProcessingPayment(true);
    window.setTimeout(() => {
      setProcessingPayment(false);
      setStep(5);
    }, 900);
  }

  return (
    <div
      className="chatgpt-wizard-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        className="chatgpt-wizard"
        role="dialog"
        aria-modal="true"
        aria-labelledby="chatgpt-wizard-title"
        onKeyDown={(event) => {
          if (event.key === "Escape") close();
        }}
      >
        <button
          className="wizard-close"
          type="button"
          aria-label="关闭 ChatGPT 订阅流程"
          onClick={close}
        >
          ×
        </button>

        {processingPayment ? (
          <div className="payment-processing" aria-live="polite">
            <h2>正在处理支付</h2>
            <div className="processing-list">
              <div className="processing-row active">
                <span className="spinner" aria-hidden="true" />
                <span>
                  <strong>创建订单</strong>
                  <small>处理中...</small>
                </span>
              </div>
              <div className="processing-line" />
              <div className="processing-row">
                <span className="empty-status" aria-hidden="true" />
                <strong>获取支付信息</strong>
              </div>
            </div>
          </div>
        ) : (
          <>
            {step === 1 && (
              <div className="wizard-page">
                <div className="wizard-heading">
                  <span>步骤 1</span>
                  <h2 id="chatgpt-wizard-title">选择您想要订阅的时长</h2>
                </div>
                <div className="duration-grid">
                  <button
                    type="button"
                    className={
                      subscriptionMode === "single"
                        ? "duration-card selected"
                        : "duration-card"
                    }
                    onClick={() => setSubscriptionMode("single")}
                  >
                    <span className="openai-mark" aria-hidden="true">◎</span>
                    <small>ChatGPT</small>
                    <strong>单次订阅</strong>
                    <p>只订阅 1 个月，到期不再续费。</p>
                  </button>
                  <button
                    type="button"
                    className={
                      subscriptionMode === "long"
                        ? "duration-card selected"
                        : "duration-card"
                    }
                    onClick={() => setSubscriptionMode("long")}
                  >
                    <span className="openai-mark" aria-hidden="true">◎</span>
                    <small>ChatGPT</small>
                    <strong>长期订阅</strong>
                    <p>多月连续订阅，享更优价格。</p>
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="wizard-page">
                <div className="wizard-heading">
                  <span>步骤 2</span>
                  <h2 id="chatgpt-wizard-title">选择您想要订阅的周期</h2>
                </div>
                <div className="tier-grid">
                  {CHATGPT_TIERS.map((tier) => (
                    <button
                      type="button"
                      key={tier.id}
                      className={
                        tierId === tier.id ? "tier-card selected" : "tier-card"
                      }
                      onClick={() => setTierId(tier.id)}
                    >
                      <span className="openai-mark" aria-hidden="true">◎</span>
                      <small>ChatGPT</small>
                      <strong>
                        {subscriptionMode === "long"
                          ? tier.title.replace("1 个月", "连续订阅")
                          : tier.title}
                      </strong>
                      <b>${tier.price}</b>
                      <em>{tier.note}</em>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="wizard-page auth-wizard-page">
                <div className="wizard-heading">
                  <span>步骤 3</span>
                  <h2 id="chatgpt-wizard-title">安全登录您的 ChatGPT 账号</h2>
                  <p>
                    通过 ChatGPT 官方授权确认账号。我们不会要求您复制会话
                    JSON，也不会接触您的访问令牌。
                  </p>
                </div>
                <div className="safe-login-card">
                  <div className="browser-chrome" aria-hidden="true">
                    <span /><span /><span />
                    <b>https://chatgpt.com</b>
                  </div>
                  <div className="safe-login-content">
                    <span className="chatgpt-app-icon" aria-hidden="true">◎</span>
                    <span>
                      <strong>ChatGPT</strong>
                      <small>使用官方授权安全确认账号</small>
                    </span>
                    {chatGPTUser ? (
                      <span className="signed-in-badge">已登录</span>
                    ) : (
                      <a href={signInPath}>安全登录 ↗</a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="wizard-page account-confirm-page">
                <div className="wizard-heading">
                  <span>步骤 4</span>
                  <h2 id="chatgpt-wizard-title">请确认您的 ChatGPT 账户邮箱</h2>
                  <p>邮箱由 ChatGPT 安全授权返回，仅用于本次订阅订单。</p>
                </div>
                <div className="confirmed-email">
                  {chatGPTUser?.email ?? "尚未登录 ChatGPT"}
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="wizard-page checkout-wizard-page">
                <div className="checkout-summary">
                  <span>MeVerse</span>
                  <small>支付金额</small>
                  <strong>${selectedTier.price} USD</strong>
                  <dl>
                    <div><dt>商品</dt><dd>{selectedTier.title}</dd></div>
                    <div><dt>账户</dt><dd>{chatGPTUser?.email}</dd></div>
                  </dl>
                </div>
                <div className="payment-methods">
                  <label>
                    国家或地区
                    <select defaultValue="CN"><option value="CN">中国</option></select>
                  </label>
                  <h3>支付方式</h3>
                  <button
                    type="button"
                    className="pay-method selected"
                    onClick={() => onNotice("微信支付暂未开放")}
                  >
                    微信支付 <span>支付 ${selectedTier.price} USD</span>
                  </button>
                  <button
                    type="button"
                    className="pay-method"
                    onClick={() => onNotice("支付宝暂未开放")}
                  >
                    银行卡
                  </button>
                </div>
              </div>
            )}

            {step < 5 && (
              <div className="wizard-footer">
                <button
                  type="button"
                  className="wizard-back"
                  disabled={step === 1}
                  onClick={() => setStep((current) => Math.max(1, current - 1))}
                >
                  上一步
                </button>
                {step === 3 && !chatGPTUser ? (
                  <a className="wizard-next" href={signInPath}>安全登录 ChatGPT</a>
                ) : (
                  <button
                    type="button"
                    className="wizard-next"
                    onClick={() => {
                      if (step === 4) startPayment();
                      else setStep((current) => Math.min(5, current + 1));
                    }}
                  >
                    {step === 3
                      ? "已登录，下一步"
                      : step === 4
                        ? "确认并前往支付"
                        : "下一步"}
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
