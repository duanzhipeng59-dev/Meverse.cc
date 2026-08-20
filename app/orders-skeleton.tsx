"use client";

import { useLanguage } from "./language-context";

const SKELETON_ROWS = 4;

export function OrdersSkeletonRows() {
  const { t } = useLanguage();

  return (
    <div className="orders-skeleton" role="status" aria-label={t("orders.loading")}>
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <div className="skeleton-row" aria-hidden="true" key={index}>
          <span className="skeleton-bar bar-wide" />
          <span className="skeleton-bar bar-med" />
          <span className="skeleton-bar bar-short" />
          <span className="skeleton-bar bar-short" />
          <span className="skeleton-bar bar-short" />
        </div>
      ))}
    </div>
  );
}
