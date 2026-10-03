import { after } from "next/server";
import { getSessionUser } from "../../auth/server";
import { runDualGeneration } from "../../../myfate-dual-generator";
import { getDualReport } from "../../../myfate-dual-server";

export const maxDuration = 300;

// 报告状态轮询(GET)与失败重试(POST,不重复扣费)
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await getSessionUser(request);
  if (!user) return Response.json({ error: "LOGIN_REQUIRED" }, { status: 401 });
  const { id } = await params;
  const report = await getDualReport(id);
  if (!report || report.userId !== user.id) return Response.json({ error: "NOT_FOUND" }, { status: 404 });
  return Response.json({ status: report.status, error: report.error });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await getSessionUser(request);
  if (!user) return Response.json({ error: "LOGIN_REQUIRED" }, { status: 401 });
  const { id } = await params;
  const report = await getDualReport(id);
  if (!report || report.userId !== user.id) return Response.json({ error: "NOT_FOUND" }, { status: 404 });
  if (report.status !== "failed") return Response.json({ error: "NOT_RETRYABLE" }, { status: 400 });
  const { createSupabaseAdminClient } = await import("../../auth/server");
  await createSupabaseAdminClient().from("dual_star_reports").update({ status: "generating", error: null, updated_at: new Date().toISOString() }).eq("id", id);
  after(async () => {
    await runDualGeneration(id);
  });
  return Response.json({ reportId: id, status: "generating" });
}
