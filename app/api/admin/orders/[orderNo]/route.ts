import { createSupabaseAdminClient } from "../../../auth/server";
import {
  adminError,
  adminJson,
  requireAdmin,
  writeAuditLog,
} from "../../server";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ orderNo: string }> },
) {
  try {
    const admin = await requireAdmin(request);
    const { orderNo } = await context.params;
    const payload = (await request.json()) as { action?: string; note?: string };
    const note = payload.note?.trim().slice(0, 1000) ?? "";
    if (payload.action !== "fulfill" && payload.action !== "add_note") {
      return adminJson({ error: "invalid_action" }, request, admin, { status: 400 });
    }
    if (payload.action === "add_note" && !note) {
      return adminJson({ error: "note_required" }, request, admin, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    const { data: order, error: findError } = await supabase
      .from("payment_orders")
      .select("out_trade_no,billing_mode,status,fulfilled_at")
      .eq("out_trade_no", orderNo)
      .maybeSingle();
    if (findError) throw findError;
    if (!order) return adminJson({ error: "order_not_found" }, request, admin, { status: 404 });

    if (payload.action === "fulfill") {
      if (order.billing_mode !== "monthly" || order.status !== "paid") {
        return adminJson({ error: "order_cannot_be_fulfilled" }, request, admin, { status: 409 });
      }
      const now = new Date().toISOString();
      const { data: updatedOrder, error: updateError } = await supabase
        .from("payment_orders")
        .update({ status: "fulfilled", fulfilled_at: now, updated_at: now })
        .eq("out_trade_no", orderNo)
        .eq("status", "paid")
        .select("out_trade_no")
        .maybeSingle();
      if (updateError) throw updateError;
      if (!updatedOrder) {
        return adminJson({ error: "order_status_changed" }, request, admin, { status: 409 });
      }
    }

    if (note) {
      const { error: noteError } = await supabase.from("admin_order_notes").insert({
        order_no: orderNo,
        actor_user_id: admin.userId,
        note,
      });
      if (noteError) throw noteError;
    }

    await writeAuditLog(admin, payload.action, "payment_order", orderNo, {
      previousStatus: order.status,
      nextStatus: payload.action === "fulfill" ? "fulfilled" : order.status,
      hasNote: Boolean(note),
    });
    return adminJson({ ok: true }, request, admin);
  } catch (error) {
    return adminError(error, request);
  }
}
