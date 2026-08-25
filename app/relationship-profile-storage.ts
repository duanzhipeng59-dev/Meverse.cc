import type { RelationshipScores } from "./relationship-profile-data";

export type RelationshipProfileReport = {
  id: string;
  version: 1;
  type: "relationship-profile";
  title: string;
  scores: RelationshipScores;
  answers: Record<string, number>;
  createdAt: string;
};

function key(email: string | null) { return `myfate-relationship-profiles:${email ?? "guest"}`; }

export function readRelationshipReports(email: string | null): RelationshipProfileReport[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key(email)) ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is RelationshipProfileReport => typeof item === "object" && item !== null && (item as RelationshipProfileReport).type === "relationship-profile");
  } catch { return []; }
}

export function createRelationshipReport(email: string | null, report: Omit<RelationshipProfileReport, "id" | "version" | "type" | "createdAt">) {
  const saved: RelationshipProfileReport = {
    ...report, id: globalThis.crypto?.randomUUID?.() ?? `profile-${Date.now()}`, version: 1,
    type: "relationship-profile", createdAt: new Date().toISOString(),
  };
  window.localStorage.setItem(key(email), JSON.stringify([saved, ...readRelationshipReports(email)]));
  window.dispatchEvent(new CustomEvent("myfate-reports-updated"));
  return saved;
}

export function deleteRelationshipReport(email: string | null, reportId: string) {
  const reports = readRelationshipReports(email);
  const remaining = reports.filter((report) => report.id !== reportId);
  if (remaining.length === reports.length) return false;
  window.localStorage.setItem(key(email), JSON.stringify(remaining));
  window.dispatchEvent(new CustomEvent("myfate-reports-updated"));
  return true;
}
