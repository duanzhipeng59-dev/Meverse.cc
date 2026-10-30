// 登录验证码发送状态(跨弹窗实例/跨标签页/刷新存活):
// localStorage 持久化 + BroadcastChannel 同步,登录弹窗与 /login 页共用同一份;
// 登录成功后清空,下次登录从头开始。
const STORAGE_KEY = "mf_login_code_state_v1";
const CHANNEL_NAME = "mf_login_code";

export type SentCodeState = { email: string; sentAt: number; cooldownUntil: number };

let state: SentCodeState | null = null;
let hydrated = false;
let channel: BroadcastChannel | null = null;

function persist() {
  try {
    if (state) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    else localStorage.removeItem(STORAGE_KEY);
  } catch { /* 隐私模式等存储不可用时静默降级为内存态 */ }
}

function broadcast(type: "sent" | "clear", payload?: SentCodeState) {
  try {
    channel?.postMessage({ type, state: payload ?? null });
  } catch { /* 广播失败不影响本标签页 */ }
}

function hydrate() {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) state = JSON.parse(raw) as SentCodeState;
  } catch { /* 损坏数据视为无状态 */ }
  if (typeof BroadcastChannel !== "undefined") {
    try {
      channel = new BroadcastChannel(CHANNEL_NAME);
      channel.onmessage = (event: MessageEvent) => {
        const data = event.data as { type?: string; state?: SentCodeState | null };
        if (data?.type === "sent" && data.state) state = data.state;
        else if (data?.type === "clear") state = null;
      };
    } catch { /* 不支持时仅本标签页生效 */ }
  }
}

export function getSentCodeState(): SentCodeState | null {
  hydrate();
  return state;
}

export function markCodeSent(email: string, cooldownSeconds = 120): void {
  hydrate();
  state = { email, sentAt: Date.now(), cooldownUntil: Date.now() + cooldownSeconds * 1000 };
  persist();
  broadcast("sent", state);
}

export function clearSentCodeState(): void {
  hydrate();
  state = null;
  persist();
  broadcast("clear");
}
