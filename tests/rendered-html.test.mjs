import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
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
  assert.match(html, /三柱的关系结构/u);
  assert.match(html, /选择合盘对象/u);
  assert.match(html, /查看合盘分析/u);
  assert.match(html, /\/home\/relationship-test/u);
  assert.match(html, /基于传统文化典籍与固定规则生成/u);
  assert.match(html, /不构成科学结论、现实关系判断或专业建议/u);
  assert.doesNotMatch(html, /25 个关系情境|完成具体相处情境/u);
});

test("server-renders relationship-test discovery inside the workspace", async () => {
  const response = await render("/home/relationship-test");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /明星合盘/u);
  assert.match(html, /个人中心/u);
  assert.match(html, /输入你的出生日期/u);
  assert.match(html, /Bang Chan/u);
  assert.match(html, /\/login\?next=%2Fhome%2Frelationship-test&amp;from=%2Fhome%2Frelationship-test/u);
  assert.doesNotMatch(html, /关系情境|答题|计分/u);
});

test("requires login before opening a celebrity detail", async () => {
  const response = await render("/home/relationship-test/hyunjin");
  assert.equal(response.status, 307);
  const location = new URL(response.headers.get("location"));
  assert.equal(location.pathname, "/login");
  assert.equal(location.searchParams.get("next"), "/home/relationship-test");
  assert.equal(location.searchParams.get("from"), "/home/relationship-test");
  const html = await response.text();
  assert.doesNotMatch(html, /Hyunjin|mf-workspace-detail/u);
});

test("requires login before opening the direct composite flow", async () => {
  const response = await render("/home/relationship-test/bang-chan/test");
  assert.equal(response.status, 307);
  const location = new URL(response.headers.get("location"));
  assert.equal(location.pathname, "/login");
  assert.equal(location.searchParams.get("next"), "/home/relationship-test");
});

