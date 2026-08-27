import RelationshipProfileTest from "./relationship-profile-test";
import { getRelationshipQuestions } from "../../../myfate-questions-server";

export default async function RelationshipProfileTestPage() {
  const questions = await getRelationshipQuestions();
  return <RelationshipProfileTest questions={questions} />;
}
