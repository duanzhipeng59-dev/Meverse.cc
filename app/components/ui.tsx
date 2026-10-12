"use client";

// 统一基础组件库:全站唯一实现,页面不得重复造轮子。
// 约定:触控区 ≥44px;过渡 150-250ms;prefers-reduced-motion 时关闭非必要动画;
// 列表异步五态由 <Skeleton>/<EmptyState>/<ErrorState> 组合覆盖(idle 由页面状态控制)。
import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";

/* ── Button / IconButton ── */
export function Button({ variant = "primary", size = "md", loading = false, children, className = "", ...rest }: {
  variant?: "primary" | "ghost" | "danger";
  size?: "sm" | "md";
  loading?: boolean;
  children: ReactNode;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`mf-ui-btn is-${variant}${size === "sm" ? " is-sm" : ""}${loading ? " is-loading" : ""} ${className}`}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {loading ? <span className="mf-ui-btn-spinner" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

export function IconButton({ label, children, className = "", ...rest }: {
  label: string;
  children: ReactNode;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`mf-ui-iconbtn ${className}`} aria-label={label} {...rest}>
      {children}
    </button>
  );
}

/* ── Tag ── */
export function Tag({ tone = "default", children }: { tone?: "default" | "good" | "warn" | "bad"; children: ReactNode }) {
  return <span className={`mf-ui-tag is-${tone}`}>{children}</span>;
}

/* ── SearchInput:受控 + 常驻,回车/输入均回调 ── */
export function SearchInput({ value, onChange, placeholder = "搜索人物", onClear }: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  onClear?: () => void;
}) {
  return (
    <label className="mf-ui-search">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.6" /><path d="m16 16 4.5 4.5" /></svg>
      <input type="search" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} aria-label={placeholder} />
      {value ? (
        <button type="button" aria-label="清空搜索" onClick={() => { onChange(""); onClear?.(); }}>×</button>
      ) : null}
    </label>
  );
}

/* ── FilterBar:单选 chips ── */
export function FilterBar<T extends string>({ options, value, onChange, ariaLabel = "筛选" }: {
  options: Array<{ key: T; label: string }>;
  value: T;
  onChange: (next: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div className="mf-ui-filterbar" role="tablist" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          role="tab"
          aria-selected={value === option.key}
          className={value === option.key ? "is-active" : undefined}
          onClick={() => onChange(option.key)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/* ── Skeleton:行/块/肖像占位 ── */
export function Skeleton({ kind = "line", className = "" }: { kind?: "line" | "block" | "portrait"; className?: string }) {
  return <i className={`mf-ui-skel is-${kind} ${className}`} aria-hidden="true" />;
}

export function SkeletonList({ rows = 3, kind = "line" }: { rows?: number; kind?: "line" | "block" | "portrait" }) {
  return <div className="mf-ui-skel-list" aria-busy="true" aria-label="加载中">{Array.from({ length: rows }, (_, i) => <Skeleton kind={kind} key={i} />)}</div>;
}

/* ── EmptyState / ErrorState ── */
export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="mf-ui-state is-empty">
      <i aria-hidden="true">◌</i>
      <b>{title}</b>
      {hint ? <p>{hint}</p> : null}
      {action}
    </div>
  );
}

export function ErrorState({ title = "加载失败", detail, onRetry }: { title?: string; detail?: string; onRetry?: () => void }) {
  return (
    <div className="mf-ui-state is-error" role="alert">
      <i aria-hidden="true">⚠</i>
      <b>{title}</b>
      {detail ? <p>{detail}</p> : null}
      {onRetry ? <Button variant="ghost" size="sm" onClick={onRetry}>重试</Button> : null}
    </div>
  );
}

/* ── Toast:命令式外壳由页面挂 <ToastHost/>,发消息走 useToast ── */
type Toast = { id: number; text: string; tone: "info" | "good" | "bad" };
const ToastCtx = createContext<(text: string, tone?: Toast["tone"]) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastHost({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const seq = useRef(0);
  const push = (text: string, tone: Toast["tone"] = "info") => {
    const id = ++seq.current;
    setItems((prev) => [...prev, { id, text, tone }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 2400);
  };
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="mf-ui-toasts" aria-live="polite">
        {items.map((toast) => <div className={`mf-ui-toast is-${toast.tone}`} key={toast.id}>{toast.text}</div>)}
      </div>
    </ToastCtx.Provider>
  );
}

/* ── Dialog(桌面居中)/BottomSheet(移动):同一组件按视口自适配 ── */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="mf-ui-sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="mf-ui-sheet-mask" onClick={onClose} aria-hidden="true" />
      <div className="mf-ui-sheet-panel">
        <header>
          <b id={titleId}>{title}</b>
          <IconButton label="关闭" onClick={onClose}><svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg></IconButton>
        </header>
        <div className="mf-ui-sheet-body">{children}</div>
      </div>
    </div>
  );
}

/* ── ConfirmDialog:危险操作二次确认 ── */
export function ConfirmDialog({ open, title, message, confirmText = "确认", danger = true, onConfirm, onCancel }: {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Sheet open={open} onClose={onCancel} title={title}>
      <p className="mf-ui-confirm-msg">{message}</p>
      <div className="mf-ui-confirm-actions">
        <Button variant="ghost" onClick={onCancel}>取消</Button>
        <Button variant={danger ? "danger" : "primary"} onClick={onConfirm}>{confirmText}</Button>
      </div>
    </Sheet>
  );
}
