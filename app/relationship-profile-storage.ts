import type { AnswerSnapshot } from "./myfate-engine";
import { relationshipQuestions } from "./relationship-profile-data";

export type RelationshipProfileReport = {
  id: string;
  version: 2;
  type: "relationship-profile";
  title: string;
  status: "generating" | "complete" | "failed";
  answers: AnswerSnapshot[];
  reportText: string;
  createdAt: string;
};

function key(email: string | null) { return `myfate-relationship-profiles:${email ?? "guest"}`; }

export function readRelationshipReports(email: string | null): RelationshipProfileReport[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key(email)) ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap<RelationshipProfileReport>((item) => {
      if (typeof item !== "object" || item === null || (item as { type?: string }).type !== "relationship-profile") return [];
      const candidate = item as Partial<RelationshipProfileReport>;
      if (candidate.version !== 2 || !Array.isArray(candidate.answers)) {
        const oldAnswers = (item as { answers?: Record<string, number> }).answers;
        if (!oldAnswers || typeof oldAnswers !== "object") return [];
        const answers = relationshipQuestions.flatMap((question) => {
          const option = question.options[oldAnswers[question.id]];
          return option ? [{ question: question.question, answer: option.label }] : [];
        });
        if (!answers.length) return [];
        return [{
          id: String(candidate.id), version: 2 as const, type: "relationship-profile" as const,
          title: "关系行为报告", status: "failed" as const, answers, reportText: "", createdAt: String(candidate.createdAt),
        }];
      }
      return [{
        id: String(candidate.id),
        version: 2 as const,
        type: "relationship-profile" as const,
        title: candidate.title || "关系行为报告",
        status: candidate.status ?? (candidate.reportText ? "complete" : "failed"),
        answers: candidate.answers,
        reportText: candidate.reportText ?? "",
        createdAt: String(candidate.createdAt),
      }];
    });
  } catch { return []; }
}

function writeReports(email: string | null, reports: RelationshipProfileReport[]) {
  window.localStorage.setItem(key(email), JSON.stringify(reports));
  window.dispatchEvent(new CustomEvent("myfate-reports-updated"));
}

export function createRelationshipReport(email: string | null, answers: AnswerSnapshot[]) {
  const saved: RelationshipProfileReport = {
    id: globalThis.crypto?.randomUUID?.() ?? `profile-${Date.now()}`,
    version: 2,
    type: "relationship-profile",
    title: "关系行为报告",
    status: "generating",
    answers,
    reportText: "",
    createdAt: new Date().toISOString(),
  };
  writeReports(email, [saved, ...readRelationshipReports(email)]);
  return saved;
}

export function updateRelationshipReport(email: string | null, reportId: string, patch: Partial<Pick<RelationshipProfileReport, "status" | "reportText">>) {
  let updated: RelationshipProfileReport | null = null;
  const reports = readRelationshipReports(email).map((report) => {
    if (report.id !== reportId) return report;
    updated = { ...report, ...patch };
    return updated;
  });
  if (updated) writeReports(email, reports);
  return updated;
}

export function deleteRelationshipReport(email: string | null, reportId: string) {
  const reports = readRelationshipReports(email);
  const remaining = reports.filter((report) => report.id !== reportId);
  if (remaining.length === reports.length) return false;
  writeReports(email, remaining);
  return true;
}