test("server-renders the editable workspace profile", async () => {
  const response = await render("/home/profile");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /登录邮箱/u);
  assert.match(html, /出生年月日/u);
  assert.match(html, /地点/u);
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

test("requires login and birth date before creating a cloud composite report", async () => {
  const [celebrityDetail, celebrityEntry, compositeClient, compositeRoute, retiredProfileTest] = await Promise.all([
    readFile(new URL("../app/celebrity-detail.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/home/celebrity-match/report-aware-entry.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/myfate-generated-test.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/myfate/composite/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/home/relationship-profile/test/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(celebrityDetail, /三柱 \{star\.threePillars\}/u);
  assert.doesNotMatch(celebrityDetail, /\{star\.mbti\}|\{star\.birthDate\}/u);
  assert.match(celebrityEntry, /查看合盘报告|查看你与 TA 的合盘分析/u);
  assert.match(compositeClient, /status === "anonymous"/u);
  assert.match(compositeClient, /validBirthDate/u);
  assert.match(compositeClient, /fetch\("\/api\/myfate\/composite"/u);
  assert.match(compositeClient, /writeBasicProfile/u);
  assert.doesNotMatch(compositeClient, /questions|answers|generated-tests/u);
  assert.match(compositeRoute, /requireReportUser/u);
  assert.match(compositeRoute, /analyzeThreePillars/u);
  assert.match(compositeRoute, /user_id: session\.user\.id/u);
  assert.match(compositeRoute, /status: "advanced"/u);
  assert.match(retiredProfileTest, /redirect\("\/home\/relationship-test"\)/u);
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
  assert.match(html, /我的报告/u);
  assert.match(html, /明星三柱合盘与历史画像/u);
  assert.match(html, /份历史报告/u);
});

test("renders package and single relationship upgrade options", async () => {
  const response = await render("/home/upgrade");
  assert.equal(response.status, 200);
  const html = await response.text();
  const upgradeSource = await readFile(new URL("../app/home/upgrade/upgrade-workspace.tsx", import.meta.url), "utf8");
  assert.match(html, /订阅升级/u);
  assert.match(html, /套餐购买/u);
  assert.match(html, /按次购买/u);
  assert.match(html, /体验版/u);
  assert.match(html, /探索版/u);
  assert.match(html, /深度版/u);
  assert.match(html, /mf-upgrade-plan-price"><small>¥<\/small>89/u);
  assert.match(html, /mf-upgrade-plan-price"><small>¥<\/small>239/u);
  assert.match(html, /mf-upgrade-plan-price"><small>¥<\/small>499/u);
  assert.match(html, /<strong>3 次关系合盘<\/strong>/u);
  assert.match(html, /<strong>10 次关系合盘<\/strong>/u);
  assert.match(html, /<strong>30 次关系合盘<\/strong>/u);
  assert.match(html, /登录后购买/u);
  assert.match(html, /一次购买，不自动续费/u);
  assert.match(upgradeSource, /name: "单次合盘"[\s\S]*?price: 50[\s\S]*?uses: 1/u);
  assert.doesNotMatch(upgradeSource, /会员|按月发放|月度会员|年度会员/u);
});

test("uses a mobile drawer menu and keeps the empty reports state minimal", async () => {
  const [workspaceShell, reportsWorkspace] = await Promise.all([
    readFile(new URL("../app/home/workspace-shell.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/home/reports/reports-workspace.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(workspaceShell, /打开工作台菜单/u);
  assert.match(workspaceShell, /<dialog/u);
  assert.match(workspaceShell, /手机端工作台主菜单/u);
  assert.match(workspaceShell, /mf-workspace-account[\s\S]*?订阅升级[\s\S]*?个人中心/u);
  assert.match(workspaceShell, /mf-mobile-menu-account[\s\S]*?订阅升级[\s\S]*?个人中心/u);
  assert.doesNotMatch(workspaceShell, /完善专属资料|完善个人资料提醒/u);
  assert.doesNotMatch(reportsWorkspace, /开始关系画像/u);
});

test("saves, reuses, and manually deletes cloud composite reports", async () => {
  const [compositeClient, compositeRoute, reportStorage, reportDetailApi, reportDetail, reportAwareEntry, reportsWorkspace, resultTypes] = await Promise.all([
    readFile(new URL("../app/myfate-generated-test.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/myfate/composite/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/myfate-report-storage.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/myfate/reports/[id]/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/home/reports/[id]/report-detail-workspace.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/home/celebrity-match/report-aware-entry.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/home/reports/reports-workspace.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/myfate-generated-test-types.ts", import.meta.url), "utf8"),
  ]);
  assert.match(compositeClient, /查看历史报告/u);
  assert.match(compositeRoute, /myfate_reports/u);
  assert.match(compositeRoute, /serializeFormulaResult/u);
  assert.match(reportStorage, /method: "DELETE"/u);
  assert.match(reportDetailApi, /\.eq\("user_id", session\.user\.id\)/u);
  assert.match(reportDetail, /三柱合盘分析/u);
  assert.match(reportAwareEntry, /查看合盘报告/u);
  assert.match(reportsWorkspace, /window\.confirm/u);
  assert.match(reportsWorkspace, /三柱合盘/u);
  assert.match(resultTypes, /MYFATE_COMPOSITE_V3/u);
  assert.doesNotMatch(resultTypes, /ThreePillarCompositeResult = \{[^}]*score:/su);
});

test("requires login for cloud report data", async () => {
  const response = await render("/api/myfate/reports", { headers: { accept: "application/json" } });
  assert.equal(response.status, 401);
  const result = await response.json();
  assert.equal(result.error, "login_required");
});

test("keeps celebrity content authoritative and protects the hidden studio", async () => {
  const [starsServer, adminPage, adminStudio, adminContentApi, retiredProfilePage] = await Promise.all([
    readFile(new URL("../app/myfate-stars-server.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/studio/orbit/mf-7k9v2q4x/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/studio/orbit/mf-7k9v2q4x/studio.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/content/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/home/relationship-profile/test/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(starsServer, /return data \? mapCelebrity/u);
  assert.match(adminPage, /requireAdmin/u);
  assert.match(adminPage, /notFound/u);
  assert.match(adminContentApi, /requireAdmin\(request\)/u);
  assert.doesNotMatch(adminStudio, /题库管理|AdminQuestion|questionDraft/u);
  assert.match(adminStudio, /dropCelebrityCard/u);
  assert.match(adminStudio, /draggable=\{!busy\}/u);
  assert.match(retiredProfilePage, /redirect/u);
  const [hiddenPage, contentApi] = await Promise.all([
    render("/studio/orbit/mf-7k9v2q4x"),
    render("/api/admin/content", { headers: { accept: "application/json" } }),
  ]);
  assert.equal(hiddenPage.status, 404);
  assert.equal(contentApi.status, 401);
});

test("redirects legacy celebrity details into the protected workspace", async () => {
  const response = await render("/celebrity/bang-chan");
  assert.equal(response.status, 307);
  assert.equal(new URL(response.headers.get("location")).pathname, "/home/relationship-test/bang-chan");
});

test("creates a direct server-side composite without questions or scores", async () => {
  const [compositeClient, compositeRoute, formulaResult, resultTypes] = await Promise.all([
    readFile(new URL("../app/myfate-generated-test.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/myfate/composite/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/myfate-formula-result.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/myfate-generated-test-types.ts", import.meta.url), "utf8"),
  ]);
  assert.match(compositeClient, /输入你的出生日期/u);
  assert.match(compositeClient, /fetch\("\/api\/myfate\/composite"/u);
  assert.doesNotMatch(compositeClient, /questions|answers|查看关系身份/u);
  assert.match(compositeRoute, /analyzeThreePillars/u);
  assert.match(compositeRoute, /dimensions:/u);
  assert.match(compositeRoute, /score: 0/u);
  assert.doesNotMatch(compositeRoute, /generateReportText|DEEPSEEK/u);
  assert.match(formulaResult, /不进行分数、排名或好坏判定/u);
  assert.match(formulaResult, /result\.dimensions/u);
  assert.doesNotMatch(formulaResult, /result\.score|%/u);
  assert.match(resultTypes, /version: 3/u);
  assert.doesNotMatch(resultTypes, /ThreePillarCompositeResult = \{[^}]*score:/su);
});

test("rejects anonymous composite requests before reading private report data", async () => {
  const response = await render("/api/myfate/composite", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ starId: "hyunjin", birthDate: "2000-01-01" }),
  });
  assert.equal(response.status, 401);
  const result = await response.json();
  assert.equal(result.error, "LOGIN_REQUIRED");
});

test("requires the configured model for a free-form report", async () => {
  const response = await render("/api/myfate/personalize", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
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
  assert.equal(response.status, 503);
  const result = await response.json();
  assert.equal(result.error, "MODEL_NOT_CONFIGURED");
});

test("ships local portraits and unified Myfate branding", async () => {
  const [layout, css, packageJson] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/myfate.css", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);
  assert.match(layout, /Myfate/);
  assert.match(css, /var\(--portrait-image\)/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(packageJson, /"name": "myfate"/);
  await Promise.all([
    "bang-chan.webp",
    "hyunjin.webp",
    "james.webp",
    "juhoon.webp",
    "keonho.webp",
    "seonghyeon.webp",
  ].map((filename) => access(new URL(`../public/${filename}`, import.meta.url))));
});
