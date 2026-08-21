"use client";

import { useCallback, useEffect, useState } from "react";
import { useLanguage } from "./language-context";
import { OrdersSkeletonRows } from "./orders-skeleton";
import {
  DesktopSidebar,
  MobileNavigation,
  SiteHeader,
  Toast,
} from "./site-chrome";

type OrderCategory = "ai" | "accounts" | "sms";

const orderCategoryKeys: Record<OrderCategory, string> = {
  ai: "orders.tab.ai",
  accounts: "orders.tab.accounts",
  sms: "orders.tab.sms",
};

const visibleOrderCategories: OrderCategory[] = ["ai"];

const emptyMessages: Record<OrderCategory, string> = {
  ai: "orders.empty.ai",
  accounts: "orders.empty.accounts",
  sms: "orders.empty.sms",
};

type PaymentOrder = {
  out_trade_no: string;
  billing_mode: "monthly" | "annual";
  duration_months: number;
  product_name: string;
  amount: string | number;
  payment_type: "alipay" | "wxpay";
  delivery_email: string;
  account_region: string | null;
  status: "pending" | "paid" | "fulfilled" | "failed" | "cancelled" | "returned";
  created_at: string;
  paid_at: string | null;
  fulfilled_at: string | null;
  cancelled_at: string | null;
  returned_at: string | null;
  return_reason: string | null;
};

const statusKeys: Record<PaymentOrder["status"], string> = {
  pending: "orders.status.pending",
  paid: "orders.status.paid",
  fulfilled: "orders.status.fulfilled",
  failed: "orders.status.failed",
  cancelled: "orders.status.cancelled",
  returned: "orders.status.returned",
};

async function requestOrders() {
  const response = await fetch("/api/orders", { cache: "no-store" });
  const result = (await response.json()) as {
    orders?: PaymentOrder[];
    error?: string;
  };
  return { response, result };
}

