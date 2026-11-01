import { createSupabaseAdminClient, getSessionUser } from "../../auth/server";

// 页面事件上报:订阅页等关键页面的进入记录(page_events 表)。
// 允许清单硬编码在前端与路由两侧,乱传一律拒;上报失败只记日志,永远 200 之外不影响页面。
const ALLOWED_EVENTS = new Set(["upgrade_page_view"]);
const ALLOWED_SOURCES = new Set(["confirm", "profile", "ask", "direct"]);

export async function POST(request: Request) {
  try {
    const { user } = await getSessionUser(request);
    if (!user?.id) return Response.json({ ok: false }, { status: 401 });

    const body = (await request.json().catch(() => null)) as { event?: unknown; source?: unknown } | null;
    const event = typeof body?.event === "string" ? body.event : "";
    const source = typeof body?.source === "string" && ALLOWED_SOURCES.has(body.source) ? body.source : "direct";
    if (!ALLOWED_EVENTS.has(event)) return Response.json({ ok: false }, { status: 400 });

    await createSupabaseAdminClient().from("page_events").insert({ user_id: user.id, event, source });
    return Response.json({ ok: true });
  } catch (error) {
    // 表未建/网络异常都不该让页面感知,静默降级
    console.warn("page_events 上报失败(不影响页面)", error);
    return Response.json({ ok: false }, { status: 200 });
  }
}
