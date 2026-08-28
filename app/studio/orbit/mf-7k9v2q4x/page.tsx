import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { requireAdmin } from "../../../api/admin/server";
import { loadAdminContent } from "../../../api/admin/content/data";
import AdminContentStudio from "./studio";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Myfate Studio",
  robots: { index: false, follow: false, nocache: true },
};

export default async function HiddenStudioPage() {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  const request = new Request(`${protocol}://${host}/studio/orbit/mf-7k9v2q4x`, {
    headers: new Headers(requestHeaders),
  });

  let admin;
  try {
    admin = await requireAdmin(request);
  } catch {
    notFound();
  }

  const content = await loadAdminContent();
  return <AdminContentStudio initialContent={content} adminEmail={admin.email} />;
}
