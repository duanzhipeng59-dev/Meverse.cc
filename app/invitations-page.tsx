"use client";

import { FormEvent, useEffect, useState } from "react";
import { useLanguage } from "./language-context";
import {
  DesktopSidebar,
  MobileNavigation,
  SiteHeader,
  Toast,
} from "./site-chrome";

const rewardTiers = [
  { people: "0–99 人", bonus: "$0 / 人", total: "$1 / 人" },
  { people: "100–199 人", bonus: "$1 / 人", total: "$2 / 人" },
  { people: "200–499 人", bonus: "$2 / 人", total: "$3 / 人" },
  { people: "500 人以上", bonus: "$3 / 人", total: "$4 / 人" },
];

export default function InvitationsPage() {
  const { t } = useLanguage();
  const [inviteCode, setInviteCode] = useState("ZAX75PFV");
  const [draftCode, setDraftCode] = useState(inviteCode);
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState("");
  const [showRules, setShowRules] = useState(true);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setShowRules(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  }

  function saveInviteCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextCode = draftCode.trim().toUpperCase();
    if (!nextCode) {
      showToast(t("invite.code.empty"));
      return;
    }
    setInviteCode(nextCode);
    setEditing(false);
    showToast(t("invite.code.updated"));
  }

  async function copyInviteLink() {
    const link = `${window.location.origin}/subscribe?invite=${inviteCode}`;
    try {
      await navigator.clipboard.writeText(link);
      showToast(t("invite.link.copied"));
    } catch {
      showToast(t("invite.link.format", { link }));
    }
  }

  return (
    <div className="site-shell invitations-shell">
      <SiteHeader />

      <div className="page-layout invitations-layout">
        <DesktopSidebar
          active="invitations"
          ariaLabel="账户导航"
          className="sidebar orders-sidebar"
        />

        <main className="invitations-main">
          <section className="invite-code-card">
            <div>
              <strong>{t("invite.code.label")}</strong>
              {editing ? (
                <form onSubmit={saveInviteCode} className="invite-code-form">
                  <input
                    value={draftCode}
                    onChange={(event) => setDraftCode(event.target.value)}
                    maxLength={12}
                    aria-label={t("invite.code.edit")}
                    autoFocus
                  />
                  <button type="submit">{t("invite.code.save")}</button>
                </form>
              ) : (
                <b>{inviteCode}</b>
              )}
            </div>
            <p>
              {t("invite.code.description")
                .split("\n")
                .map((line, i) => (
                  <span key={i}>
                    {i > 0 && <br />}
                    {line}
                  </span>
                ))}
            </p>
            <div className="invite-code-actions">
              <button type="button" onClick={copyInviteLink}>
                {t("invite.code.copy")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraftCode(inviteCode);
                  setEditing((current) => !current);
                }}
              >
                {editing
                  ? t("invite.code.cancel_edit")
                  : t("invite.code.edit")}
              </button>
            </div>
          </section>

          <section className="reward-card">
            <div className="reward-card-title">
              <h1>{t("invite.reward.title")}</h1>
              <button
                type="button"
                onClick={() => showToast(t("invite.reward.rules.toast"))}
              >
                {t("invite.reward.rules")}
              </button>
            </div>
            <div className="reward-grid">
              <div className="withdraw-summary">
                <span>{t("invite.reward.withdrawable")}</span>
                <strong>$0.00</strong>
                <div>
                  <button
                    type="button"
                    disabled
                    title={t("invite.reward.withdraw.disabled")}
                  >
                    {t("invite.reward.withdraw")}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      showToast(t("invite.reward.exchange.empty"))
                    }
                  >
                    {t("invite.reward.exchange")}
                  </button>
                </div>
                <small>{t("invite.reward.min_withdraw")}</small>
              </div>
              <div className="reward-stat">
                <strong>{t("invite.reward.count")}</strong>
                <dl>
                  <div>
                    <dt>{t("invite.reward.month_count")}</dt>
                    <dd>0</dd>
                  </div>
                  <div>
                    <dt>{t("invite.reward.total_count")}</dt>
                    <dd>0</dd>
                  </div>
                  <div>
                    <dt>{t("invite.reward.rewarded_count")}</dt>
                    <dd>0</dd>
                  </div>
                </dl>
              </div>
              <div className="reward-stat">
                <strong>{t("invite.reward.amount")}</strong>
                <dl>
                  <div>
                    <dt>{t("invite.reward.total_amount")}</dt>
                    <dd>$0.00</dd>
                  </div>
                  <div>
                    <dt>{t("invite.reward.withdrawable")}</dt>
                    <dd>$0.00</dd>
                  </div>
                  <div>
                    <dt>{t("invite.reward.pending_amount")}</dt>
                    <dd className="pending-amount">$0.00</dd>
                  </div>
                </dl>
              </div>
            </div>
          </section>

          <section className="invite-records-card">
            <h2>{t("invite.records.title")}</h2>
            <div className="invite-records-toolbar">
              <div className="invite-record-tabs">
                <button className="active" type="button">
                  {t("invite.records.tab.direct")}
                </button>
                <button
                  type="button"
                  onClick={() => showToast(t("invite.no_tier"))}
                >
                  {t("invite.records.tab.tier")}
                </button>
                <button
                  type="button"
                  onClick={() => showToast(t("invite.no_history"))}
                >
                  {t("invite.records.tab.history")}
                </button>
                <button
                  type="button"
                  onClick={() => showToast(t("invite.no_history_reward"))}
                >
                  {t("invite.records.tab.history_reward")}
                </button>
                <button
                  type="button"
                  onClick={() => showToast(t("invite.no_withdraw_history"))}
                >
                  {t("invite.records.tab.withdraw_history")}
                </button>
              </div>
              <div className="invite-filters">
                <button type="button">
                  {t("invite.records.filter.status")}⌄
                </button>
                <button type="button">
                  {t("invite.records.filter.month")}⌄
                </button>
              </div>
            </div>
            <div className="invite-record-table">
              <div className="invite-record-head">
                <span>{t("invite.records.col.date")}</span>
                <span>{t("invite.records.col.status")}</span>
                <span>{t("invite.records.col.email")}</span>
                <span>{t("invite.records.col.reward")}</span>
              </div>
              <div className="invite-record-empty">
                {t("invite.records.empty")}
              </div>
            </div>
            <p>{t("total.records", { n: 0 })}</p>
          </section>
        </main>
      </div>

      <MobileNavigation
        active="invitations"
        className="mobile-nav orders-mobile-nav"
      />

      {showRules && (
        <div
          className="modal-backdrop invite-rules-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowRules(false);
          }}
        >
          <section
            className="invite-rules-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="invite-rules-title"
          >
            <button
              className="close-button"
              type="button"
              onClick={() => setShowRules(false)}
              aria-label={t("invite.rules.close")}
              autoFocus
            >
              ×
            </button>

            <h1 id="invite-rules-title">{t("invite.rules.title")}</h1>

            <div className="invite-rules-intro">
              <h2>{t("invite.rules.tier_title")}</h2>
              <p>{t("invite.rules.tier_desc")}</p>
            </div>

            <div className="reward-tier-table">
              <div className="reward-tier-head">
                <span>{t("invite.rules.table.people")}</span>
                <span>{t("invite.rules.table.bonus")}</span>
                <span>{t("invite.rules.table.total")}</span>
              </div>
              {rewardTiers.map((tier) => (
                <div className="reward-tier-row" key={tier.people}>
                  <strong>{tier.people}</strong>
                  <span>{tier.bonus}</span>
                  <span>{tier.total}</span>
                </div>
              ))}
            </div>

            <div className="invite-rule-notes">
              <h2>{t("invite.rules.notes_title")}</h2>
              <p>{t("invite.rules.notes.line1")}</p>
              <p>{t("invite.rules.notes.line2")}</p>
            </div>

            <button
              className="acknowledge-rules"
              type="button"
              onClick={() => setShowRules(false)}
            >
              {t("invite.rules.acknowledge")}
            </button>
          </section>
        </div>
      )}

      <Toast>{toast}</Toast>
    </div>
  );
}
