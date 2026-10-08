// 方形源图适配竖版卡片(3:3.8):模糊放大铺底 + 原图完整居中,人脸零裁切。
// 用法:node scripts/fit-square-portraits.mjs
import { readFile, writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=") && !l.trim().startsWith("#")).map((l) => {
  const key = l.slice(0, l.indexOf("=")).trim();
  let value = l.slice(l.indexOf("=") + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
  return [key, value];
}));
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY);

const W = 520, H = Math.round((520 * 3.8) / 3); // 520×658,卡片完美适配,Hero(10:13)仅微裁

async function fitSquare(buf) {
  const meta = await sharp(buf).metadata();
  if (Math.abs(meta.width / meta.height - 1) > 0.05) return { buf, changed: false };
  // 背景:原图 cover 放大 + 大幅模糊 + 压暗,保证上下补边不突兀
  const bg = await sharp(buf).resize(W, H, { fit: "cover" }).blur(28).modulate({ brightness: 0.55 }).toBuffer();
  // 前景:原图 contain 完整居中
  const fg = await sharp(buf).resize(W, Math.round(W), { fit: "inside" }).toBuffer();
  const out = await sharp(bg).composite([{ input: fg, gravity: "center" }]).webp({ quality: 88 }).toBuffer();
  return { buf: out, changed: true };
}

const LOCAL = ["juhoon", "keonho", "seonghyeon"]; // public/ 下
for (const id of LOCAL) {
  const p = `public/${id}.webp`;
  const { buf, changed } = await fitSquare(await readFile(p));
  if (changed) { await writeFile(p, buf); console.log(`✓ ${id}: 方→竖版(模糊铺底),已覆盖 ${p}`); }
  else console.log(`- ${id}: 非方形,跳过`);
}

// bang-chan / hyunjin(本地)+ james(bucket)
for (const id of ["bang-chan", "hyunjin"]) {
  const p = `public/${id}.webp`;
  const { buf, changed } = await fitSquare(await readFile(p));
  if (changed) { await writeFile(p, buf); console.log(`✓ ${id}: 方→竖版,已覆盖`); }
  else console.log(`- ${id}: 非方形,跳过`);
}
{
  const url = `${env.SUPABASE_URL}/storage/v1/object/public/celebrity-portraits/profiles/james.webp`;
  const res = await fetch(url);
  const { buf, changed } = await fitSquare(Buffer.from(await res.arrayBuffer()));
  if (changed) {
    const { error } = await supabase.storage.from("celebrity-portraits").upload("profiles/james.webp", buf, { contentType: "image/webp", upsert: true });
    console.log(error ? `✗ james: ${error.message}` : `✓ james: 方→竖版,已覆盖 bucket`);
  } else console.log("- james: 非方形,跳过");
}
