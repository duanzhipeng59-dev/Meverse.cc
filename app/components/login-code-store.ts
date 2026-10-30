// 登录验证码发送状态(跨弹窗实例共享):登录弹窗在底部Tab/解读页/排盘页/购买面板各挂一份,
// 各自独立 state 会让用户换个入口打开就回到"第一步填邮箱"再发一封。此模块级存储让所有
// 实例共享"已向哪个邮箱发过码、冷却到何时";登录成功后清空,下次登录从头开始。
export type SentCodeState = { email: string; sentAt: number; cooldownUntil: number };

let state: SentCodeState | null = null;

export function getSentCodeState(): SentCodeState | null {
  return state;
}

export function markCodeSent(email: string): void {
  state = { email, sentAt: Date.now(), cooldownUntil: Date.now() + 60_000 };
}

export function clearSentCodeState(): void {
  state = null;
}
