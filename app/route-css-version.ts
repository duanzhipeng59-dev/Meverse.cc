import { statSync } from "node:fs";
import { join } from "node:path";

// route-css 拆分样式是手改直发(不走构建管线),href 必须带版本参数:
// 文件 mtime 一变 URL 即变,浏览器必然重新拉取,避免"改了样式要等缓存过期/强刷"的假象。
// 读不到文件(异常部署环境)时退化为固定值,仍可依赖 etag 协商。
const versionCache = new Map<string, string>();

export function routeCssHref(file: string): string {
  let version = versionCache.get(file);
  if (version === undefined) {
    try {
      version = String(statSync(join(process.cwd(), "public", "route-css", file)).mtimeMs);
    } catch {
      version = "0";
    }
    versionCache.set(file, version);
  }
  return `/route-css/${file}?v=${version}`;
}
