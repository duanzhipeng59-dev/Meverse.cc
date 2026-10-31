// 排盘确认页的 sessionStorage 契约:解读页枢纽(弹窗提交)与待生成续开页写入,确认页读取。
// reportId 带 = 续开某条已存在的「待生成」记录(不重复建);不带 = 全新进入(确认页落一条新待生成)。
// credits = 入口提交时的额度快照(number=已知余额,null=查询失败按有额度渲染,不写=未经预检,确认页自行查询)。
export const CONFIRM_STORAGE_KEY = "myfate_reading_confirm_v1";

export type ConfirmSubject = { name: string; gender: "male" | "female"; birthDate: string; birthTime: string; cityId: string; cityName: string };
export type ConfirmPayload = { mode: "single" | "dual"; subjectA: ConfirmSubject; subjectB?: ConfirmSubject; reportId?: string; retry?: boolean; credits?: number | null };

export function writeConfirmPayload(payload: ConfirmPayload) {
  sessionStorage.setItem(CONFIRM_STORAGE_KEY, JSON.stringify(payload));
}

export function readConfirmPayload(): ConfirmPayload | null {
  try {
    const raw = sessionStorage.getItem(CONFIRM_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ConfirmPayload>;
    if (!parsed?.subjectA?.birthDate) return null;
    // mode 缺失时按 subjectB 有无推断,杜绝旧格式数据让渲染越界
    const mode = parsed.mode === "single" || parsed.mode === "dual" ? parsed.mode : (parsed.subjectB?.birthDate ? "dual" : "single");
    if (mode === "dual" && !parsed.subjectB?.birthDate) return null;
    return {
      mode,
      subjectA: parsed.subjectA,
      subjectB: mode === "dual" ? parsed.subjectB : undefined,
      reportId: typeof parsed.reportId === "string" && parsed.reportId ? parsed.reportId : undefined,
      retry: parsed.retry === true,
      credits: typeof parsed.credits === "number" ? parsed.credits : parsed.credits === null ? null : undefined,
    };
  } catch {
    return null;
  }
}

// 额度预检:各入口跳确认页前调用,结果随 payload 带过去——确认页首帧即渲染正确的 CTA(开始分析/解锁卡)。
// 查询失败返回 null(按有额度渲染),计费兜底仍在确认页 begin 的 402。
export async function precheckCredits(): Promise<number | null> {
  try {
    const res = await fetch("/api/myfate/credits", { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json() as { balance?: number };
    return typeof data.balance === "number" ? data.balance : null;
  } catch {
    return null;
  }
}
