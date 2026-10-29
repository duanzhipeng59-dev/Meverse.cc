import { statSync } from "node:fs";
import { join } from "node:path";

// route-css 拆分样式是手改直发(不走构建管线),href 必须带版本参数:
// 文件 mtime 一变 URL 即变,浏览器必然重新拉取,避免"改了样式要等缓存过期/强刷"的假象。
// 注意:dev 的 RSC 渲染进程 cwd 是沙箱路径(/bundle),直接 join(cwd) 永远 ENOENT,
// 版本号会退化成固定 v=0 被浏览器长期缓存——所以按候选根逐个探测,全部失败也不缓存,下次自愈。
const versionCache = new Map<string, string>();

function resolveRoot(): string | null {
  const candidates = [process.env.INIT_CWD, process.cwd(), join(process.cwd(), "..")].filter(Boolean) as string[];
  for (const root of candidates) {
    try {
      statSync(join(root, "public", "route-css"));
      return root;
    } catch { /* 换下一个候选根 */ }
  }
  return null;
}

export function routeCssHref(file: string): string {
  let version = versionCache.get(file);
  if (version === undefined) {
    const root = resolveRoot();
    if (!root) return `/route-css/${file}?v=0`; // 不缓存,下次调用重试
    try {
      version = String(statSync(join(root, "public", "route-css", file)).mtimeMs);
      versionCache.set(file, version);
    } catch {
      return `/route-css/${file}?v=0`;
    }
  }
  return `/route-css/${file}?v=${version}`;
}
