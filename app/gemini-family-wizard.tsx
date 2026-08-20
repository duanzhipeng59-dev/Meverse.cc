"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import qrcode from "qrcode-generator";
import { useLanguage } from "./language-context";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type GeminiBillingMode = "monthly" | "annual";
type MonthlyDuration = 1 | 3 | 6;

export type InitialGeminiPayment = {
  orderNo: string;
  accessToken: string;
};

type PaymentResult = {
  status: "pending" | "paid" | "fulfilled" | "failed";
  billingMode: GeminiBillingMode;
  durationMonths: number;
  productName: string;
  amount: string;
  deliveryEmail: string;
  region: string | null;
  accountEmail?: string;
  accountPassword?: string;
};

const MONTHLY_OPTIONS: Array<{
  months: MonthlyDuration;
  price: string;
}> = [
  { months: 1, price: "19.9" },
  { months: 3, price: "49.9" },
  { months: 6, price: "89.9" },
];

const ANNUAL_PRICE = "145";
const REGION_KEYS = [
  "us",
  "uk",
  "jp",
  "sg",
  "my",
  "hk",
  "tw",
  "ca",
  "au",
] as const;

export default function GeminiFamilyWizard({
  accountEmail,
  initialBillingMode,
  initialPayment,
  onClose,
  onRequireAccount,
}: {
  accountEmail: string | null;
  initialBillingMode: GeminiBillingMode;
  initialPayment?: InitialGeminiPayment | null;
  onClose: () => void;
  onRequireAccount: (billingMode: GeminiBillingMode) => void;
}) {
  const { t } = useLanguage();
  const [step, setStep] = useState(initialPayment ? 3 : 1);
  const [billingMode, setBillingMode] =
    useState<GeminiBillingMode>(initialBillingMode);
  const [monthlyDuration, setMonthlyDuration] =
    useState<MonthlyDuration>(1);
  const [email, setEmail] = useState("");
  const [region, setRegion] = useState("");
  const [regionConfirmed, setRegionConfirmed] = useState(false);
  const [validationMessage, setValidationMessage] = useState("");
  const [processingPayment, setProcessingPayment] = useState(
    Boolean(initialPayment),
  );
  const [paymentError, setPaymentError] = useState("");
  const [annualStock, setAnnualStock] = useState<number | null>(null);
  const [deliveredAccount, setDeliveredAccount] = useState<{
    email: string;
    password: string;
  } | null>(null);
  const [providerCheckout, setProviderCheckout] = useState<{
    checkoutUrl: string;
    qrContent: string;
    orderNo: string;
    accessToken: string;
  } | null>(null);
  const accountFormRef = useRef<HTMLFormElement>(null);
  const selectedMonthlyOption =
    MONTHLY_OPTIONS.find((option) => option.months === monthlyDuration) ??
    MONTHLY_OPTIONS[0];
  const selectedPrice =
    billingMode === "annual" ? ANNUAL_PRICE : selectedMonthlyOption.price;
  const selectedProduct =
    billingMode === "annual"
      ? t("gemini.product.annual")
      : t("gemini.product.monthly", { months: monthlyDuration });
  const deliveryEmail = billingMode === "annual" ? accountEmail : email;
  const paymentToCheck = initialPayment ?? providerCheckout;
  const qrDataUrl = useMemo(() => {
    if (!providerCheckout?.qrContent) return null;
    const code = qrcode(0, "M");
    code.addData(providerCheckout.qrContent);
    code.make();
    return code.createDataURL(7, 4);
  }, [providerCheckout]);

  useEffect(() => {
    let active = true;
    fetch("/api/payments/epay/stock", { cache: "no-store" })
      .then((response) => response.json() as Promise<{ stock?: number }>)
      .then((result) => {
        if (active && Number.isInteger(result.stock)) {
          setAnnualStock(Math.max(0, result.stock ?? 0));
        }
      })
      .catch(() => {
        if (active) setAnnualStock(0);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!paymentToCheck) return;
    const payment = paymentToCheck;
    let active = true;
    let timer: number | undefined;
    let attempts = 0;

    async function checkPayment() {
      try {
        const params = new URLSearchParams({
          order: payment.orderNo,
          token: payment.accessToken,
        });
        const response = await fetch(`/api/payments/epay/status?${params}`, {
          cache: "no-store",
        });
        const result = (await response.json()) as PaymentResult & {
          error?: string;
        };
        if (!active) return;
        if (!response.ok) {
          setProcessingPayment(false);
          setPaymentError("gemini.error.order_status");
          return;
        }

        setBillingMode(result.billingMode);
        if ([1, 3, 6].includes(result.durationMonths)) {
          setMonthlyDuration(result.durationMonths as MonthlyDuration);
        }
        setEmail(result.deliveryEmail ?? "");
        setRegion(result.region ?? "");
        if (result.status === "paid" || result.status === "fulfilled") {
          if (result.accountEmail && result.accountPassword) {
            setDeliveredAccount({
              email: result.accountEmail,
              password: result.accountPassword,
            });
          }
          setProcessingPayment(false);
          setStep(4);
          window.history.replaceState({}, "", "/subscribe");
          return;
        }
        if (result.status === "failed") {
          setProcessingPayment(false);
          setPaymentError("gemini.error.payment_failed");
          return;
        }
        attempts += 1;
        if (attempts >= 60) {
          setProcessingPayment(false);
          setPaymentError("gemini.error.payment_pending");
          return;
        }
        timer = window.setTimeout(checkPayment, 3000);
      } catch {
        if (!active) return;
        attempts += 1;
        if (attempts < 60) timer = window.setTimeout(checkPayment, 3000);
        else {
          setProcessingPayment(false);
          setPaymentError("gemini.error.payment_check");
        }
      }
    }

    void checkPayment();
    return () => {
      active = false;
      if (timer) window.clearTimeout(timer);
    };
  }, [paymentToCheck]);

  function close() {
    setProcessingPayment(false);
    onClose();
  }

  function continueFromEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim();
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setValidationMessage("gemini.error.invalid_email");
      return;
    }
    const normalizedRegion = region.trim();
    if (!normalizedRegion) {
      setValidationMessage("gemini.error.region_required");
      return;
    }
    if (!regionConfirmed) {
      setValidationMessage("gemini.error.region_confirm_required");
      return;
    }
    setEmail(normalizedEmail);
    setRegion(normalizedRegion);
    setValidationMessage("");
    setStep(3);
  }

  function continueFromSelection() {
    if (!accountEmail) {
      onRequireAccount(billingMode);
      return;
    }
    if (billingMode === "annual") {
      setStep(3);
      return;
    }
    setStep(2);
  }

  async function startPayment() {
    setProcessingPayment(true);
    setPaymentError("");
    try {
      const response = await fetch("/api/payments/epay/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          billingMode,
          monthlyDuration,
          email,
          region,
        }),
      });
      const result = (await response.json()) as {
        checkoutUrl?: string;
        qrContent?: string;
        orderNo?: string;
        accessToken?: string;
        error?: string;
      };
      if (
        !response.ok ||
        !result.checkoutUrl ||
        !result.qrContent ||
        !result.orderNo ||
        !result.accessToken
      ) {
        const message =
          result.error === "out_of_stock"
            ? "gemini.error.out_of_stock"
            : result.error === "login_required"
              ? "gemini.error.login_required"
              : "gemini.error.payment_unavailable";
        setPaymentError(message);
        setProcessingPayment(false);
        return;
      }
      setProviderCheckout({
        checkoutUrl: result.checkoutUrl,
        qrContent: result.qrContent,
        orderNo: result.orderNo,
        accessToken: result.accessToken,
      });
      setProcessingPayment(false);
      setStep(5);
    } catch {
      setProcessingPayment(false);
      setPaymentError("gemini.error.payment_network");
    }
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
        className="chatgpt-wizard gemini-family-wizard"
        role="dialog"
        aria-modal="true"
        aria-labelledby="gemini-family-wizard-title"
        onKeyDown={(event) => {
          if (event.key === "Escape") close();
        }}
      >
        <button
          className="wizard-close"
          type="button"
          aria-label={t("gemini.close")}
          onClick={close}
        >
          ×
        </button>

        {processingPayment ? (
          <div className="payment-processing" aria-live="polite">
            <h2>{t("gemini.processing.title")}</h2>
            <div className="processing-list">
              <div className="processing-row active">
                <span className="spinner" aria-hidden="true" />
                <span>
                  <strong>{t("gemini.processing.waiting")}</strong>
                  <small>{t("gemini.processing.keep_open")}</small>
                </span>
              </div>
              <div className="processing-line" />
              <div className="processing-row">
                <span className="empty-status" aria-hidden="true" />
                <strong>
                  {billingMode === "annual"
                    ? t("gemini.processing.deliver_account")
                    : t("gemini.processing.confirm_family")}
                </strong>
              </div>
            </div>
          </div>
        ) : (
          <>
            {step === 1 && (
              <div className="wizard-page family-plan-page">
                <div className="wizard-heading">
                  <span>{t("gemini.step", { step: 1 })}</span>
                  <h2 id="gemini-family-wizard-title">
                    {t("gemini.selection.title")}
                  </h2>
                  <p>{t("gemini.selection.description")}</p>
                </div>

                <div
                  className="family-billing-toggle"
                  role="tablist"
                  aria-label={t("gemini.selection.billing_label")}
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={billingMode === "monthly"}
                    className={billingMode === "monthly" ? "selected" : ""}
                    onClick={() => setBillingMode("monthly")}
                  >
                    {t("gemini.selection.monthly")}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={billingMode === "annual"}
                    className={billingMode === "annual" ? "selected" : ""}
                    onClick={() => setBillingMode("annual")}
                  >
                    {t("gemini.selection.annual")}
                  </button>
                </div>

                <div className="family-duration-grid">
                  {billingMode === "monthly" ? (
                    MONTHLY_OPTIONS.map((option) => (
                      <button
                        type="button"
                        key={option.months}
                        className={
                          monthlyDuration === option.months
                            ? "family-tier-card selected"
                            : "family-tier-card"
                        }
                        aria-pressed={monthlyDuration === option.months}
                        onClick={() => setMonthlyDuration(option.months)}
                      >
                        <span className="gemini-mark" aria-hidden="true">✦</span>
                        <small>{t("gemini.family_group")}</small>
                        <strong>
                          {t("gemini.duration.months", {
                            months: option.months,
                          })}
                        </strong>
                        <b>¥{option.price}</b>
                      </button>
                    ))
                  ) : (
                    <button
                      type="button"
                      className="family-tier-card annual selected"
                      aria-pressed="true"
                    >
                      <span className="gemini-mark" aria-hidden="true">✦</span>
                      <small>{t("gemini.ready_account")}</small>
                      <strong>{t("gemini.duration.year")}</strong>
                      <b>¥{ANNUAL_PRICE}</b>
                      <span className="family-stock">
                        {t("gemini.stock", {
                          stock:
                            annualStock ?? t("gemini.stock_loading"),
                        })}
                      </span>
                      <em>{t("gemini.annual.delivery")}</em>
                    </button>
                  )}
                </div>
              </div>
            )}

            {step === 2 && (
              <form
                ref={accountFormRef}
                id="family-account-form"
                className="wizard-page family-account-page"
                onSubmit={continueFromEmail}
              >
                <div className="wizard-heading">
                  <span>{t("gemini.step", { step: 2 })}</span>
                  <h2 id="gemini-family-wizard-title">
                    {t("gemini.account.title")}
                  </h2>
                  <p>{t("gemini.account.description")}</p>
                </div>

                <div className="family-account-grid">
                  <div className="family-email-card">
                    <div className="family-field-group">
                      <label htmlFor="family-email">
                        {t("gemini.account.email_label")}
                      </label>
                      <input
                        id="family-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(event) => {
                          setEmail(event.target.value);
                          setValidationMessage("");
                        }}
                        placeholder="name@gmail.com"
                      />
                      <small>{t("gemini.account.email_help")}</small>
                    </div>

                    <div className="family-field-group">
                      <label htmlFor="family-region">
                        {t("gemini.account.region_label")}
                      </label>
                      <input
                        id="family-region"
                        name="region"
                        list="family-region-options"
                        value={region}
                        onChange={(event) => {
                          setRegion(event.target.value);
                          setRegionConfirmed(false);
                          setValidationMessage("");
                        }}
                        placeholder={t("gemini.account.region_placeholder")}
                      />
                      <datalist id="family-region-options">
                        {REGION_KEYS.map((regionKey) => (
                          <option
                            key={regionKey}
                            value={t(`gemini.region.${regionKey}`)}
                          />
                        ))}
                      </datalist>
                      <small>{t("gemini.account.region_help")}</small>
                    </div>
                  </div>

                  <aside className="region-guide" aria-labelledby="region-guide-title">
                    <span className="region-guide-icon" aria-hidden="true">◎</span>
                    <div>
                      <h3 id="region-guide-title">
                        {t("gemini.region_guide.title")}
                      </h3>
                      <p>{t("gemini.region_guide.description")}</p>
                      <ol>
                        <li>
                          {t("gemini.region_guide.open")}
                          <a
                            href="https://play.google.com/"
                            target="_blank"
                            rel="noreferrer"
                          >
                            Google Play ↗
                          </a>
                        </li>
                        <li>{t("gemini.region_guide.scroll")}</li>
                        <li>{t("gemini.region_guide.match")}</li>
                      </ol>
                    </div>
                  </aside>
                </div>

                <label className="region-confirmation">
                  <input
                    type="checkbox"
                    checked={regionConfirmed}
                    onChange={(event) => {
                      setRegionConfirmed(event.target.checked);
                      setValidationMessage("");
                    }}
                  />
                  <span>{t("gemini.region_confirmation")}</span>
                </label>

                {validationMessage ? (
                  <p className="family-validation" role="alert">
                    {t(validationMessage)}
                  </p>
                ) : null}
              </form>
            )}

            {step === 3 && (
              <div className="wizard-page checkout-wizard-page family-checkout-page">
                <div className="checkout-summary">
                  <span>WildGPT</span>
                  <small>{t("gemini.checkout.amount")}</small>
                  <strong>¥{selectedPrice} CNY</strong>
                  <dl>
                    <div>
                      <dt>{t("gemini.checkout.product")}</dt>
                      <dd>{selectedProduct}</dd>
                    </div>
                    <div>
                      <dt>
                        {billingMode === "annual"
                          ? t("gemini.checkout.delivery_email")
                          : t("gemini.checkout.invitation_email")}
                      </dt>
                      <dd>{deliveryEmail}</dd>
                    </div>
                    {billingMode === "monthly" ? (
                      <div>
                        <dt>{t("gemini.checkout.account_region")}</dt>
                        <dd>{region}</dd>
                      </div>
                    ) : null}
                  </dl>
                </div>
                <div className="payment-methods">
                  <div className="family-payment-heading">
                    <div>
                      <span>{t("gemini.checkout.cashier")}</span>
                      <h3>{t("gemini.checkout.select_payment")}</h3>
                    </div>
                    <span className="family-payment-count">
                      {t("gemini.checkout.available_count")}
                    </span>
                  </div>
                  <div
                    className="pay-method selected"
                    aria-label={t("gemini.checkout.alipay_selected_aria")}
                  >
                    <span className="alipay-mark" aria-hidden="true">
                      {t("gemini.checkout.alipay_mark")}
                    </span>
                    <span className="pay-method-copy">
                      <strong>{t("gemini.checkout.alipay")}</strong>
                      <small>{t("gemini.checkout.alipay_tagline")}</small>
                    </span>
                    <span className="pay-method-selected">
                      <span aria-hidden="true">✓</span>
                      {t("gemini.checkout.selected")}
                    </span>
                  </div>
                  <p className="family-payment-note">
                    <span aria-hidden="true">✓</span>
                    {t("gemini.checkout.payment_note")}
                  </p>
                  {paymentError ? (
                    <p className="family-payment-error" role="alert">
                      {t(paymentError)}
                    </p>
                  ) : null}
                  <div className="family-payment-actions">
                    <button
                      className="family-payment-back"
                      type="button"
                      onClick={() => setStep(billingMode === "annual" ? 1 : 2)}
                    >
                      {t("gemini.back")}
                    </button>
                    <button
                      className="family-demo-pay"
                      type="button"
                      onClick={startPayment}
                    >
                      <span>{t("gemini.checkout.pay_with_alipay")}</span>
                      <strong>¥{selectedPrice}</strong>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="wizard-page family-success-page">
                <span className="success-ring" aria-hidden="true">✓</span>
                <span className="family-success-kicker">
                  {t("gemini.success.paid")}
                </span>
                {billingMode === "annual" ? (
                  <>
                    <h2 id="gemini-family-wizard-title">
                      {t("gemini.success.annual_title")}
                    </h2>
                    {deliveredAccount ? (
                      <dl className="delivered-account-card">
                        <div>
                          <dt>{t("gemini.success.account")}</dt>
                          <dd>{deliveredAccount.email}</dd>
                        </div>
                        <div>
                          <dt>{t("gemini.success.password")}</dt>
                          <dd>{deliveredAccount.password}</dd>
                        </div>
                      </dl>
                    ) : (
                      <p>{t("gemini.success.account_pending")}</p>
                    )}
                    <small>{t("gemini.success.account_security")}</small>
                  </>
                ) : (
                  <>
                    <h2 id="gemini-family-wizard-title">
                      {t("gemini.success.monthly_title")}
                    </h2>
                    <p>
                      {t("gemini.success.invite_prefix")}
                      <strong>{email}</strong>
                      {t("gemini.success.invite_suffix")}
                    </p>
                    <small>{t("gemini.success.invite_help")}</small>
                  </>
                )}
                <button className="family-done" type="button" onClick={close}>
                  {t("gemini.done")}
                </button>
              </div>
            )}

            {step === 5 && providerCheckout && qrDataUrl && (
              <div className="wizard-page family-qr-page">
                <div className="wizard-heading">
                  <span>{t("gemini.checkout.cashier")}</span>
                  <h2 id="gemini-family-wizard-title">
                    {t("gemini.qr.title")}
                  </h2>
                  <p>{t("gemini.qr.description")}</p>
                </div>
                <div className="family-qr-card">
                  <div className="family-qr-image">
                    <Image
                      unoptimized
                      src={qrDataUrl}
                      alt={t("gemini.qr.alt")}
                      width={278}
                      height={278}
                    />
                  </div>
                  <strong>¥{selectedPrice}</strong>
                  <span>{t("gemini.qr.scan")}</span>
                  <a
                    href={providerCheckout.checkoutUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t("gemini.qr.open_alipay")}
                  </a>
                  <small>{t("gemini.qr.auto_confirm")}</small>
                </div>
                {paymentError ? (
                  <p className="family-payment-error" role="alert">
                    {t(paymentError)}
                  </p>
                ) : null}
                <button
                  className="family-qr-back"
                  type="button"
                  onClick={() => {
                    setProviderCheckout(null);
                    setPaymentError("");
                    setStep(3);
                  }}
                >
                  {t("gemini.qr.back")}
                </button>
              </div>
            )}

            {step < 3 && (
              <div className="wizard-footer">
                <button
                  type="button"
                  className="wizard-back"
                  disabled={step === 1}
                  onClick={() => setStep((current) => Math.max(1, current - 1))}
                >
                  {t("gemini.back")}
                </button>
                <button
                  type="button"
                  className="wizard-next"
                  onClick={() => {
                    if (step === 1) continueFromSelection();
                    else accountFormRef.current?.requestSubmit();
                  }}
                >
                  {t("gemini.next")}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
