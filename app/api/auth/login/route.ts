import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { users } from "../../../../db/schema";
import { apiError, isValidEmail, normalizeEmail } from "../email-code/shared";
import { consumeEmailCode, createSession, verifyPassword } from "../server";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { email?: string; password?: string; code?: string; method?: "password" | "code" };
    const email = normalizeEmail(payload.email ?? "");
    if (!isValidEmail(email)) return apiError("invalid_credentials", 401);
    const db = await getDb();
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) return apiError("invalid_credentials", 401);
    if (payload.method === "code") {
      const codeError = await consumeEmailCode(email, payload.code?.trim() ?? "");
      if (codeError) return apiError(codeError, 400);
    } else if (!(await verifyPassword(payload.password ?? "", user.passwordHash, user.passwordSalt))) {
      return apiError("invalid_credentials", 401);
    }
    return Response.json({ user: { id: user.id, email } }, { headers: { "set-cookie": await createSession(user.id, request) } });
  } catch (error) {
    console.error("Login failed", error);
    return apiError("auth_unavailable", 500);
  }
}
