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
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /Myfate/);
  assert.match(html, /会是你的正缘吗/u);
  assert.match(html, /选择心动对象/u);
  assert.match(html, /缘分星图示例/u);
  assert.doesNotMatch(html, /缘分预览/u);
  assert.match(html, /\/home\/celebrity-match/);
  assert.match(html, /Bang Chan/u);
  assert.match(html, /Seonghyeon/u);
  assert.doesNotMatch(html, /href="\/celebrity\//);
  assert.doesNotMatch(html, /Gemini Pro|立即订阅/u);
});

test("server-renders celebrity discovery inside the workspace", async () => {
  const response = await render("/home/celebrity-match");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /正缘测试/u);
  assert.match(html, /个人中心/u);
  assert.match(html, /\/login\?next=%2Fhome%2Fcelebrity-match/u);
  assert.match(html, /Bang Chan/u);
  assert.match(html, /Seonghyeon/u);
  assert.match(html, /\/home\/celebrity-match\/bang-chan/);
  assert.doesNotMatch(html, /按艺人类型筛选/u);
  assert.doesNotMatch(html, /24 道关系情境|约 6 分钟完成/u);
});

test("server-renders a celebrity detail inside the workspace", async () => {
  const response = await render("/home/celebrity-match/hyunjin");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Hyunjin/u);
  assert.match(html, /正缘测试/u);
  assert.match(html, /返回工作区/u);
  assert.match(html, /\/home\/celebrity-match/);
  assert.match(html, /href="\/home\/celebrity-match\/hyunjin\/test"/);
  assert.doesNotMatch(html, /\/login\?next=%2Fhome%2Fcelebrity-match%2Fhyunjin%2Ftest/);
  assert.match(html, /mf-workspace-detail/u);
});

test("keeps the workspace around the question and report flow", async () => {
  const response = await render("/home/celebrity-match/bang-chan/test");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /正缘测试/u);
  assert.match(html, /心动行为测试/u);
  assert.match(html, /24/u);
  assert.match(html, /个人中心/u);
  assert.match(html, /返回详情/u);
  assert.match(html, /mf-workspace-test/u);
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

test("server-renders the behavior profile workspace without the question-count summary", async () => {
  const response = await render("/home/relationship-profile");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /行为画像分析/u);
  assert.match(html, /href="\/home\/relationship-profile\/test"/);
  assert.doesNotMatch(html, /24 道行为情境|约 5 分钟完成/u);
});

