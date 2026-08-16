import { getSessionUser } from "../server";

export async function GET(request: Request) {
  return Response.json({ user: await getSessionUser(request) });
}
