import type { Dimension, StarProfile } from "./myfate-data";
import type { AnswerSnapshot, FateInterpretation } from "./myfate-engine";

export type SavedReportStatus = "initial" | "generating" | "advanced";

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

async function readJson<T>(response: Response): Promise<T | null> {
  if (!response.ok) return null;
  return response.json() as Promise<T>;
}

function announceReportUpdate() {
  window.dispatchEvent(new CustomEvent("myfate-reports-updated"));
}

const migrations = new Map<string, Promise<void>>();

async function migrateLegacyReports(email: string | null) {
  if (!email || typeof window === "undefined") return;
  const key = `myfate-reports:${email}`;
  const running = migrations.get(key);
  if (running) return running;
  const migration = (async () => {
    let remaining: SavedReport[];
    try {
      const parsed = JSON.parse(window.localStorage.getItem(key) ?? "[]") as unknown;
      remaining = Array.isArray(parsed) ? parsed as SavedReport[] : [];
    } catch {
      return;
    }
    for (const legacyReport of [...remaining]) {
      const created = await readJson<{ report?: SavedReport }>(await fetch("/api/myfate/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          starId: legacyReport.starId,
          score: legacyReport.score,
          behaviorScores: legacyReport.behaviorScores,
          questionCount: legacyReport.questionCount,
          initialTitle: legacyReport.initialTitle,
          answers: legacyReport.answers,
        }),
      }));
      if (!created?.report) continue;
      if (legacyReport.status !== "initial") {
        const upgraded = await readJson<{ report?: SavedReport }>(await fetch(`/api/myfate/reports/${created.report.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            status: legacyReport.status,
            interpretation: legacyReport.interpretation,
            interpretationSource: legacyReport.interpretationSource,
          }),
        }));
        if (!upgraded?.report) {
          await fetch(`/api/myfate/reports/${created.report.id}`, { method: "DELETE" });
          continue;
        }
      }
      remaining = remaining.filter((report) => report.id !== legacyReport.id);
      if (remaining.length > 0) window.localStorage.setItem(key, JSON.stringify(remaining));
      else window.localStorage.removeItem(key);
    }
  })().finally(() => migrations.delete(key));
  migrations.set(key, migration);
  await migration;
}

export async function readSavedReports(email: string | null): Promise<SavedReport[]> {
  try {
    await migrateLegacyReports(email);
    const result = await readJson<{ reports?: SavedReport[] }>(await fetch("/api/myfate/reports", { cache: "no-store" }));
    return Array.isArray(result?.reports) ? result.reports : [];
  } catch {
    return [];
  }
}

export async function readLatestSavedReportForStar(email: string | null, starId: string): Promise<SavedReport | null> {
  try {
    await migrateLegacyReports(email);
    const result = await readJson<{ reports?: SavedReport[] }>(await fetch(`/api/myfate/reports?starId=${encodeURIComponent(starId)}`, { cache: "no-store" }));
    return result?.reports?.[0] ?? null;
  } catch {
    return null;
  }
}

export async function deleteSavedReport(reportId: string) {
  try {
    const response = await fetch(`/api/myfate/reports/${encodeURIComponent(reportId)}`, { method: "DELETE" });
    if (!response.ok) return false;
    announceReportUpdate();
    return true;
  } catch {
    return false;
  }
}

export async function createSavedReport({
  star,
  score,
  behaviorScores,
  questionCount,
  initialTitle,
  answers,
}: {
  star: StarProfile;
  score: number;
  behaviorScores?: Record<Dimension, number>;
  questionCount?: number;
  initialTitle: string;
  answers: AnswerSnapshot[];
}): Promise<SavedReport | null> {
  try {
    const result = await readJson<{ report?: SavedReport }>(await fetch("/api/myfate/reports", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ starId: star.id, score, behaviorScores, questionCount, initialTitle, answers }),
    }));
    if (!result?.report) return null;
    announceReportUpdate();
    return result.report;
  } catch {
    return null;
  }
}

export async function updateSavedReport(
  reportId: string,
  patch: Partial<Pick<SavedReport, "status" | "interpretation" | "interpretationSource">>,
): Promise<SavedReport | null> {
  try {
    const result = await readJson<{ report?: SavedReport }>(await fetch(`/api/myfate/reports/${encodeURIComponent(reportId)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    }));
    if (!result?.report) return null;
    announceReportUpdate();
    return result.report;
  } catch {
    return null;
  }
}
