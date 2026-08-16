import { appendSessionCookies, getSessionUser } from "../server";

export async function GET(request: Request) {
  const { user, refreshedSession } = await getSessionUser(request);
  const headers = new Headers({ "content-type": "application/json" });
  if (refreshedSession) appendSessionCookies(headers, refreshedSession, request);
  return new Response(JSON.stringify({ user }), { headers });
}
