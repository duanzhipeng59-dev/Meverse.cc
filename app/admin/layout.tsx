import type { Metadata } from "next";
import "./admin.css";

export const metadata: Metadata = {
  title: "Admin · Myfate",
  description: "Myfate 订单、履约与库存管理后台",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
