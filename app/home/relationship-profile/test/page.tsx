import { notFound } from "next/navigation";
import RelationshipProfileTest from "./relationship-profile-test";
import { getRelationshipQuestions } from "../../../myfate-questions-server";

export default async function RelationshipProfileTestPage() {
  const questions = await getRelationshipQuestions();
  if (!questions.length) notFound();
  return <RelationshipProfileTest questions={questions} />;
}
