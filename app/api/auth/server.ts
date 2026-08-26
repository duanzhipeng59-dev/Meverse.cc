import { createClient, type Session, type User } from "@supabase/supabase-js";

const ACCESS_COOKIE = "myfate_access_token";
const REFRESH_COOKIE = "myfate_refresh_token";
const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60;

export function createSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error("SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are required");
  }

  return createClient(url, publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

export function createSupabaseAdminClient() {
  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY are required");
  }

  return createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

function readCookie(request: Request, name: string) {
  const cookie = request.headers.get("cookie") ?? "";
  return (
    cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${name}=`))
      ?.slice(name.length + 1) ?? null
  );
}

export function getSessionTokens(request: Request) {
  return {
    accessToken: readCookie(request, ACCESS_COOKIE),
    refreshToken: readCookie(request, REFRESH_COOKIE),
  };
}

function cookieSecurity(request: Request) {
  const forwardedProtocol = request.headers.get("x-forwarded-proto");
  const secure = forwardedProtocol
    ? forwardedProtocol.split(",")[0].trim() === "https"
    : new URL(request.url).protocol === "https:";
  return secure ? "; Secure" : "";
}

export function appendSessionCookies(
  headers: Headers,
  session: Session,
  request: Request,
) {
  const common = `Path=/; HttpOnly; SameSite=Lax${cookieSecurity(request)}`;
  headers.append(
    "set-cookie",
    `${ACCESS_COOKIE}=${session.access_token}; ${common}; Max-Age=${session.expires_in}`,
  );
  headers.append(
    "set-cookie",
    `${REFRESH_COOKIE}=${session.refresh_token}; ${common}; Max-Age=${REFRESH_TTL_SECONDS}`,
  );
}

export function clearSessionCookies(headers: Headers, request: Request) {
  const common = `Path=/; HttpOnly; SameSite=Lax${cookieSecurity(request)}`;
  headers.append(
    "set-cookie",
    `${ACCESS_COOKIE}=; ${common}; Max-Age=0`,
  );
  headers.append(
    "set-cookie",
    `${REFRESH_COOKIE}=; ${common}; Max-Age=0`,
  );
}

export async function getSessionUser(request: Request): Promise<{
  user: Pick<User, "id" | "email"> | null;
  refreshedSession: Session | null;
}> {
  const accessToken = readCookie(request, ACCESS_COOKIE);
  const refreshToken = readCookie(request, REFRESH_COOKIE);
  if (!accessToken && !refreshToken) return { user: null, refreshedSession: null };
  const supabase = createSupabaseClient();

  if (accessToken) {
    const { data } = await supabase.auth.getUser(accessToken);
    if (data.user) {
      return {
        user: { id: data.user.id, email: data.user.email },
        refreshedSession: null,
      };
    }
  }

  if (!refreshToken) return { user: null, refreshedSession: null };

  const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data.user || !data.session) {
    return { user: null, refreshedSession: null };
  }

  return {
    user: { id: data.user.id, email: data.user.email },
    refreshedSession: data.session,
  };
}

export function mapOtpError(message: string) {
  return /expired/i.test(message) ? "code_expired" : "invalid_code";
}
