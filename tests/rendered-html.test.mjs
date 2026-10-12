import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

async function render(pathname = "/", init = {}) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const headers = new Headers(init.headers);
  if (!headers.has("accept")) headers.set("accept", "text/html");

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      ...init,
      headers,
      redirect: init.redirect ?? "manual",
    }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Myfate landing page with a workspace entry", async () => {
  const response = await render("/");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Myfate/);
  assert.match(html, /AI 生辰画像/u);
  assert.match(html, /立即探索/u);
  assert.match(html, /\/home\/relationship-test/u);
  assert.match(html, /\/home\/dual-star-match/u);
  assert.doesNotMatch(html, /25 个关系情境|完成具体相处情境/u);
});

test("server-renders relationship-test discovery inside the workspace", async () => {
  const response = await render("/home/relationship-test");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /生辰画像/u);
  assert.match(html, /双人合盘/u);
  assert.match(html, /个人中心/u);
  assert.match(html, /Bang Chan/u);
  assert.doesNotMatch(html, /关系情境|答题|计分/u);
});

test("retired star detail pages no longer resolve inside the workspace", async () => {
  const response = await render("/home/relationship-test/hyunjin");
  assert.equal(response.status, 404);
});

test("requires login before opening the star report flow", async () => {
  const response = await render("/home/relationship-test/bang-chan/test");
  assert.equal(response.status, 307);
  const location = new URL(response.headers.get("location"));
  assert.equal(location.pathname, "/login");
  assert.equal(location.searchParams.get("next"), "/home/relationship-test/bang-chan/test");
});

test("server-renders the editable workspace profile", async () => {
  const response = await render("/home/profile");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /个人中心/u);
  assert.doesNotMatch(html, /MBTI/u);
  assert.doesNotMatch(html, /保存资料/u);
});

test("redirects the retired behavior questionnaire to the composite workspace", async () => {
  const response = await render("/home/relationship-profile");
  assert.equal(response.status, 307);
  assert.equal(new URL(response.headers.get("location")).pathname, "/home/relationship-test");
  const testResponse = await render("/home/relationship-profile/test");
  assert.equal(testResponse.status, 307);
  assert.equal(new URL(testResponse.headers.get("location")).pathname, "/home/relationship-test");
});

