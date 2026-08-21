"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";

type Order = {
  out_trade_no: string;
  billing_mode: "monthly" | "annual";
  duration_months?: number;
  product_name: string;
  amount: string | number;
  delivery_email: string;
  account_region?: string | null;
  status: "pending" | "paid" | "fulfilled" | "failed" | "cancelled" | "returned";
  return_reason?: string | null;
  created_at: string;
};

type InventoryItem = {
  id: string;
  account: string;
  status: "available" | "reserved" | "sold";
  reserved_order_no: string | null;
  created_at: string;
};

const NAV = [
  ["/admin", "概览", "⌂"],
  ["/admin/orders", "订单管理", "▤"],
  ["/admin/logs", "操作日志", "◷"],
] as const;

const STATUS_TEXT = {
  pending: "待支付",
  paid: "待发货",
  fulfilled: "已发货",
  failed: "失败",
  cancelled: "取消支付",
  returned: "已退回",
};

const ACTION_TEXT: Record<string, string> = {
  fulfill: "完成家庭组订单",
  return: "退回家庭组订单",
  add_note: "添加订单备注",
  inventory_add: "添加库存账号",
  inventory_reveal: "查看库存凭据",
};

async function readJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...init });
  const data = (await response.json()) as T & { error?: string };
  if (response.status === 401 || response.status === 403) {
    window.location.assign("/admin/login");
    throw new Error("admin_required");
  }
  if (!response.ok) throw new Error(data.error ?? "request_failed");
  return data;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function StatusBadge({ status }: { status: Order["status"] }) {
  return <span className={`admin-status admin-status-${status}`}>{STATUS_TEXT[status]}</span>;
}

function Empty({ children }: { children: ReactNode }) {
  return <div className="admin-empty">{children}</div>;
}

export function AdminConsole({ view }: { view: "dashboard" | "orders" | "inventory" | "logs" }) {
  const pathname = usePathname();
  const [adminEmail, setAdminEmail] = useState("");

  useEffect(() => {
    void readJson<{ admin: { email: string } }>("/api/admin/session")
      .then((result) => setAdminEmail(result.admin.email))
      .catch(() => undefined);
  }, []);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/admin/login");
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link className="admin-logo" href="/admin">WildGPT <span>Admin</span></Link>
        <nav>
          {NAV.map(([href, label, icon]) => (
            <Link key={href} href={href} className={pathname === href ? "active" : undefined}>
              <span aria-hidden="true">{icon}</span>{label}
            </Link>
          ))}
        </nav>
        <div className="admin-user">
          <span>{adminEmail ? adminEmail.slice(0, 1).toUpperCase() : "A"}</span>
          <div><strong>{adminEmail || "管理员"}</strong><small>超级管理员</small></div>
          <button type="button" onClick={() => void signOut()} aria-label="退出登录">↗</button>
        </div>
      </aside>
      <main className="admin-main">
        {view === "dashboard" ? <Dashboard /> : null}
        {view === "orders" ? <Orders /> : null}
        {view === "inventory" ? <Inventory /> : null}
        {view === "logs" ? <AuditLogs /> : null}
      </main>
    </div>
  );
}

function PageHeading({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return <header className="admin-page-heading"><p>{eyebrow}</p><h1>{title}</h1><span>{copy}</span></header>;
}

function Dashboard() {
  const [data, setData] = useState<{
    metrics: { totalOrders: number; pendingOrders: number; awaitingFulfillment: number; revenue: number; cancelledOrders: number };
    recentOrders: Order[];
  } | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    void readJson<typeof data>("/api/admin/dashboard").then(setData).catch(() => setError(true));
  }, []);
  return <>
    <PageHeading eyebrow="工作台" title="经营概览" copy="订单、支付和家庭组履约的实时情况。" />
    {error ? <Empty>数据暂时无法加载，请刷新重试。</Empty> : !data ? <div className="admin-loading">正在加载经营数据…</div> : <>
      <section className="admin-metrics">
        <article><span>累计收入</span><strong>¥{data.metrics.revenue.toFixed(2)}</strong><small>已支付及已完成订单</small></article>
        <article><span>全部订单</span><strong>{data.metrics.totalOrders}</strong><small>累计创建订单</small></article>
        <article><span>待发货</span><strong>{data.metrics.awaitingFulfillment}</strong><small>需要人工发送家庭组邀请</small></article>
        <article><span>取消支付</span><strong>{data.metrics.cancelledOrders}</strong><small>主动取消或超时订单</small></article>
      </section>
      <section className="admin-panel">
        <div className="admin-panel-title"><div><h2>最近订单</h2><p>最新创建的 8 笔订单</p></div><Link href="/admin/orders">查看全部</Link></div>
        <OrderTable orders={data.recentOrders} compact />
      </section>
    </>}
  </>;
}

