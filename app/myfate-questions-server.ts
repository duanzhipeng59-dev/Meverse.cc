import { createInitialQuestions, type StarProfile, type TestQuestion } from "./myfate-data";
import { relationshipQuestions, type RelationshipQuestion } from "./relationship-profile-data";

const localQuestionBankUrl = process.env.LOCAL_QUESTION_BANK_URL ?? "http://localhost:3100/api/public/questions";

async function readLocalQuestionBank<T>(starId: string): Promise<T[] | null> {
  if (process.env.NODE_ENV !== "development") return null;
  try {
    const response = await fetch(`${localQuestionBankUrl}?starId=${encodeURIComponent(starId)}`, { cache: "no-store" });
    if (!response.ok) return null;
    const data = await response.json() as { questions?: T[] };
    return Array.isArray(data.questions) && data.questions.length ? data.questions : null;
  } catch {
    return null;
  }
}

export async function getQuestionsForStar(star: StarProfile): Promise<TestQuestion[]> {
  return (await readLocalQuestionBank<TestQuestion>(star.id)) ?? createInitialQuestions(star);
}

export async function getRelationshipQuestions(): Promise<RelationshipQuestion[]> {
  return (await readLocalQuestionBank<RelationshipQuestion>("relationship-profile")) ?? relationshipQuestions;
}
