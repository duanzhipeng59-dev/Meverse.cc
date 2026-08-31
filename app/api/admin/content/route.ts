import { revalidatePath } from "next/cache";
import { adminError, adminJson, requireAdmin, writeAuditLog } from "../server";
import { createSupabaseAdminClient } from "../../auth/server";
import {
  loadAdminContent,
  moveCelebrity,
  safeId,
} from "./data";

function refreshProductPages(starId?: string) {
  revalidatePath("/");
  revalidatePath("/home/celebrity-match");
  if (starId) {
    revalidatePath(`/home/celebrity-match/${starId}`);
    revalidatePath(`/home/celebrity-match/${starId}/test`);
  }
}

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin(request);
    return adminJson(await loadAdminContent(), request, admin);
  } catch (error) {
    return adminError(error, request);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const payload = await request.json() as Record<string, unknown>;
    const kind = String(payload.kind ?? "");
    const supabase = createSupabaseAdminClient();

    if (kind === "celebrity") {
      const id = safeId(payload.id || payload.name);
      const name = String(payload.name ?? "").trim();
      if (!id || !name) return adminJson({ error: "invalid_celebrity" }, request, admin, { status: 400 });
      const traits = Array.isArray(payload.traits) ? payload.traits.map(String).map((item) => item.trim()).filter(Boolean) : [];
      const categories = Array.isArray(payload.categories) ? payload.categories.map(String).map((item) => item.trim()).filter(Boolean) : [];
      const reportPrompt = String(payload.reportPrompt ?? "").trim().slice(0, 20000);
      const { error } = await supabase.from("celebrity_profiles").insert({
        id,
        name,
        name_en: String(payload.nameEn ?? name).trim(),
        name_zh: String(payload.nameZh ?? "").trim() || null,
        gender: String(payload.gender ?? "unknown"),
        role: String(payload.role ?? "艺人 · 舞台创作者").trim(),
        tagline: String(payload.tagline ?? "等待你靠近的心动对象").trim(),
        description: String(payload.description ?? "").trim(),
        relationship_style: String(payload.relationshipStyle ?? "").trim(),
        focus: String(payload.focus ?? "").trim(),
        mbti: String(payload.mbti ?? "").trim().toUpperCase(),
        birth_date: String(payload.birthDate ?? "").trim(),
        death_date: String(payload.deathDate ?? "").trim() || null,
        mbti_source_type: String(payload.mbtiSourceType ?? "unknown"),
        mbti_confidence: String(payload.mbtiConfidence ?? "unknown"),
        birth_date_confidence: String(payload.birthDateConfidence ?? "unknown"),
        is_historical_figure: Boolean(payload.isHistoricalFigure),
        is_deceased: Boolean(payload.isDeceased),
        portrait_risk: String(payload.portraitRisk ?? "unknown"),
        commercial_demo_risk: String(payload.commercialDemoRisk ?? "unknown"),
        enable_bazi: payload.enableBazi !== false,
        enable_mbti: payload.enableMbti !== false,
        recommendation_level: payload.recommendationLevel == null ? null : Number(payload.recommendationLevel),
        three_pillars: String(payload.threePillars ?? "").trim(),
        traits,
        categories,
        match_count: 0,
        portrait_url: String(payload.portraitUrl ?? "").trim(),
        ideal: { security: 50, expression: 50, independence: 50, conflict: 50, novelty: 50, _reportPrompt: reportPrompt },
        report_prompt: reportPrompt || null,
        published: payload.published !== false,
        homepage_featured: Boolean(payload.homepageFeatured),
        workspace_position: Number(payload.workspacePosition) || null,
        homepage_position: Number(payload.homepagePosition) || null,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      await moveCelebrity(id, Number(payload.workspacePosition) || Number.MAX_SAFE_INTEGER);
      await writeAuditLog(admin, "celebrity_create", "celebrity_profile", id);
      refreshProductPages(id);
      return adminJson({ ok: true, id }, request, admin, { status: 201 });
    }

    return adminJson({ error: "invalid_kind" }, request, admin, { status: 400 });
  } catch (error) {
    return adminError(error, request);
  }
}
