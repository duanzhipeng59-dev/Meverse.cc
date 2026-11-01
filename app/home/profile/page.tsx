import type { Metadata } from "next";
import WorkspaceProfile from "./workspace-profile";

// 布局模板会渲染成「个人中心 · MeVerse」;不设则回退布局默认的「生辰画像」
export const metadata: Metadata = { title: "个人中心" };

export default function ProfilePage() {
  return (
    <div className="mf-workspace-content">
      <WorkspaceProfile />
    </div>
  );
}
