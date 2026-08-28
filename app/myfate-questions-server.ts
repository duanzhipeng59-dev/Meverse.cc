import { unstable_noStore as noStore } from "next/cache";
import { createSupabaseAdminClient } from "./api/auth/server";
import { createInitialQuestions, type StarProfile, type TestQuestion } from "./myfate-data";
import { relationshipQuestions, type RelationshipQuestion } from "./relationship-profile-data";

type ManagedQuestionRow = {
  code: string;
  eyebrow: string | null;
  question: string;
  dimension: string;
  options: unknown;
};

function hasCloudConfig() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
}

async function readManagedQuestionBank<T>(starId: string): Promise<T[] | null> {
  if (!hasCloudConfig()) return null;
  noStore();
  try {
    const { data, error } = await createSupabaseAdminClient()
      .from("myfate_question_bank")
      .select("code,eyebrow,question,dimension,options")
      .eq("star_id", starId)
      .eq("enabled", true)
      .order("position", { ascending: true });
    if (error) throw error;
    return ((data || []) as ManagedQuestionRow[]).map((row) => ({
      id: row.code,
      eyebrow: row.eyebrow || "",
      question: row.question,
      dimension: row.dimension,
      options: row.options,
    })) as T[];
  } catch (error) {
    console.error(`Failed to read managed questions for ${starId}`, error);
    return null;
  }
}

export async function getQuestionsForStar(star: StarProfile): Promise<TestQuestion[]> {
  const managed = await readManagedQuestionBank<TestQuestion>(star.id);
  return managed?.length ? managed : createInitialQuestions(star);
}

export async function getRelationshipQuestions(): Promise<RelationshipQuestion[]> {
  const managed = await readManagedQuestionBank<RelationshipQuestion>("relationship-profile");
  return managed?.length ? managed : relationshipQuestions;
}
