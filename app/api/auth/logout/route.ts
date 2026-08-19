import {
  clearSessionCookies,
  createSupabaseClient,
  getSessionTokens,
} from "../server";

export async function POST(request: Request) {
  const headers = new Headers({ "content-type": "application/json" });
  const { accessToken, refreshToken } = getSessionTokens(request);

  try {
    if (accessToken && refreshToken) {
      const supabase = createSupabaseClient();
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (!sessionError) {
        await supabase.auth.signOut({ scope: "local" });
      }
    }
  } catch (error) {
    console.error("Supabase sign out failed", error);
  }

  clearSessionCookies(headers, request);
  return new Response(JSON.stringify({ ok: true }), { headers });
}
