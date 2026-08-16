import { and, desc, eq, gt, isNull, lt, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import {
  emailVerificationCodes,
  sessions,
  users,
} from "../../../db/schema";
import {
  hashCode,
  MAX_ATTEMPTS,
  normalizeEmail,
} from "./email-code/shared";

const SESSION_COOKIE = "wildai_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const PASSWORD_ITERATIONS = 210_000;

function bytesToBase64(bytes: Uint8Array) {
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value);
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return bytesToBase64(new Uint8Array(digest));
}

async function derivePassword(password: string, salt: Uint8Array) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: PASSWORD_ITERATIONS },
    key,
    256,
  );
  return bytesToBase64(new Uint8Array(bits));
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { passwordHash: await derivePassword(password, salt), passwordSalt: bytesToBase64(salt) };
}

export async function verifyPassword(password: string, hash: string, salt: string) {
  const bytes = Uint8Array.from(atob(salt), (character) => character.charCodeAt(0));
  return (await derivePassword(password, bytes)) === hash;
}

export async function consumeEmailCode(emailValue: string, code: string) {
  const email = normalizeEmail(emailValue);
  const db = await getDb();
  const now = Date.now();
  const [record] = await db
    .select()
    .from(emailVerificationCodes)
    .where(and(eq(emailVerificationCodes.email, email), isNull(emailVerificationCodes.consumedAt), gt(emailVerificationCodes.expiresAt, now), lt(emailVerificationCodes.attempts, MAX_ATTEMPTS)))
    .orderBy(desc(emailVerificationCodes.createdAt))
    .limit(1);
  if (!record) return "code_expired" as const;
  if ((await hashCode(email, code)) !== record.codeHash) {
    await db.update(emailVerificationCodes).set({ attempts: sql`${emailVerificationCodes.attempts} + 1` }).where(eq(emailVerificationCodes.id, record.id));
    return "invalid_code" as const;
  }
  await db.update(emailVerificationCodes).set({ consumedAt: now }).where(eq(emailVerificationCodes.id, record.id));
  return null;
}

export async function createSession(userId: string, request: Request) {
  const db = await getDb();
  const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
  const token = bytesToBase64(tokenBytes).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  const now = Date.now();
  await db.insert(sessions).values({ id: crypto.randomUUID(), userId, tokenHash: await sha256(token), expiresAt: now + SESSION_TTL_MS, createdAt: now });
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_MS / 1000}${secure}`;
}

function readCookie(request: Request, name: string) {
  const cookie = request.headers.get("cookie") ?? "";
  return cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1) ?? null;
}

export async function getSessionUser(request: Request) {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return null;
  const db = await getDb();
  const [row] = await db
    .select({ id: users.id, email: users.email })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.tokenHash, await sha256(token)), gt(sessions.expiresAt, Date.now())))
    .limit(1);
  return row ?? null;
}
