import type { Metadata } from "next";
import type { ReactNode } from "react";
import WorkspaceShell from "./workspace-shell";

export const metadata: Metadata = {
  title: "工作台",
  description: "Myfate 明星合盘与个人解读工作台",
};

export default function HomeLayout({ children }: { children: ReactNode }) {
  return <WorkspaceShell>{children}</WorkspaceShell>;
}
