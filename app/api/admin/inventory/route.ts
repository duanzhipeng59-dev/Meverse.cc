import { createSupabaseAdminClient } from "../../auth/server";
import { encryptCredential, decryptCredential } from "../../payments/epay/server";
import {
  adminError,
  adminJson,
  requireAdmin,
  writeAuditLog,
} from "../server";

function maskEmail(value: string) {
  const [name, domain] = value.split("@");
  if (!domain) return "••••••";
  return `${name.slice(0, 2)}${"•".repeat(Math.max(3, name.length - 2))}@${domain}`;
}

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("gemini_account_inventory")
      .select("id,account_email_encrypted,status,reserved_order_no,reserved_at,sold_at,created_at,updated_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    const inventory = (data ?? []).map((item) => {
      let account = "凭据不可读取";
      try {
        account = maskEmail(decryptCredential(item.account_email_encrypted));
      } catch {
        account = "加密凭据异常";
      }
      return { ...item, account_email_encrypted: undefined, account };
    });
    return adminJson({ inventory }, request, admin);
  } catch (error) {
    return adminError(error, request);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const payload = (await request.json()) as { email?: string; password?: string };
    const email = payload.email?.trim().toLowerCase() ?? "";
    const password = payload.password ?? "";
    if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 6) {
      return adminJson({ error: "invalid_credentials" }, request, admin, { status: 400 });
    }
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("gemini_account_inventory")
      .insert({
        account_email_encrypted: encryptCredential(email),
        account_password_encrypted: encryptCredential(password),
      })
      .select("id")
      .single();
    if (error) throw error;
    await writeAuditLog(admin, "inventory_add", "gemini_inventory", data.id, {
      account: maskEmail(email),
    });
    return adminJson({ ok: true, id: data.id }, request, admin, { status: 201 });
  } catch (error) {
    return adminError(error, request);
  }
}
