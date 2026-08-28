import type { Dimension, StarProfile } from "./myfate-data";
import type { AnswerSnapshot, FateInterpretation } from "./myfate-engine";
import { readLocalSession } from "./local-auth";

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
  reportText: string | null;
  interpretationSource?: "deepseek" | "gemini";
  generatedTestId?: string;
  testGenerationFailed?: boolean;
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

function localReportsKey(email: string | null) {
  return `myfate-local-reports:${email || "guest"}`;
}

function readLocalReports(email: string | null): SavedReport[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(localReportsKey(email)) ?? "[]") as unknown;
    return Array.isArray(parsed) ? parsed as SavedReport[] : [];
  } catch { return []; }
}

function writeLocalReports(email: string | null, reports: SavedReport[]) {
  window.localStorage.setItem(localReportsKey(email), JSON.stringify(reports));
  announceReportUpdate();
}

function currentLocalEmail() {
  return typeof window === "undefined" ? null : readLocalSession();
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
          questionCount: legacyReport.questionCount,
          answers: legacyReport.answers,
        }),
      }));
      if (!created?.report) continue;
      if (legacyReport.status !== "initial") {
        const legacyText = legacyReport.reportText ?? [
          legacyReport.interpretation?.headline,
          legacyReport.interpretation?.summary,
          legacyReport.interpretation?.attraction,
          legacyReport.interpretation?.friction,
          legacyReport.interpretation?.advice,
        ].filter(Boolean).join("\n\n");
        const upgraded = await readJson<{ report?: SavedReport }>(await fetch(`/api/myfate/reports/${created.report.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            status: legacyReport.status,
            ...(legacyText ? { reportText: legacyText } : {}),
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
    if (Array.isArray(result?.reports)) return result.reports;
  } catch {
    // Local development can run without the report database.
  }
  return readLocalReports(email).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function readLatestSavedReportForStar(email: string | null, starId: string): Promise<SavedReport | null> {
  try {
    await migrateLegacyReports(email);
    const result = await readJson<{ reports?: SavedReport[] }>(await fetch(`/api/myfate/reports?starId=${encodeURIComponent(starId)}`, { cache: "no-store" }));
    if (result?.reports) return result.reports[0] ?? null;
  } catch {
    // Fall back to the browser-local report archive.
  }
  return readLocalReports(email).filter((report) => report.starId === starId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
}

export async function deleteSavedReport(reportId: string) {
  try {
    const response = await fetch(`/api/myfate/reports/${encodeURIComponent(reportId)}`, { method: "DELETE" });
    if (response.ok) { announceReportUpdate(); return true; }
  } catch {
    // Local development can run without the report database.
  }
  const email = currentLocalEmail();
  const reports = readLocalReports(email);
  const next = reports.filter((report) => report.id !== reportId);
  if (next.length === reports.length) return false;
  writeLocalReports(email, next);
  return true;
}

export async function createSavedReport({
  star,
  questionCount,
  answers,
  initialTitle,
}: {
  star: StarProfile;
  questionCount?: number;
  answers: AnswerSnapshot[];
  initialTitle?: string;
}): Promise<SavedReport | null> {
  try {
    const result = await readJson<{ report?: SavedReport }>(await fetch("/api/myfate/reports", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ starId: star.id, questionCount, answers, initialTitle }),
    }));
    if (result?.report) { announceReportUpdate(); return result.report; }
  } catch {
    // Local development can run without the report database.
  }
  const email = currentLocalEmail();
  const now = new Date().toISOString();
  const report: SavedReport = { id: crypto.randomUUID(), version: 1, type: "celebrity-match", starId: star.id, starName: star.name, starPortrait: star.portraitSrc, status: "generating", score: 0, questionCount, initialTitle: initialTitle ?? "AI 报告", answers, interpretation: null, reportText: null, createdAt: now, updatedAt: now };
  writeLocalReports(email, [report, ...readLocalReports(email)]);
  return report;
}

export async function updateSavedReport(
  reportId: string,
  patch: Partial<Pick<SavedReport, "status" | "score" | "reportText" | "interpretationSource" | "answers" | "questionCount">>,
): Promise<SavedReport | null> {
  try {
    const result = await readJson<{ report?: SavedReport }>(await fetch(`/api/myfate/reports/${encodeURIComponent(reportId)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    }));
    if (result?.report) { announceReportUpdate(); return result.report; }
  } catch {
    // Local development can run without the report database.
  }
  const email = currentLocalEmail();
  const reports = readLocalReports(email);
  const index = reports.findIndex((report) => report.id === reportId);
  if (index < 0) return null;
  const updated = { ...reports[index], ...patch, updatedAt: new Date().toISOString() };
  reports[index] = updated;
  writeLocalReports(email, reports);
  return updated;
}
