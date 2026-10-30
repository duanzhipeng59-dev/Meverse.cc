// 排盘确认页的 sessionStorage 契约:解读页枢纽(弹窗提交)与待生成续开页写入,确认页读取。
// reportId 带 = 续开某条已存在的「待生成」记录(不重复建);不带 = 全新进入(确认页落一条新待生成)。
export const CONFIRM_STORAGE_KEY = "myfate_reading_confirm_v1";

export type ConfirmSubject = { name: string; gender: "male" | "female"; birthDate: string; birthTime: string; cityId: string; cityName: string };
export type ConfirmPayload = { mode: "single" | "dual"; subjectA: ConfirmSubject; subjectB?: ConfirmSubject; reportId?: string; retry?: boolean };

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
    };
  } catch {
    return null;
  }
}
