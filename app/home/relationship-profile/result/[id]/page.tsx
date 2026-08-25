import RelationshipProfileResult from "./relationship-profile-result";

export default async function RelationshipProfileResultPage({ params }: { params: Promise<{ id: string }> }) {
  return <RelationshipProfileResult reportId={(await params).id} />;
}
