import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "./api/auth/server";

export async function requirePageUser(pathname: string) {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  const request = new Request(`${protocol}://${host}${pathname}`, {
    headers: new Headers(requestHeaders),
  });
  const { user } = await getSessionUser(request);

  if (!user) {
    const cardList = "/home/relationship-test";
    redirect(`/login?next=${encodeURIComponent(cardList)}&from=${encodeURIComponent(cardList)}`);
  }

  return user;
}
