import { createSupabaseAdminClient } from "../../auth/server";
import { adminError, adminJson, requireAdmin } from "../server";

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("admin_audit_logs")
      .select("id,actor_email,action,entity_type,entity_id,metadata,created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return adminJson({ logs: data ?? [] }, request, admin);
  } catch (error) {
    return adminError(error, request);
  }
}
