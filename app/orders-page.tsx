"use client";

import { useState } from "react";
import { useLanguage } from "./language-context";
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

const visibleOrderCategories: OrderCategory[] = ["ai", "accounts"];

const emptyMessages: Record<OrderCategory, string> = {
  ai: "orders.empty.ai",
  accounts: "orders.empty.accounts",
  sms: "orders.empty.sms",
};

export default function OrdersPage() {
  const { t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<OrderCategory>("ai");
  const [toast, setToast] = useState("");

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
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
              onClick={() => showToast(t("toast.orders_refreshed"))}
            >
              <span aria-hidden="true">↻</span>
              {t("orders.refresh")}
            </button>
          </div>

          <section
            className={`orders-table empty-category-table ${activeCategory}`}
            aria-label={`${t(orderCategoryKeys[activeCategory])}${t("nav.orders")}`}
          >
            <div className="empty-category-head">
              {activeCategory === "sms" ? (
                <>
                  <span>{t("orders.col.country")}</span>
                  <span>{t("orders.col.order_time")}</span>
                  <span>{t("orders.col.status")}</span>
                  <span>{t("orders.col.action")}</span>
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
            <div className="empty-category-body">
              {t(emptyMessages[activeCategory])}
            </div>
          </section>
          <p className="order-count">
            {t("total.records", { n: 0 })}
          </p>
        </main>
      </div>

      <MobileNavigation
        active="orders"
        className="mobile-nav orders-mobile-nav"
      />

      <Toast>{toast}</Toast>
    </div>
  );
}
