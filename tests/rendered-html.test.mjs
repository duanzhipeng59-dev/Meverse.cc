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

test("server-renders the MeVerse landing page with a workspace entry", async () => {
  const response = await render("/");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /MeVerse/);
  assert.match(html, /AI 生辰画像/u);
  assert.match(html, /立即探索/u);
  assert.match(html, /\/home\/relationship-test/u);
  assert.doesNotMatch(html, /\/home\/dual-star-match/u); // 偶像合盘入口卡已从首页移除,合盘经底部导航进入
  assert.doesNotMatch(html, /25 个关系情境|完成具体相处情境/u);
});

test("server-renders relationship-test discovery inside the workspace", async () => {
  const response = await render("/home/relationship-test");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /生辰画像/u);
  assert.match(html, /明星生辰画像合集/u); // 列表页独立 SEO 标题(旧断言的"合盘"来自布局级 description)
  assert.match(html, /个人中心/u);
  assert.match(html, /田柾国/u);
  assert.doesNotMatch(html, /关系情境|答题|计分/u);
});

test("star detail resolves as preview page; unknown ids 404", async () => {
  // 已知明星用 bang-chan:单人详情的离线兜底名单只有 3 名元老(jungkook 只在
  // Supabase),测试环境取不到云端时详情页会 404;选兜底名单内的人让断言不依赖数据库可达。
  // 未知 id 由 generateMetadata 阶段 notFound() 返回硬 404(组件内 notFound 是流式软 404)。
  const preview = await render("/home/relationship-test/bang-chan");
  assert.equal(preview.status, 200);
  const missing = await render("/home/relationship-test/not-a-real-star");
  assert.equal(missing.status, 404);
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
  assert.match(html, /报告/u);
  assert.match(html, /自动保存你查看和生成的报告/u);
});

test("payment pages are fully removed from the frontend", async () => {
  for (const path of ["/home/upgrade", "/orders", "/invitations"]) {
    await assert.rejects(() => readFile(new URL(`../app${path === "/home/upgrade" ? "/home/upgrade" : path}/page.tsx`, import.meta.url), "utf8"), /ENOENT/u, `${path} page must not exist`);
  }
  const shell = await readFile(new URL("../app/home/workspace-shell.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(shell, /upgrade|订阅升级/u);
});

test("uses unified four-tab navigation, keeps the empty reports state minimal", async () => {
  const [workspaceShell, reportsBrowser] = await Promise.all([
    readFile(new URL("../app/home/workspace-shell.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/home/reports/reports-browser.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(workspaceShell, /aria-label="工作台主菜单"/u);
  // 两个一级 Tab:发现/合盘;报告入口在个人中心,个人中心在顶部导航
  assert.match(workspaceShell, /label: "发现"[\s\S]*?label: "解读"/u);
  assert.doesNotMatch(workspaceShell, /label: "首页"|label: "报告"|label: "我的"/u);
  assert.match(workspaceShell, /mf-mobile-profile-btn/u);
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

test("unified MeVerse branding and bucket-only portraits", async () => {
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
  assert.match(layout, /MeVerse/);
  assert.match(css, /var\(--portrait-image\)/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(packageJson, /"name": "myfate"/);
  // 头像素材只存在于 Supabase bucket:public/ 下不允许再出现本地头像文件(logo/OG 分享图除外)
  const STATIC_IMAGE_ALLOWLIST = new Set(["myfate-stars.png", "og-meverse.jpg", "myfate-logo.png", "myfate-logo-mark.png", "meverse-logo.png"]);
  const publicDir = await readdir(new URL("../public/", import.meta.url));
  const leftoverPortraits = publicDir.filter((filename) => /\.(webp|png|jpe?g)$/i.test(filename) && !STATIC_IMAGE_ALLOWLIST.has(filename));
  assert.deepEqual(leftoverPortraits, [], `public/ 不应再有本地头像: ${leftoverPortraits.join(", ")}`);
});

test("single reading hands the model chart + template in one call and renders nine sections", async () => {
  const [pipeline, contract, page, renderer, provider] = await Promise.all([
    readFile(new URL("../app/myfate-reading-generator.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/myfate-static-reading.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/home/reading/[id]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/home/reading/[id]/static-reading-report.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/myfate/personalize/model-provider.ts", import.meta.url), "utf8"),
  ]);
  assert.match(pipeline, /buildStaticReadingFacts\(chart, profile\)/u);
  assert.doesNotMatch(pipeline, /wealthRangeOf|buildStarFacts|mergeStarAiContent/u);
  // 架构:模型只收三样东西——排盘数据、按模版解读的指令、模版;无两段式论证计划
  assert.match(contract, /single-full-v3/u);
  assert.match(contract, /timelines: z\.object/u);
  assert.match(contract, /TEMPLATE_SECTIONS/u);
  assert.match(contract, /buildStaticReadingPrompt\(facts, profile\??\)/u);
  assert.doesNotMatch(contract, /staticReadingPlanSchema|STATIC_READING_PLAN_UNKNOWN_EVIDENCE/u);
  assert.match(page, /staticReadingSchema\.safeParse\(report\.content\)/u);
  assert.doesNotMatch(renderer, /命理依据|mf-rr-basis|证据：/u);
  // 引擎时间线区块已移除,报告只呈现模型输出
  assert.doesNotMatch(renderer, /一生事业轨迹|mf-rr-timeline/u);
  assert.match(provider, /options\.json[\s\S]*?json_object/u);
});
