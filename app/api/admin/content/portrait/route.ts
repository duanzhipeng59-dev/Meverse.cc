import sharp from "sharp";
import { adminError, adminJson, requireAdmin, writeAuditLog } from "../../server";
import { createSupabaseAdminClient } from "../../../auth/server";
import { safeId } from "../data";

const MAX_PORTRAIT_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const form = await request.formData();
    const file = form.get("file");
    const starId = safeId(form.get("starId"));
    if (!(file instanceof File) || !starId) {
      return adminJson({ error: "invalid_portrait" }, request, admin, { status: 400 });
    }
    const extension = ALLOWED_TYPES.get(file.type);
    if (!extension || file.size < 1 || file.size > MAX_PORTRAIT_BYTES) {
      return adminJson({ error: "invalid_portrait" }, request, admin, { status: 400 });
    }

    // 统一处理:EXIF 矫正 → 最长边 1600px → WebP q80,统一走唯一文件名 + 一年缓存
    const processed = await sharp(Buffer.from(await file.arrayBuffer()))
      .rotate()
      .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    if (processed.length < 1) {
      return adminJson({ error: "invalid_portrait" }, request, admin, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    const bucket = "celebrity-portraits";
    const path = `${starId}/${crypto.randomUUID()}.webp`;
    const { error } = await supabase.storage.from(bucket).upload(path, processed, {
      contentType: "image/webp",
      cacheControl: "31536000",
      upsert: false,
    });
    if (error) throw error;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    await writeAuditLog(admin, "portrait_upload", "celebrity_profile", starId, { path });
    return adminJson({ url: data.publicUrl }, request, admin, { status: 201 });
  } catch (error) {
    return adminError(error, request);
  }
}
