"use client";

import type { StarProfile, TestQuestion } from "../../../../myfate-data";
import MyfateTest from "../../../../myfate-test";

export default function WorkspaceTestEntry({
  star,
  questions,
}: {
  star: StarProfile;
  questions: TestQuestion[];
}) {
  return <MyfateTest star={star} questions={questions} workspace />;
}