test("uses server-verified email codes on the login page", async () => {
  const [login, authContext] = await Promise.all([
    readFile(new URL("../app/login/local-login.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/auth-context.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(login, /fetch\("\/api\/auth\/email-code"/u);
  assert.match(login, /fetch\("\/api\/auth\/login"/u);
  assert.match(login, /codeCooldown/u);
  assert.match(login, /验证码已发送，请检查收件箱和垃圾邮件/u);
  assert.doesNotMatch(login, /Math\.random\(\)|本地验证码/u);
  assert.match(authContext, /fetch\("\/api\/auth\/session"/u);
  assert.doesNotMatch(authContext, /if \(email\) return \{ status: "authenticated"/u);
});

test("server-renders the cloud-backed report history workspace", async () => {
  const response = await render("/home/reports");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /已解锁报告/u);
  assert.match(html, /按最近浏览排序/u);
});

test("payment pages are fully removed from the frontend", async () => {
  for (const path of ["/home/upgrade", "/orders", "/invitations"]) {
    await assert.rejects(() => readFile(new URL(`../app${path === "/home/upgrade" ? "/home/upgrade" : path}/page.tsx`, import.meta.url), "utf8"), /ENOENT/u, `${path} page must not exist`);
  }
  const shell = await readFile(new URL("../app/home/workspace-shell.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(shell, /upgrade|订阅升级/u);
});

test("uses sidebar and bottom tab navigation, keeps the empty reports state minimal", async () => {
  const [workspaceShell, reportsBrowser] = await Promise.all([
    readFile(new URL("../app/home/workspace-shell.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/home/reports/reports-browser.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(workspaceShell, /aria-label="工作台主菜单"/u);
  assert.match(workspaceShell, /生辰画像[\s\S]*?双人合盘/u);
  assert.doesNotMatch(workspaceShell, /订阅升级/u);
  assert.match(workspaceShell, /aria-label="底部导航"[\s\S]*?mf-mobile-tab/u);
  assert.doesNotMatch(workspaceShell, /完善专属资料|完善个人资料提醒/u);
  assert.doesNotMatch(reportsBrowser, /开始关系画像/u);
});

test("supports manual report deletion and keeps legacy formats score-free", async () => {
  const [reportStorage, reportDetailApi, resultTypes] = await Promise.all([
    readFile(new URL("../app/myfate-report-storage.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/myfate/reports/[id]/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/myfate-generated-test-types.ts", import.meta.url), "utf8"),
  ]);
  assert.match(reportStorage, /method: "DELETE"/u);
  assert.match(reportDetailApi, /\.eq\("user_id", session\.user\.id\)/u);
  assert.match(resultTypes, /MYFATE_COMPOSITE_V3/u);
  assert.doesNotMatch(resultTypes, /ThreePillarCompositeResult = \{[^}]*score:/su);
  assert.doesNotMatch(resultTypes, /Vedic|vedic/u);
});

test("requires login for cloud report data", async () => {
  const response = await render("/api/myfate/reports", { headers: { accept: "application/json" } });
  assert.equal(response.status, 401);
  const result = await response.json();
  assert.equal(result.error, "login_required");
});

test("redirects legacy celebrity details into the protected workspace", async () => {
  const response = await render("/celebrity/bang-chan");
  assert.equal(response.status, 307);
  assert.equal(new URL(response.headers.get("location")).pathname, "/home/relationship-test/bang-chan");
});

test("blocks cross-origin mutations at the proxy", async () => {
  const response = await render("/api/myfate/personalize", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ action: "report", reportType: "celebrity-match", starId: "james" }),
  });
  assert.equal(response.status, 403);
  const result = await response.json();
  assert.equal(result.error, "cross_origin_blocked");
});

test("requires login before generating a free-form report", async () => {
  const response = await render("/api/myfate/personalize", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      origin: "http://localhost",
      "x-forwarded-host": "localhost",
    },
    body: JSON.stringify({
      action: "report",
      reportType: "celebrity-match",
      starId: "james",
      answers: [{
        question: "如果 James 需要独处，你会怎么做？",
        answer: "尊重空间并约定联系时间",
      }],
    }),
  });
  assert.equal(response.status, 401);
  const result = await response.json();
  assert.equal(result.error, "LOGIN_REQUIRED");
});

test("unified Myfate branding and bucket-only portraits", async () => {
  // 品牌样式已拆分到 globals.css 与 public/route-css/*,断言在合并结果上进行
  const [layout, packageJson] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);
  const cssFiles = [
    "../app/globals.css",
    "../public/route-css/public-home.css",
    "../public/route-css/home.css",
    "../public/route-css/login.css",
    "../public/route-css/account.css",
  ];
  const css = (await Promise.all(cssFiles.map((file) => readFile(new URL(file, import.meta.url), "utf8")))).join("\n");
  assert.match(layout, /Myfate/);
  assert.match(css, /var\(--portrait-image\)/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(packageJson, /"name": "myfate"/);
  // 头像素材只存在于 Supabase bucket:public/ 下不允许再出现本地头像文件(logo/OG 分享图除外)
  const STATIC_IMAGE_ALLOWLIST = new Set(["myfate-stars.png", "og.png"]);
  const publicDir = await readdir(new URL("../public/", import.meta.url));
  const leftoverPortraits = publicDir.filter((filename) => /\.(webp|png|jpe?g)$/i.test(filename) && !STATIC_IMAGE_ALLOWLIST.has(filename));
  assert.deepEqual(leftoverPortraits, [], `public/ 不应再有本地头像: ${leftoverPortraits.join(", ")}`);
});
