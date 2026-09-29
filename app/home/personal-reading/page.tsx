import PersonalReadingTest from "./personal-reading-test";
import { requirePageUser } from "../../require-page-user";

export const dynamic = "force-dynamic";

export default async function PersonalReadingPage() {
  await requirePageUser("/home/personal-reading");
  return <PersonalReadingTest />;
}
