import RelationshipProfileTest from "./relationship-profile-test";
import { relationshipQuestions } from "../../../relationship-profile-data";

export default function RelationshipProfileTestPage() {
  return <RelationshipProfileTest questions={relationshipQuestions} />;
}
