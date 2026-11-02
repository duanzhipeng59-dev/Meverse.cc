import WorkspaceProfile from "./workspace-profile";

export const metadata = { title: "我的", robots: { index: false, follow: false } };

export default function ProfilePage() {
  return (
    <div className="mf-workspace-content">
      <WorkspaceProfile />
    </div>
  );
}
