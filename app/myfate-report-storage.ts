import type { Dimension, StarProfile } from "./myfate-data";
import type { AnswerSnapshot, FateInterpretation } from "./myfate-engine";

export type SavedReportStatus = "initial" | "advanced";

export type SavedReport = {
  id: string;
  version: 1;
  type?: "celebrity-match";
  starId: string;
  starName: string;
  starPortrait: string;
  status: SavedReportStatus;
  score: number;
  behaviorScores?: Record<Dimension, number>;
  questionCount?: number;
  initialTitle: string;
  answers: AnswerSnapshot[];
  interpretation: FateInterpretation | null;
  interpretationSource?: "deepseek" | "gemini";
  createdAt: string;
  updatedAt: string;
};

function storageKey(email: string | null) {
  return `myfate-reports:${email ?? "guest"}`;
}

export function readSavedReports(email: string | null): SavedReport[] {
  try {
    const raw = window.localStorage.getItem(storageKey(email));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((report): report is SavedReport => (
      typeof report === "object" && report !== null
      && typeof (report as SavedReport).id === "string"
      && typeof (report as SavedReport).starId === "string"
      && ((report as SavedReport).status === "initial" || (report as SavedReport).status === "advanced")
    ));
  } catch {
    return [];
  }
}

export function readLatestSavedReportForStar(email: string | null, starId: string): SavedReport | null {
  return readSavedReports(email).reduce<SavedReport | null>((latest, report) => {
    if (report.starId !== starId) return latest;
    if (!latest || report.createdAt > latest.createdAt) return report;
    return latest;
  }, null);
}

function writeSavedReports(email: string | null, reports: SavedReport[]) {
  window.localStorage.setItem(storageKey(email), JSON.stringify(reports));
  window.dispatchEvent(new CustomEvent("myfate-reports-updated"));
}

export function deleteSavedReport(email: string | null, reportId: string) {
  const reports = readSavedReports(email);
  const remaining = reports.filter((report) => report.id !== reportId);
  if (remaining.length === reports.length) return false;
  writeSavedReports(email, remaining);
  return true;
}

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `report-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createSavedReport({
  email,
  star,
  score,
  behaviorScores,
  questionCount,
  initialTitle,
  answers,
}: {
  email: string | null;
  star: StarProfile;
  score: number;
  behaviorScores?: Record<Dimension, number>;
  questionCount?: number;
  initialTitle: string;
  answers: AnswerSnapshot[];
}): SavedReport | null {
  try {
    const now = new Date().toISOString();
    const report: SavedReport = {
      id: createId(),
      version: 1,
      starId: star.id,
      starName: star.name,
      starPortrait: star.portraitSrc,
      status: "initial",
      score,
      behaviorScores,
      questionCount,
      initialTitle,
      answers,
      interpretation: null,
      createdAt: now,
      updatedAt: now,
    };
    writeSavedReports(email, [report, ...readSavedReports(email)]);
    return report;
  } catch {
    return null;
  }
}

export function updateSavedReport(
  email: string | null,
  reportId: string,
  patch: Partial<Pick<SavedReport, "status" | "interpretation" | "interpretationSource">>,
): SavedReport | null {
  try {
    let updated: SavedReport | null = null;
    const reports = readSavedReports(email).map((report) => {
      if (report.id !== reportId) return report;
      updated = { ...report, ...patch, updatedAt: new Date().toISOString() };
      return updated;
    });
    if (!updated) return null;
    writeSavedReports(email, reports);
    return updated;
  } catch {
    return null;
  }
}
