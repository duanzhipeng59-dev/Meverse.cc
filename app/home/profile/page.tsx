import WorkspaceProfile from "./workspace-profile";
import { isUpgradesEnabled } from "../../myfate-settings";

export default async function ProfilePage() {
  const upgradesEnabled = await isUpgradesEnabled();
  return <WorkspaceProfile upgradesEnabled={upgradesEnabled} />;
}
