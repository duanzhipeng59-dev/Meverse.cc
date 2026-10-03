import { after } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient, getSessionUser } from "../../auth/server";
import { runDualGeneration } from "../../../myfate-dual-generator";
import { findExistingDualReport } from "../../../myfate-dual-server";
import { getCelebrityVedicBirth } from "../../../myfate-stars-server";
import { isUpgradesEnabled } from "../../../myfate-settings";

export const maxDuration = 300;

const idSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u).max(100);
const requestSchema = z.object({
  starA: idSchema,
  starB: idSchema,
  regenerate: z.boolean().default(false),
});

// 创建双星合盘:校验资料完整性 → 扣费 → 建记录 → 响应后后台生成(after),离开页面不中断。
export async function POST(request: Request) {
  const { user } = await getSessionUser(request);
  if (!user) return Response.json({ error: "LOGIN_REQUIRED" }, { status: 401 });

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });
  const { starA, starB, regenerate } = parsed.data;
  if (starA === starB) return Response.json({ error: "SAME_STAR" }, { status: 400 });

  // 出生资料完整性:日期+时辰+地点齐备才可生成,不用虚构时辰补齐
  const [birthA, birthB] = await Promise.all([getCelebrityVedicBirth(starA), getCelebrityVedicBirth(starB)]);
  const complete = (birth?: { birthDate: string; birthTime: string; birthPlace: string }) =>
    Boolean(birth && birth.birthDate && birth.birthTime && birth.birthPlace);
  if (!complete(birthA) || !complete(birthB)) return Response.json({ error: "INCOMPLETE_BIRTH_DATA" }, { status: 422 });

  // 相同组合已生成过:返回历史报告,由用户选择查看或重新生成
  if (!regenerate) {
    const existing = await findExistingDualReport(user.id, starA, starB);
    if (existing) return Response.json({ reportId: existing.id, existing: true });
  }

  // 付费模式先扣额度;免费模式直接生成
  if (await isUpgradesEnabled()) {
    const { error: consumeError } = await createSupabaseAdminClient().rpc("consume_report_credit", { p_user_id: user.id });
    if (consumeError) {
      const insufficient = consumeError.message.includes("INSUFFICIENT_CREDITS");
      return Response.json({ error: insufficient ? "CREDITS_REQUIRED" : "CONSUME_FAILED" }, { status: insufficient ? 402 : 500 });
    }
  }

  const [a, b] = [starA, starB].sort();
  const { data: created, error: insertError } = await createSupabaseAdminClient()
    .from("dual_star_reports")
    .insert({ user_id: user.id, star_a: a, star_b: b, status: "generating" })
    .select("id")
    .single();
  if (insertError || !created) {
    // 建记录失败则立即退回额度
    await createSupabaseAdminClient().rpc("refund_report_credit", { p_user_id: user.id, p_reason: "dual:insert" });
    return Response.json({ error: "CREATE_FAILED" }, { status: 500 });
  }

  after(async () => {
    await runDualGeneration(created.id);
  });

  return Response.json({ reportId: created.id, existing: false });
}
