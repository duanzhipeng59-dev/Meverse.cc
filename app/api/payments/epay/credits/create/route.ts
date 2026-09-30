import { getSessionUser } from "../../../../auth/server";
import { jsonResponse } from "../../server";
import { createCreditCheckout, isReportPackageId } from "../server";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as { packageId?: string } | null;
    const packageId = body?.packageId ?? "";
    if (!isReportPackageId(packageId)) {
      return jsonResponse({ error: "invalid_package" }, { status: 400 });
    }
    const { user } = await getSessionUser(request);
    if (!user?.id) {
      return jsonResponse({ error: "login_required" }, { status: 401 });
    }
    const checkout = await createCreditCheckout({ request, userId: user.id, packageId });
    return jsonResponse(checkout);
  } catch (error) {
    console.error("Failed to create report credit checkout", error);
    return jsonResponse({ error: "payment_unavailable" }, { status: 503 });
  }
}