export default function OrdersPage() {
  const { lang, t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<OrderCategory>("ai");
  const [toast, setToast] = useState("");
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loadError, setLoadError] = useState<"" | "login" | "unavailable">("");
  const [selectedOrder, setSelectedOrder] = useState<PaymentOrder | null>(null);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  }

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const { response, result } = await requestOrders();
      if (!response.ok) {
        setOrders([]);
        setLoadError(result.error === "login_required" ? "login" : "unavailable");
        return;
      }
      setOrders(result.orders ?? []);
    } catch {
      setOrders([]);
      setLoadError("unavailable");
    } finally {
      setLoading(false);
      setHasLoaded(true);
    }
  }, []);

  useEffect(() => {
    let active = true;
    requestOrders()
      .then(({ response, result }) => {
        if (!active) return;
        if (!response.ok) {
          setOrders([]);
          setLoadError(
            result.error === "login_required" ? "login" : "unavailable",
          );
          return;
        }
        setOrders(result.orders ?? []);
      })
      .catch(() => {
        if (active) {
          setOrders([]);
          setLoadError("unavailable");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
          setHasLoaded(true);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const visibleOrders = orders;

  // First entry shows the skeleton while orders load; manual refresh keeps
  // the current rows visible and only spins the refresh button.
  const showSkeleton = loading && (visibleOrders.length === 0 || !hasLoaded);
  const showError =
    !showSkeleton && Boolean(loadError) && visibleOrders.length === 0;
  const showEmpty = !showSkeleton && !showError && visibleOrders.length === 0;

  function formatOrderDate(value: string) {
    return new Intl.DateTimeFormat(lang === "zh" ? "zh-CN" : "en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(value));
  }

  async function copyOrderNumber(orderNo: string) {
    await navigator.clipboard.writeText(orderNo);
    showToast(t("orders.order_no_copied"));
  }

  return (
    <div className="site-shell orders-shell">
      <SiteHeader />

      <div className="page-layout orders-layout">
        <DesktopSidebar
          active="orders"
          ariaLabel="订单导航"
          className="sidebar orders-sidebar"
        />

        <main className="orders-main">
          <div className="orders-heading">
            <h1>{t("nav.orders")}</h1>
          </div>

          <div className="orders-toolbar">
            <div className="order-tabs" role="tablist" aria-label="订单分类">
              {visibleOrderCategories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    role="tab"
                    aria-selected={activeCategory === category}
                    className={activeCategory === category ? "active" : ""}
                    onClick={() => setActiveCategory(category)}
                  >
                    {t(orderCategoryKeys[category])}
                  </button>
                ))}
            </div>
            <button
              className="refresh-orders"
              type="button"
              disabled={loading}
              onClick={async () => {
                await loadOrders();
                showToast(t("toast.orders_refreshed"));
              }}
            >
              <span
                className={loading && hasLoaded ? "refresh-icon-spin" : undefined}
                aria-hidden="true"
              >
                ↻
              </span>
              {t("orders.refresh")}
            </button>
          </div>

          <section
            className={`orders-table ${activeCategory}`}
            aria-label={`${t(orderCategoryKeys[activeCategory])}${t("nav.orders")}`}
          >
            <div className="orders-table-head">
              <span>
                {activeCategory === "ai"
                  ? t("orders.col.order_type")
                  : t("orders.col.product")}
              </span>
              <span>
                {activeCategory === "ai"
                  ? t("orders.col.order_created")
                  : t("orders.col.order_no")}
              </span>
              <span>{t("orders.col.amount")}</span>
              <span>{t("orders.col.status")}</span>
              <span>{t("orders.col.action")}</span>
            </div>
            {showSkeleton ? (
              <OrdersSkeletonRows />
            ) : showError ? (
              <div className="empty-category-body orders-state-message">
                {loadError === "login"
                  ? t("orders.login_required")
                  : t("orders.unavailable")}
              </div>
            ) : showEmpty ? (
              <div className="empty-category-body orders-state-message">
                {t(emptyMessages[activeCategory])}
              </div>
            ) : (
              visibleOrders.map((order) => (
                <article className="order-row" key={order.out_trade_no}>
                  <div className="order-product">
                    <div className="order-title-line">
                      <strong>{order.product_name}</strong>
                      <span className="duration-badge">
                        {order.duration_months} {t("orders.months")}
                      </span>
                    </div>
                    <span className="order-delivery">
                      {`${t("orders.delivery.email")} ${order.delivery_email}`}
                    </span>
                  </div>
                  <div className="order-number">
                    <span>{order.out_trade_no}</span>
                    <small>{formatOrderDate(order.created_at)}</small>
                  </div>
                  <strong className="order-price">
                    ¥{Number(order.amount).toFixed(2)}
                  </strong>
                  <span className={`order-status ${order.status}`}>
                    {t(statusKeys[order.status])}
                  </span>
                  <button
                    className="invoice-button"
                    type="button"
                    onClick={() => setSelectedOrder(order)}
                  >
                    {t("orders.view_details")}
                  </button>
                </article>
              ))
            )}
          </section>
          <p className="order-count">
            {t("total.records", { n: visibleOrders.length })}
          </p>
        </main>
      </div>

      <MobileNavigation
        active="orders"
        className="mobile-nav orders-mobile-nav"
      />

      {selectedOrder ? (
        <div
          className="order-detail-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedOrder(null);
          }}
        >
          <section
            className="order-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-detail-title"
          >
            <button
              className="order-detail-close"
              type="button"
              aria-label={t("orders.detail.close")}
              onClick={() => setSelectedOrder(null)}
            >
              ×
            </button>
            <span>{t("orders.detail.eyebrow")}</span>
            <h2 id="order-detail-title">{selectedOrder.product_name}</h2>
            <dl>
              <div><dt>{t("orders.col.order_no")}</dt><dd>{selectedOrder.out_trade_no}</dd></div>
              <div><dt>{t("orders.detail.period")}</dt><dd>{selectedOrder.duration_months} {t("orders.months")}</dd></div>
              <div><dt>{t("orders.delivery.email")}</dt><dd>{selectedOrder.delivery_email}</dd></div>
              <div><dt>{t("orders.detail.region")}</dt><dd>{selectedOrder.account_region || "—"}</dd></div>
              <div><dt>{t("orders.col.amount")}</dt><dd>¥{Number(selectedOrder.amount).toFixed(2)}</dd></div>
              <div><dt>{t("orders.col.status")}</dt><dd><span className={`order-status ${selectedOrder.status}`}>{t(statusKeys[selectedOrder.status])}</span></dd></div>
            </dl>
            {selectedOrder.status === "paid" ? (
              <p className="order-detail-notice">{t("orders.detail.awaiting_fulfillment")}</p>
            ) : null}
            {selectedOrder.status === "fulfilled" ? (
              <p className="order-detail-notice success">{t("orders.detail.check_inbox")}</p>
            ) : null}
            {selectedOrder.status === "returned" && selectedOrder.return_reason ? (
              <div className="order-return-reason"><strong>{t("orders.detail.return_reason")}</strong><p>{selectedOrder.return_reason}</p></div>
            ) : null}
            <button
              className="order-detail-copy"
              type="button"
              onClick={() => void copyOrderNumber(selectedOrder.out_trade_no)}
            >
              {t("orders.copy_order_no")}
            </button>
          </section>
        </div>
      ) : null}

      <Toast>{toast}</Toast>
    </div>
  );
}
