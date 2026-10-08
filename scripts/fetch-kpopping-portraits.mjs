// 从 kpopping.com 官方档案头像(R2 直链 800×800)补齐 66 位成员真实头像。
// 流程:下载 → 方图适配竖版(模糊铺底+原图居中,人脸零裁切) → 上传 bucket profiles/{id}-kp.webp → 更新 DB。
// 版本化文件名绕过一年 immutable 缓存。用法:node scripts/fetch-kpopping-portraits.mjs [--dry]
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { readFileSync, mkdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";

const env = Object.fromEntries(readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=") && !l.trim().startsWith("#")).map((l) => {
  const key = l.slice(0, l.indexOf("=")).trim();
  let value = l.slice(l.indexOf("=") + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
  return [key, value];
}));
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY);

const R2 = "https://pub-dc9a9c6ac2a64ba48bce426ced0ac56a.r2.dev/idols";
// 本站 id → kpopping slug(全部从各组合页实测拿到的准确链接,含重名编号/小写特例)
const MAP = {
  // TXT
  yeonjun: "Yeonjun", soobin: "Soobin2", beomgyu: "Beomgyu", taehyun: "Taehyun3", "huening-kai": "Huening-Kai",
  // SEVENTEEN
  "s-coups": "scoups", jeonghan: "Jeonghan", joshua: "Joshua", jun: "Jun", hoshi: "Hoshi",
  wonwoo: "Wonwoo", woozi: "Woozi", dk: "DK", the8: "the88", mingyu: "Mingyu",
  seungkwan: "Seungkwan", vernon: "Vernon", dino: "Dino",
  // Stray Kids
  "lee-know": "Lee-Know", changbin: "Changbin", han: "Han", felix: "Felix", seungmin: "Seungmin2", "i-n": "in",
  // KickFlip
  kyehoon: "Kyehoon", amaru: "Amaru", keiju: "Keiju", donghwa: "Donghwa2", juwang: "Juwang", minje: "Minje3", donghyeon: "Donghyeon",
  // 2PM
  "jun-k": "Jun-K", nichkhun: "Nichkhun", taecyeon: "Taecyeon", wooyoung: "Wooyoung2", junho: "Junho", chansung: "Chansung",
  // H.O.T.
  "moon-hee-jun": "Heejun2", kangta: "Kangta", "tony-an": "Tony-An", "lee-jae-won": "Jaewon", "jang-woo-hyuk": "Jang-Woohyuk",
  // Super Junior
  leeteuk: "Leeteuk", heechul: "Heechul", yesung: "Yesung", sungmin: "Sungmin", shindong: "Shindong",
  eunhyuk: "Eunhyuk", donghae: "Donghae", siwon: "Siwon", ryeowook: "Ryeowook", kyuhyun: "Kyuhyun",
  // BIGBANG
  "g-dragon": "G-Dragon", taeyang: "Taeyang", top: "top", daesung: "Daesung",
  // WINNER
  "kang-seungyoon": "Yoon", "kim-jinwoo": "Jinu", mino: "Mino", "lee-seunghoon": "Hoony",
  // iKON
  bobby: "Bobby", jay: "Jay2", june: "Ju-ne", yunhyeong: "Song", chanwoo: "Chan", donghyuk: "DK2",
};

const DRY = process.argv.includes("--dry");
const W = 520, H = Math.round((W * 3.8) / 3); // 520×658 竖版卡片
const TMP = "/tmp/kpopping-portraits";
mkdirSync(TMP, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchRetry(url, tries = 5) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130.0 Safari/537.36" } });
      if (res.ok) return res;
      if (res.status === 404) throw new Error(`404 not found`);
      throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      if (String(e.message).startsWith("404")) throw e;
      if (i === tries - 1) throw e;
      await sleep(2000 + i * 1500);
    }
  }
}

// R2 直构 404 时,抓主站 profile 页拿真实 og:image(R2 目录名与主站 slug 偶有出入)
async function resolveImageUrl(slug) {
  try {
    const res = await fetchRetry(`https://kpopping.com/profiles/idol/${slug}`);
    const html = await res.text();
    const m = html.match(/property="og:image"\s+content="([^"]+)"/) || html.match(/content="([^"]+)"\s+property="og:image"/);
    if (m) return m[1].split("?")[0];
  } catch { /* 主站限流则放弃,报 404 */ }
  return null;
}

// 填满竖版 520×658:cover 放大裁切,attention 策略自动保住人脸显著性区域
async function fitCover(buf) {
  return sharp(buf).resize(W, H, { fit: "cover", position: sharp.strategy.attention }).webp({ quality: 88 }).toBuffer();
}

// 直构 R2 URL,404 则回退主站 og:image 解析
async function getImage(slug) {
  try {
    return await fetchRetry(`${R2}/${slug}/profile.png`);
  } catch (e) {
    if (!String(e.message).startsWith("404")) throw e;
    const resolved = await resolveImageUrl(slug);
    if (!resolved) throw e;
    return fetchRetry(resolved);
  }
}

const failed = [], done = [];
for (const [id, slug] of Object.entries(MAP)) {
  const path = `profiles/${id}-kp2.webp`;
  try {
    const res = await getImage(slug);
    const raw = Buffer.from(await res.arrayBuffer());
    if (raw.length < 5000) throw new Error(`suspiciously small (${raw.length}B)`);
    const meta = await sharp(raw).metadata();
    if ((meta.width || 0) < 300) throw new Error(`too small ${meta.width}×${meta.height}`);
    const out = await fitCover(raw);
    await writeFile(`${TMP}/${id}.webp`, out); // 留档抽查
    if (!DRY) {
      const { error } = await supabase.storage.from("celebrity-portraits").upload(path, out, { contentType: "image/webp", upsert: true });
      if (error) throw new Error(`upload: ${error.message}`);
      const url = `${env.SUPABASE_URL}/storage/v1/object/public/celebrity-portraits/${path}`;
      const { error: uErr } = await supabase.from("celebrity_profiles").update({ portrait_url: url }).eq("id", id);
      if (uErr) throw new Error(`db: ${uErr.message}`);
    }
    done.push(id);
    console.log(`✓ ${id} ← ${slug} (${meta.width}×${meta.height})${DRY ? " [dry]" : ""}`);
  } catch (e) {
    failed.push(`${id}(${slug}): ${e.message}`);
    console.log(`✗ ${id} ← ${slug}: ${e.message}`);
  }
  await sleep(1200); // 限速,尊重源站
}
console.log(`\n=== 完成 ${done.length}/${Object.keys(MAP).length},失败 ${failed.length} ===`);
if (failed.length) for (const f of failed) console.log("  ✗ " + f);