test("lets guests finish both questionnaires before login gates the results", async () => {
  const [celebrityEntry, celebrityTest, profileTest] = await Promise.all([
    readFile(new URL("../app/home/celebrity-match/[id]/test/workspace-test-entry.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/myfate-test.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/home/relationship-profile/test/relationship-profile-test.tsx", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(celebrityEntry, /status === "anonymous"/u);
  assert.match(celebrityTest, /myfate-pending-fate-test/u);
  assert.match(profileTest, /myfate-pending-relationship-profile/u);
  assert.match(celebrityTest, /完成测试/u);
  assert.match(celebrityTest, /登录查看报告/u);
  assert.match(profileTest, /登录并生成报告/u);
  assert.doesNotMatch(celebrityTest, /补全你的专属资料|userMbti|userBirthDate/u);
  assert.doesNotMatch(profileTest, /补全你的专属资料|birthDate|mbti/u);
  assert.match(celebrityTest, /sessionStorage/u);
  assert.match(profileTest, /sessionStorage/u);
});

test("server-renders the cloud-backed report history workspace", async () => {
  const response = await render("/home/reports");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /我的报告/u);
  assert.match(html, /每一次心动，都有迹可循/u);
  assert.match(html, /正缘测试与关系行为画像/u);
  assert.match(html, /份历史报告/u);
});

test("uses a mobile drawer menu and keeps the empty reports state minimal", async () => {
  const [workspaceShell, reportsWorkspace] = await Promise.all([
    readFile(new URL("../app/home/workspace-shell.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/home/reports/reports-workspace.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(workspaceShell, /打开工作台菜单/u);
  assert.match(workspaceShell, /<dialog/u);
  assert.match(workspaceShell, /手机端工作台主菜单/u);
  assert.doesNotMatch(workspaceShell, /完善专属资料|完善个人资料提醒/u);
  assert.doesNotMatch(reportsWorkspace, /开始关系画像/u);
});

test("saves, reuses, upgrades, and manually deletes report history", async () => {
  const [testExperience, reportStorage, reportApi, reportDetailApi, reportDetail, advancedReport, reportAwareEntry, guardedTestEntry, reportsWorkspace, relationshipStorage] = await Promise.all([
    readFile(new URL("../app/myfate-test.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/myfate-report-storage.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/myfate/reports/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/myfate/reports/[id]/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/home/reports/[id]/report-detail-workspace.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/myfate-advanced-report.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/home/celebrity-match/report-aware-entry.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/home/celebrity-match/[id]/test/workspace-test-entry.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/home/reports/reports-workspace.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/relationship-profile-storage.ts", import.meta.url), "utf8"),
  ]);
  assert.match(testExperience, /createSavedReport/u);
  assert.match(testExperience, /status: "advanced"/u);
  assert.match(testExperience, /查看历史报告/u);
  assert.match(reportStorage, /fetch\("\/api\/myfate\/reports"/u);
  assert.match(reportStorage, /migrateLegacyReports/u);
  assert.match(reportStorage, /localStorage\.removeItem/u);
  assert.match(reportApi, /requireReportUser/u);
  assert.match(reportApi, /\.eq\("user_id", session\.user\.id\)/u);
  assert.match(reportDetailApi, /\.eq\("user_id", session\.user\.id\)/u);
  assert.match(reportStorage, /method: "DELETE"/u);
  assert.match(reportStorage, /readLatestSavedReportForStar/u);
  assert.match(reportStorage, /"initial" \| "generating" \| "advanced"/u);
  assert.match(reportStorage, /deleteSavedReport/u);
  assert.match(reportDetail, /MyfateAdvancedReport/u);
  assert.match(reportDetail, /test\?restart=1/u);
  assert.match(reportDetail, /返回明星工作台/u);
  assert.match(reportDetail, /关系报告正在生成/u);
  assert.match(advancedReport, /mf-model-report-sections/u);
  assert.match(advancedReport, /mf-model-report-section/u);
  assert.match(advancedReport, /mf-model-report-subsection/u);
  assert.match(advancedReport, /mf-relationship-orbit/u);
  assert.match(advancedReport, /mf-model-report-facts/u);
  assert.doesNotMatch(advancedReport, /缘分结构|七个关系板块|初始吸引|综合匹配度/u);
  assert.match(reportAwareEntry, /查看关系报告/u);
  assert.match(reportAwareEntry, /重新生成报告/u);
  assert.match(reportAwareEntry, /报告生成中/u);
  assert.match(reportAwareEntry, /from=celebrity-match/u);
  assert.match(guardedTestEntry, /questions=\{questions\}/u);
  assert.doesNotMatch(guardedTestEntry, /allowRetest|router\.replace/u);
  assert.match(reportsWorkspace, /window\.confirm/u);
  assert.match(reportsWorkspace, /删除后无法恢复/u);
  assert.match(reportsWorkspace, /正在阅读本次选择并生成报告/u);
  assert.match(relationshipStorage, /deleteRelationshipReport/u);
});

test("requires login for cloud report data", async () => {
  const response = await render("/api/myfate/reports", { headers: { accept: "application/json" } });
  assert.equal(response.status, 401);
  const result = await response.json();
  assert.equal(result.error, "login_required");
});

test("server-renders a celebrity detail and its test entry", async () => {
  const response = await render("/celebrity/bang-chan");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Bang Chan/u);
  assert.match(html, /情感人格/u);
  assert.match(html, /ENFJ/);
  assert.match(html, /丁丑 · 己酉 · 戊寅/u);
  assert.match(html, /主动守护的共建型/u);
  assert.match(html, /真诚回应 · 共同成长 · 稳定承诺/u);
  assert.match(html, /测试 TA 是否是你的正缘/u);
  assert.match(html, /\/test\/bang-chan/);
});

test("uses the full managed question bank with a free-form model-only report", async () => {
  const [testPage, data, testExperience, advancedReport, prompt, reportTemplate, relationshipTest] = await Promise.all([
    readFile(new URL("../app/test/[id]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/myfate-data.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/myfate-test.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/myfate-advanced-report.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/myfate/personalize/report-prompt.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/myfate/personalize/celebrity-report-template.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/home/relationship-profile/test/relationship-profile-test.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(testPage, /MyfateTest/);
  assert.match(data, /createInitialQuestions/);
  assert.match(data, /你会怎么陪 TA/u);
  assert.equal((data.match(/id: "idol-/g) ?? []).length, 24);
  assert.match(testExperience, /心动行为测试 · \{currentQuestions\.length\} 题/u);
  assert.match(testExperience, /reportType: "celebrity-match"/u);
  assert.match(testExperience, /options: question\.options\.map/u);
  assert.match(testExperience, /answer: option\.label/u);
  assert.match(testExperience, /starId: star\.id/u);
  assert.doesNotMatch(testExperience, /score|userMbti|userBirthDate|birthDate|profileCompatibility/u);
  assert.match(advancedReport, /mf-model-report-sections/u);
  assert.doesNotMatch(advancedReport, /score|七个关系板块|初始吸引|长期稳定/u);
  assert.match(prompt, /九段结构/u);
  assert.match(prompt, /后台配置的目标人物提示词/u);
  assert.match(prompt, /idolPrompt: input\.idolPrompt/u);
  assert.match(prompt, /不得计算或展示分数、百分比/u);
  assert.doesNotMatch(prompt, /targetProfile|starProfile/u);
  assert.match(prompt, /allOptions: answer\.options/u);
  assert.match(reportTemplate, /整体相处模式与需求共鸣综述/u);
  assert.match(reportTemplate, /目标人物的真实渴望总结/u);
  assert.match(reportTemplate, /三大维度互动特质解析/u);
  assert.match(reportTemplate, /测试者最能自然滋养 TA 的特质/u);
  assert.match(reportTemplate, /目标人物的盲点\/防御/u);
  assert.match(reportTemplate, /长期相处中最可能感到疲惫/u);
  assert.match(reportTemplate, /核心风险与雷区预警/u);
  assert.match(reportTemplate, /健康支持与相处底线提示/u);
  assert.match(reportTemplate, /关系相处规则/u);
  assert.match(reportTemplate, /每个主板块必须使用上述【小标题】结构/u);
  assert.match(reportTemplate, /关系类型｜/u);
  assert.match(reportTemplate, /关系主标题｜/u);
  assert.match(reportTemplate, /关系导语｜/u);
  assert.match(reportTemplate, /核心张力｜/u);
  assert.match(reportTemplate, /时间窗口与建议地点类型/u);
  assert.match(relationshipTest, /options: question\.options\.map/u);
  assert.match(relationshipTest, /answer: option\.label/u);
  assert.doesNotMatch(relationshipTest, /calculateRelationshipScores|relationshipArchetype|birthDate|mbti/u);
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
