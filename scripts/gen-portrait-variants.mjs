// 预生成明星肖像的静态 WebP 变体:public/portraits/{stem}.w{120,240,360,520}.webp
// + 清单 app/portrait-static-manifest.ts(运行时 myfate-image.ts 优先走静态文件,
// 不在清单内的回退 /portrait/ 代理)。
// 为何静态化:代理在 Vercel 按 POP 缓存,冷 POP 回源 sin1 函数→Supabase render,
// 单图尾延迟可达秒级;静态资源走 Vercel 全局静态 CDN,无函数无数据库,长尾消失。
// 何时跑:新增明星或更换头像后(替换头像需删除对应旧文件再跑,脚本只增不删)。
// 用法:node scripts/gen-portrait-variants.mjs
import { mkdirSync, readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const WIDTHS = [120, 240, 360, 520];
const OBJECT_PREFIX = "/storage/v1/object/public/";
const OUT_DIR = "public/portraits";
const MANIFEST = "app/portrait-static-manifest.ts";
const DOWNLOAD_TIMEOUT_MS = 20_000;
const CONCURRENCY = 6;

const env = Object.fromEntries(readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=") && !l.trim().startsWith("#")).map((l) => {
  const key = l.slice(0, l.indexOf("=")).trim();
  let value = l.slice(l.indexOf("=") + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
  return [key, value];
}));

const { data, error } = await createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY)
  .from("celebrity_profiles")
  .select("id,portrait_url")
  .eq("published", true);
if (error) throw error;

// 只处理自家 bucket 的对象地址;stem=文件名去扩展名(与运行时 renderUrl 的提取一致),
// 同时保留完整对象路径作渲染源(源文件扩展名不一定是 .webp)
const entries = [...new Map((data ?? [])
  .map((row) => row.portrait_url)
  .filter((url) => typeof url === "string" && url.includes(OBJECT_PREFIX))
  .map((url) => {
    const path = url.slice(url.indexOf(OBJECT_PREFIX) + OBJECT_PREFIX.length);
    const file = path.split("/").pop() ?? "";
    const stem = file.replace(/\.[a-z0-9]+$/i, "");
    return stem ? [stem, path] : null;
  })
  .filter(Boolean)).entries()]
  .sort((a, b) => a[0].localeCompare(b[0]));
const stems = entries.map(([stem]) => stem);
console.log(`published portraits: ${stems.length}`);

mkdirSync(OUT_DIR, { recursive: true });
const origin = new URL(env.SUPABASE_URL).origin;

// 下载一次最大变体(520w,10:13 cover 裁切),再本地 sharp 缩出其余尺寸
async function renderOne(stem, objectPath) {
  const source = `${origin}/storage/v1/render/image/public/${objectPath}?width=520&height=676&resize=cover&quality=80&format=webp`;
  const res = await fetch(source, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`upstream ${res.status}`);
  const base = Buffer.from(await res.arrayBuffer());
  for (const width of WIDTHS) {
    const out = `${OUT_DIR}/${stem}.w${width}.webp`;
    if (width === WIDTHS[WIDTHS.length - 1]) {
      writeFileSync(out, base);
    } else {
      writeFileSync(out, await sharp(base).resize({ width, height: Math.round((width * 13) / 10) }).webp({ quality: 75 }).toBuffer());
    }
  }
}

const failed = [];
let done = 0;
const queue = [...entries];
async function worker() {
  for (;;) {
    const [stem, objectPath] = queue.shift() ?? [];
    if (!stem) return;
    try {
      await renderOne(stem, objectPath);
      done += 1;
      if (done % 20 === 0) console.log(`  ${done}/${stems.length}`);
    } catch (err) {
      failed.push(stem);
      console.warn(`  skip ${stem}: ${err.message}`);
    }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

const ok = stems.filter((stem) => !failed.includes(stem));
// 清掉清单里已失效的旧文件(明星下架/头像换名后残留)
if (existsSync(MANIFEST)) {
  const prev = readFileSync(MANIFEST, "utf8");
  for (const m of prev.matchAll(/"([a-z0-9-]+)"/g)) {
    const stem = m[1];
    if (!ok.includes(stem)) {
      for (const width of WIDTHS) {
        const stale = `${OUT_DIR}/${stem}.w${width}.webp`;
        if (existsSync(stale)) unlinkSync(stale);
      }
    }
  }
}

const banner = `// 静态肖像清单:包含 public/portraits/ 下已生成 WebP 变体的明星。
// 由 scripts/gen-portrait-variants.mjs 生成;新增明星/更换头像后重跑并部署。
// myfate-image.ts 命中清单时直接用静态文件(全局 CDN、无函数回源),
// 未命中(新生成名单未跑脚本)自动回退 /portrait/ 同源代理,不影响可用性。
// AUTO-GENERATED — do not edit by hand.
`;
writeFileSync(MANIFEST, banner + "export const STATIC_PORTRAITS: ReadonlySet<string> = new Set([\n" + ok.map((s) => `  "${s}",`).join("\n") + "\n]);\n");
console.log(`done: ${ok.length} ok, ${failed.length} failed${failed.length ? " -> " + failed.join(", ") : ""}`);
