import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "./api/auth/server";

async function pageRequest(pathname: string) {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  return new Request(`${protocol}://${host}${pathname}`, {
    headers: new Headers(requestHeaders),
  });
}

// 未登录跳转到登录页,登录后回到当前页。
export async function requirePageUser(pathname: string) {
  const { user } = await getSessionUser(await pageRequest(pathname));

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(pathname)}&from=${encodeURIComponent(pathname)}`);
  }

  return user;
}

// 可选登录:匿名返回 null,不跳转(游客可看的页面用)。
export async function getOptionalPageUser(pathname: string) {
  const { user } = await getSessionUser(await pageRequest(pathname));
  return user;
}
