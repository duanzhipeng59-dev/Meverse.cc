import { createSupabaseAdminClient } from "../../../../auth/server";
import { decryptCredential } from "../../../../payments/epay/server";
import {
  adminError,
  adminJson,
  requireAdmin,
  writeAuditLog,
} from "../../../server";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin(request);
    const { id } = await context.params;
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("gemini_account_inventory")
      .select("account_email_encrypted,account_password_encrypted")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return adminJson({ error: "inventory_not_found" }, request, admin, { status: 404 });
    const credentials = {
      email: decryptCredential(data.account_email_encrypted),
      password: decryptCredential(data.account_password_encrypted),
    };
    await writeAuditLog(admin, "inventory_reveal", "gemini_inventory", id);
    return adminJson({ credentials }, request, admin);
  } catch (error) {
    return adminError(error, request);
  }
}
