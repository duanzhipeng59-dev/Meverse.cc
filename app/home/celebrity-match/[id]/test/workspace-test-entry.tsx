"use client";

import type { StarProfile } from "../../../../myfate-data";
import MyfateGeneratedTest from "../../../../myfate-generated-test";

export default function WorkspaceTestEntry({
  star,
}: {
  star: StarProfile;
}) {
  return <MyfateGeneratedTest star={star} workspace />;
}