function OrderTable({ orders, compact = false, onFulfill }: { orders: Order[]; compact?: boolean; onFulfill?: (order: Order) => void }) {
  if (!orders.length) return <Empty>暂无订单记录。</Empty>;
  return <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>订单</th><th>商品</th><th>客户</th><th>金额</th><th>状态</th><th>创建时间</th>{compact ? null : <th>操作</th>}</tr></thead><tbody>
    {orders.map((order) => <tr key={order.out_trade_no}>
      <td><strong>{order.out_trade_no}</strong><small>{`${order.duration_months ?? "-"} 个月家庭组`}</small></td>
      <td>{order.product_name}</td><td>{order.delivery_email}</td><td>¥{Number(order.amount).toFixed(2)}</td><td><StatusBadge status={order.status} /></td><td>{formatDate(order.created_at)}</td>
      {compact ? null : <td>{order.status === "paid" ? <button className="admin-row-action" type="button" onClick={() => onFulfill?.(order)}>处理订单</button> : order.status === "returned" && order.return_reason ? <span className="admin-return-reason" title={order.return_reason}>{order.return_reason}</span> : <span className="admin-muted">—</span>}</td>}
    </tr>)}
  </tbody></table></div>;
}

function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Order | null>(null);

  const load = useCallback(async (nextStatus = status, nextQuery = query) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: nextStatus, q: nextQuery });
      const result = await readJson<{ orders: Order[] }>(`/api/admin/orders?${params}`);
      setOrders(result.orders);
    } finally { setLoading(false); }
  }, [query, status]);

  useEffect(() => {
    void readJson<{ orders: Order[] }>("/api/admin/orders?status=all&q=")
      .then((result) => setOrders(result.orders))
      .finally(() => setLoading(false));
  }, []);
  async function fulfill(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const form = new FormData(event.currentTarget);
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const action = submitter?.value === "return" ? "return" : "fulfill";
    const returnReason = String(form.get("returnReason") ?? "").trim();
    if (action === "return" && !returnReason) {
      window.alert("请填写退回原因。");
      return;
    }
    await readJson(`/api/admin/orders/${encodeURIComponent(selected.out_trade_no)}`, {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action,
        note: String(form.get("note") ?? ""),
        returnReason,
      }),
    });
    setSelected(null); await load();
  }
  return <>
    <PageHeading eyebrow="订单" title="订单管理" copy="检索订单，发送家庭组邀请，或填写原因后退回订单。" />
    <section className="admin-panel">
      <div className="admin-toolbar">
        <form onSubmit={(event) => { event.preventDefault(); void load(); }}><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索订单号、邮箱或支付流水号" /><button type="submit">搜索</button></form>
        <select value={status} onChange={(event) => { setStatus(event.target.value); void load(event.target.value, query); }} aria-label="订单状态"><option value="all">全部状态</option><option value="pending">待支付</option><option value="paid">待发货</option><option value="fulfilled">已发货</option><option value="cancelled">取消支付</option><option value="returned">已退回</option><option value="failed">支付失败</option></select>
      </div>
      {loading ? <div className="admin-loading">正在加载订单…</div> : <OrderTable orders={orders} onFulfill={setSelected} />}
    </section>
    {selected ? <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}><section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="fulfill-title"><button className="admin-modal-close" type="button" onClick={() => setSelected(null)} aria-label="关闭">×</button><p>家庭组订单履约</p><h2 id="fulfill-title">处理已付款订单</h2><dl><div><dt>订单号</dt><dd>{selected.out_trade_no}</dd></div><div><dt>购买周期</dt><dd>{selected.duration_months} 个月</dd></div><div><dt>邀请邮箱</dt><dd>{selected.delivery_email}</dd></div><div><dt>账号地区</dt><dd>{selected.account_region || "未填写"}</dd></div></dl><form onSubmit={fulfill}><label>处理备注（选填）<textarea name="note" maxLength={1000} placeholder="例如：已发送邀请，等待用户加入" /></label><label>退回原因（选择退回时必填）<textarea name="returnReason" maxLength={1000} placeholder="例如：账号地区不匹配，暂时无法发送邀请" /></label><div className="admin-fulfillment-actions"><button className="admin-return-button" type="submit" value="return">退回订单</button><button className="admin-primary-button" type="submit" value="fulfill">确认已发货</button></div></form></section></div> : null}
  </>;
}

