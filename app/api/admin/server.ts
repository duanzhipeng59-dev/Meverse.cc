import type { Session } from "@supabase/supabase-js";
import {
  appendSessionCookies,
  createSupabaseAdminClient,
  getSessionUser,
} from "../auth/server";

export type AdminIdentity = {
  userId: string;
  email: string;
  role: "superadmin" | "operator";
  refreshedSession: Session | null;
};

function bootstrapEmails() {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export async function requireAdmin(request: Request): Promise<AdminIdentity> {
  const { user, refreshedSession } = await getSessionUser(request);
  const email = user?.email?.trim().toLowerCase();
  if (!user?.id || !email) throw new AdminAccessError("login_required", 401);

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("admin_users")
    .select("role, active")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error && error.code !== "PGRST205" && error.code !== "42P01") {
    throw error;
  }

  if (data?.active) {
    return {
      userId: user.id,
      email,
      role: data.role === "operator" ? "operator" : "superadmin",
      refreshedSession,
    };
  }

  if (!bootstrapEmails().has(email)) {
    throw new AdminAccessError("admin_required", 403);
  }

  const { error: upsertError } = await supabase.from("admin_users").upsert({
    user_id: user.id,
    email,
    role: "superadmin",
    active: true,
    updated_at: new Date().toISOString(),
  });
  if (upsertError) throw upsertError;

  return {
    userId: user.id,
    email,
    role: "superadmin",
    refreshedSession,
  };
}

export class AdminAccessError extends Error {
  constructor(
    public code: string,
    public status: number,
  ) {
    super(code);
  }
}

export function adminJson(
  body: unknown,
  request: Request,
  admin?: Pick<AdminIdentity, "refreshedSession">,
  init?: ResponseInit,
) {
  const headers = new Headers(init?.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  if (admin?.refreshedSession) {
    appendSessionCookies(headers, admin.refreshedSession, request);
  }
  return new Response(JSON.stringify(body), { ...init, headers });
}

export function adminError(error: unknown, request: Request) {
  if (error instanceof AdminAccessError) {
    return adminJson({ error: error.code }, request, undefined, {
      status: error.status,
    });
  }
  console.error("Admin API failed", error);
  return adminJson({ error: "admin_service_unavailable" }, request, undefined, {
    status: 500,
  });
}

export async function writeAuditLog(
  admin: AdminIdentity,
  action: string,
  entityType: string,
  entityId?: string,
  metadata: Record<string, unknown> = {},
) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("admin_audit_logs").insert({
    actor_user_id: admin.userId,
    actor_email: admin.email,
    action,
    entity_type: entityType,
    entity_id: entityId ?? null,
    metadata,
  });
  if (error) throw error;
}
