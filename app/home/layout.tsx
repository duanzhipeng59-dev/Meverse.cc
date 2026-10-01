import type { Metadata } from "next";
import type { ReactNode } from "react";
import WorkspaceShell from "./workspace-shell";
import { isUpgradesEnabled } from "../myfate-settings";

export const metadata: Metadata = {
  title: "工作台",
  description: "Myfate 明星合盘与个人解读工作台",
};

export default async function HomeLayout({ children }: { children: ReactNode }) {
  const upgradesEnabled = await isUpgradesEnabled();
  return <WorkspaceShell upgradesEnabled={upgradesEnabled}>{children}</WorkspaceShell>;
}
