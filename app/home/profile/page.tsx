import WorkspaceProfile from "./workspace-profile";
import { getPublishedStarList } from "../../myfate-stars-server";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  // 收藏/最近浏览的本地记录需要人物基础数据做展示
  const stars = await getPublishedStarList();
  return <WorkspaceProfile stars={stars} />;
}
