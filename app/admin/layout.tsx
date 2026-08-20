import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "WildGPT 管理后台",
  description: "WildGPT 订单、履约与库存管理后台",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
