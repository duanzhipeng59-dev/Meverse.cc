import { getSessionUser } from "../../auth/server";
import { jsonResponse } from "../../payments/epay/server";
import { getReportCredits } from "../../payments/epay/credits/server";

export async function GET(request: Request) {
  try {
    const { user } = await getSessionUser(request);
    if (!user?.id) {
      return jsonResponse({ error: "login_required" }, { status: 401 });
    }
    const balance = await getReportCredits(user.id);
    return jsonResponse({ balance });
  } catch (error) {
    console.error("Failed to read report credits", error);
    return jsonResponse({ error: "credits_unavailable" }, { status: 503 });
  }
}
