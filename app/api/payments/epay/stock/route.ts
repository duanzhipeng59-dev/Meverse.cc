import { createSupabaseAdminClient } from "../../../auth/server";
import { jsonResponse } from "../server";

export async function GET() {
  try {
    const supabase = createSupabaseAdminClient();
    const { count, error } = await supabase
      .from("gemini_account_inventory")
      .select("id", { count: "exact", head: true })
      .eq("status", "available");
    if (error) throw error;
    return jsonResponse({ stock: count ?? 0 });
  } catch (error) {
    console.error("Failed to read Gemini annual stock", error);
    return jsonResponse({ stock: 0 }, { status: 503 });
  }
}
