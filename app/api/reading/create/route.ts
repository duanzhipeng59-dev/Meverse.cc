import { after } from "next/server";
import { z } from "zod";
import { getSessionUser } from "../../auth/server";
import { vedicCities } from "../../../myfate-cities";
import { createReadingReport } from "../../../myfate-reading-server";
import { runReadingGeneration } from "../../../myfate-reading-generator";

// 单次直出模版化报告实测 ~65s,含最多 3 次结构重试也在 300s 内(套餐函数上限 300s,600 会被拒)
export const maxDuration = 300;

const cityIds = new Set(vedicCities.map((city) => city.id));
const subjectSchema = z.object({
  name: z.string().trim().min(1, "请填写姓名").max(20, "姓名过长"),
  gender: z.enum(["male", "female"]),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "请选择出生日期"),
  birthTime: z.string().regex(/^\d{2}:\d{2}$/, "请选择出生时间"),
  cityId: z.string().refine((id) => cityIds.has(id), "请选择出生城市"),
  cityName: z.string().min(1).max(40),
});
const requestSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("single"), subjectA: subjectSchema }),
  z.object({ mode: z.literal("dual"), dualType: z.enum(["love", "career"]).default("love"), subjectA: subjectSchema, subjectB: subjectSchema }),
]).superRefine((value, ctx) => {
  // 合盘约束:双方必须一男一女,与解读页表单同一条规则(服务端兜底)。
  if (value.mode === "dual" && value.subjectA.gender === value.subjectB.gender) {
    ctx.addIssue({ code: "custom", path: ["subjectB.gender"], message: "合盘双方须为一男一女" });
  }
});

// 创建解读报告:校验自填信息 → 建记录(generating) → 响应后后台生成(单/双管线在 myfate-reading-generator)。
export async function POST(request: Request) {
  const { user } = await getSessionUser(request);
  if (!user) return Response.json({ error: "LOGIN_REQUIRED" }, { status: 401 });

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return Response.json({ error: "INVALID_SUBJECT", detail: `${issue.path.join(".")}: ${issue.message}` }, { status: 400 });
  }

  try {
    const reportId = await createReadingReport({
      userId: user.id,
      mode: parsed.data.mode,
      dualType: parsed.data.mode === "dual" ? parsed.data.dualType : undefined,
      subjectA: parsed.data.subjectA,
      subjectB: parsed.data.mode === "dual" ? parsed.data.subjectB : null,
    });
    after(async () => {
      await runReadingGeneration(reportId);
    });
    return Response.json({ reportId });
  } catch (error) {
    console.error("Reading create failed", error);
    return Response.json({ error: "CREATE_FAILED" }, { status: 500 });
  }
}
