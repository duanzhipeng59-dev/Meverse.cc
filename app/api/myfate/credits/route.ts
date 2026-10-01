import { getSessionUser } from "../../auth/server";
import { jsonResponse } from "../../payments/epay/server";
import { getReportCredits } from "../../payments/epay/credits/server";
import { createSupabaseAdminClient } from "../../auth/server";

export async function GET(request: Request) {
  try {
    const { user } = await getSessionUser(request);
    if (!user?.id) {
      return jsonResponse({ error: "login_required" }, { status: 401 });
    }
    const balance = await getReportCredits(user.id);
    let asksRemaining: number | null = null;
    try {
      const { data } = await createSupabaseAdminClient().rpc("remaining_ask_credits", { p_user_id: user.id });
      if (typeof data === "number") asksRemaining = data;
    } catch (error) {
      console.error("Failed to read ask credits", error);
    }
    return jsonResponse({ balance, asksRemaining });
  } catch (error) {
    console.error("Failed to read report credits", error);
    return jsonResponse({ error: "credits_unavailable" }, { status: 503 });
  }
}
