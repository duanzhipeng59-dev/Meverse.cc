// 待生成合盘的本地记录:点「合盘」进确认页时写入,点「开始分析」创建报告后移除。
// 纯浏览器行为(未登录也有),不上库——确认页不创建报告、不扣费的原则不变。
export type DualPending = {
  a: string;
  b: string;
  nameA: string;
  nameB: string;
  portraitA: string;
  portraitB: string;
  ts: number;
};

const KEY = "myfate_dual_pending_v1";
const MAX = 6;

function keyOf(a: string, b: string) {
  return [a, b].sort().join("+");
}

export function readPending(): DualPending[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as DualPending[];
    return Array.isArray(parsed) ? parsed.filter((item) => item && item.a && item.b) : [];
  } catch {
    return [];
  }
}

function write(entries: DualPending[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(entries));
  } catch {
    // 隐私模式忽略
  }
}

export function addPending(entry: Omit<DualPending, "ts">) {
  if (typeof window === "undefined") return;
  const next = [{ ...entry, ts: Date.now() }, ...readPending().filter((item) => keyOf(item.a, item.b) !== keyOf(entry.a, entry.b))];
  write(next.slice(0, MAX));
}

export function removePending(a: string, b: string) {
  if (typeof window === "undefined") return;
  write(readPending().filter((item) => keyOf(item.a, item.b) !== keyOf(a, b)));
}
