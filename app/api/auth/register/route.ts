import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { users } from "../../../../db/schema";
import { apiError, isValidEmail, normalizeEmail } from "../email-code/shared";
import { consumeEmailCode, createSession, hashPassword } from "../server";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { email?: string; password?: string; code?: string };
    const email = normalizeEmail(payload.email ?? "");
    const password = payload.password ?? "";
    const code = payload.code?.trim() ?? "";
    if (!isValidEmail(email)) return apiError("invalid_email", 400);
    if (password.length < 8 || password.length > 128) return apiError("invalid_password", 400);
    if (!/^\d{6}$/.test(code)) return apiError("invalid_code", 400);
    const db = await getDb();
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing) return apiError("email_exists", 409);
    const codeError = await consumeEmailCode(email, code);
    if (codeError) return apiError(codeError, 400);
    const now = Date.now();
    const user = { id: crypto.randomUUID(), email, ...(await hashPassword(password)), emailVerifiedAt: now, createdAt: now };
    await db.insert(users).values(user);
    return Response.json({ user: { id: user.id, email } }, { status: 201, headers: { "set-cookie": await createSession(user.id, request) } });
  } catch (error) {
    console.error("Registration failed", error);
    return apiError("auth_unavailable", 500);
  }
}
