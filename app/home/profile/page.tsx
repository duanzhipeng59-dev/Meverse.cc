import type { Metadata } from "next";
import WorkspaceProfile from "./workspace-profile";

export const metadata: Metadata = { title: "个人中心", robots: { index: false, follow: false } };

export default function ProfilePage() {
  return (
    <div className="mf-workspace-content">
      <WorkspaceProfile />
    </div>
  );
}
