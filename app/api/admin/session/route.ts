import { adminError, adminJson, requireAdmin } from "../server";

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin(request);
    return adminJson(
      { admin: { email: admin.email, role: admin.role } },
      request,
      admin,
    );
  } catch (error) {
    return adminError(error, request);
  }
}