function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [revealed, setRevealed] = useState<{ email: string; password: string } | null>(null);
  const load = useCallback(async () => { setLoading(true); try { const result = await readJson<{ inventory: InventoryItem[] }>("/api/admin/inventory"); setItems(result.inventory); } finally { setLoading(false); } }, []);
  useEffect(() => {
    void readJson<{ inventory: InventoryItem[] }>("/api/admin/inventory")
      .then((result) => setItems(result.inventory))
      .finally(() => setLoading(false));
  }, []);
  async function add(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); await readJson("/api/admin/inventory", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: form.get("email"), password: form.get("password") }) }); setAdding(false); await load(); }
  async function reveal(id: string) { if (!window.confirm("查看操作会记录在审计日志中，是否继续？")) return; const result = await readJson<{ credentials: { email: string; password: string } }>(`/api/admin/inventory/${id}/reveal`, { method: "POST" }); setRevealed(result.credentials); }
  return <>
    <div className="admin-heading-row"><PageHeading eyebrow="库存" title="年付账号库存" copy="管理付款后自动发货的 Gemini 成品账号。" /><button className="admin-primary-button" type="button" onClick={() => setAdding(true)}>添加账号</button></div>
    <section className="admin-panel">{loading ? <div className="admin-loading">正在加载库存…</div> : !items.length ? <Empty>库存为空，请先添加年付账号。</Empty> : <div className="admin-inventory-grid">{items.map((item) => <article key={item.id}><div><span className={`admin-stock-dot ${item.status}`} /> <strong>{item.account}</strong></div><p>{item.status === "available" ? "可用" : item.status === "reserved" ? "已预留" : "已售出"}</p>{item.reserved_order_no ? <small>关联订单：{item.reserved_order_no}</small> : <small>入库：{formatDate(item.created_at)}</small>}<button type="button" onClick={() => void reveal(item.id)}>查看凭据</button></article>)}</div>}</section>
    {adding ? <div className="admin-modal-backdrop"><section className="admin-modal" role="dialog" aria-modal="true"><button className="admin-modal-close" type="button" onClick={() => setAdding(false)}>×</button><p>新增库存</p><h2>添加 Gemini 成品账号</h2><form onSubmit={add}><label>账号邮箱<input name="email" type="email" required /></label><label>账号密码<input name="password" type="password" minLength={6} required /></label><button className="admin-primary-button" type="submit">加密并保存</button></form></section></div> : null}
    {revealed ? <div className="admin-modal-backdrop"><section className="admin-modal admin-credentials" role="dialog" aria-modal="true"><button className="admin-modal-close" type="button" onClick={() => setRevealed(null)}>×</button><p>敏感信息</p><h2>账号凭据</h2><dl><div><dt>邮箱</dt><dd>{revealed.email}</dd></div><div><dt>密码</dt><dd>{revealed.password}</dd></div></dl><p className="admin-warning">请勿通过不安全渠道传播账号密码。</p></section></div> : null}
  </>;
}

function AuditLogs() {
  const [logs, setLogs] = useState<Array<{ id: number; actor_email: string; action: string; entity_type: string; entity_id: string | null; created_at: string }>>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { void readJson<{ logs: typeof logs }>("/api/admin/audit-logs").then((result) => setLogs(result.logs)).finally(() => setLoading(false)); }, []);
  return <><PageHeading eyebrow="安全" title="操作日志" copy="记录后台的敏感查看和业务处理操作。" /><section className="admin-panel">{loading ? <div className="admin-loading">正在加载日志…</div> : !logs.length ? <Empty>暂无后台操作记录。</Empty> : <div className="admin-timeline">{logs.map((log) => <article key={log.id}><span>{log.actor_email.slice(0, 1).toUpperCase()}</span><div><strong>{ACTION_TEXT[log.action] ?? log.action}</strong><p>{log.actor_email}{log.entity_id ? ` · ${log.entity_id}` : ""}</p></div><time>{formatDate(log.created_at)}</time></article>)}</div>}</section></>;
}
