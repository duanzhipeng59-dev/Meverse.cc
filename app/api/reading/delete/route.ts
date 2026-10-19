import { z } from "zod";
import { getSessionUser } from "../../auth/server";
import { deleteReadingReport, getReadingReport } from "../../../myfate-reading-server";

const requestSchema = z.object({ reportId: z.string().uuid() });

export async function POST(request: Request) {
  const { user } = await getSessionUser(request);
  if (!user) return Response.json({ error: "LOGIN_REQUIRED" }, { status: 401 });
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });

  const report = await getReadingReport(parsed.data.reportId);
  if (!report || report.userId !== user.id) return Response.json({ error: "NOT_FOUND" }, { status: 404 });

  try {
    await deleteReadingReport(parsed.data.reportId);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "DELETE_FAILED" }, { status: 500 });
  }
}
