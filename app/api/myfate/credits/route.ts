import { getSessionUser } from "../../auth/server";
import { jsonResponse } from "../../payments/epay/server";
import { getReportCredits } from "../../payments/epay/credits/server";
import { createSupabaseAdminClient } from "../../auth/server";

// 我的额度:报告次数余额 + 追问余额(每问 1 条扣 1 次,购买充值)
export async function GET(request: Request) {
  try {
    const { user } = await getSessionUser(request);
    if (!user?.id) {
      return jsonResponse({ error: "login_required" }, { status: 401 });
    }
    const balance = await getReportCredits(user.id);
    let askBank: number | null = null;
    try {
      const { data } = await createSupabaseAdminClient().rpc("get_ask_credit_bank", { p_user_id: user.id });
      if (typeof data === "number") askBank = data;
    } catch (error) {
      console.error("Failed to read ask credit bank", error);
    }
    return jsonResponse({ balance, askBank });
  } catch (error) {
    console.error("Failed to read report credits", error);
    return jsonResponse({ error: "credits_unavailable" }, { status: 503 });
  }
}
