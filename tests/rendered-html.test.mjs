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
  assert.match(html, /明星正缘测试/u);
  assert.match(html, /个人中心/u);
  assert.match(html, /退出登录/u);
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
  assert.match(html, /明星正缘测试/u);
  assert.match(html, /返回工作区/u);
  assert.match(html, /\/home\/celebrity-match/);
  assert.match(html, /\/home\/celebrity-match\/hyunjin\/test/);
  assert.match(html, /mf-workspace-detail/u);
});

test("keeps the workspace around the question and report flow", async () => {
  const response = await render("/home/celebrity-match/bang-chan/test");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /明星正缘测试/u);
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
  assert.match(html, /MBTI/u);
  assert.doesNotMatch(html, /保存资料/u);
});

test("server-renders the local report history workspace", async () => {
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
  assert.doesNotMatch(reportsWorkspace, /开始关系画像/u);
});

test("saves, reuses, upgrades, and manually deletes report history", async () => {
  const [testExperience, reportStorage, reportDetail, advancedReport, reportAwareEntry, guardedTestEntry, reportsWorkspace, relationshipStorage] = await Promise.all([
    readFile(new URL("../app/myfate-test.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/myfate-report-storage.ts", import.meta.url), "utf8"),
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
  assert.match(reportStorage, /\[report, \.\.\.readSavedReports\(email\)\]/u);
  assert.match(reportStorage, /report\.id !== reportId/u);
  assert.match(reportStorage, /readLatestSavedReportForStar/u);
  assert.match(reportStorage, /deleteSavedReport/u);
  assert.match(reportDetail, /MyfateAdvancedReport/u);
  assert.match(reportDetail, /test\?restart=1/u);
  assert.match(reportDetail, /返回明星工作台/u);
  assert.match(advancedReport, /<h2>缘分结构<\/h2>/u);
  assert.match(advancedReport, /七个关系板块/u);
  assert.match(advancedReport, /初始吸引/u);
  assert.match(advancedReport, /宿命\/烙印感/u);
  assert.match(advancedReport, /冲突消耗/u);
  assert.match(advancedReport, /深层关系解码/u);
  assert.match(reportAwareEntry, /查看高级报告/u);
  assert.match(reportAwareEntry, /查看初步报告/u);
  assert.match(reportAwareEntry, /from=celebrity-match/u);
  assert.match(guardedTestEntry, /allowRetest/u);
  assert.match(guardedTestEntry, /router\.replace/u);
  assert.match(reportsWorkspace, /window\.confirm/u);
  assert.match(reportsWorkspace, /删除后无法恢复/u);
  assert.match(relationshipStorage, /deleteRelationshipReport/u);
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

test("includes a progressive question flow with a model-only advanced report", async () => {
  const [testPage, data, testExperience, progressiveProfile, advancedReport] = await Promise.all([
    readFile(new URL("../app/test/[id]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/myfate-data.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/myfate-test.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/myfate-progressive-profile.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/myfate-advanced-report.tsx", import.meta.url), "utf8"),
  ]);
  const advancedExperience = `${testExperience}\n${advancedReport}`;
  assert.match(testPage, /MyfateTest/);
  assert.match(data, /createInitialQuestions/);
  assert.match(data, /演出结束后，\$\{star\.name\}/u);
  assert.equal((data.match(/id: "idol-/g) ?? []).length, 24);
  assert.doesNotMatch(testExperience, /adaptive-test|createFallbackAdaptiveQuestions/u);
  assert.match(testExperience, /心动行为测试 · \{initialQuestions\.length\} 题/u);
  assert.match(testExperience, /解锁缘分高级报告/u);
  assert.match(testExperience, /最终正缘解读/u);
  assert.match(advancedExperience, /绝对|可能|也许|不太像|不是/u);
  assert.match(advancedExperience, /命中注定/u);
  assert.match(advancedExperience, /红颜祸水/u);
  assert.match(advancedExperience, /些许暧昧/u);
  assert.match(advancedExperience, /缘分较浅/u);
  assert.match(advancedExperience, /平行时空/u);
  assert.match(testExperience, /calculateProgressiveCompatibility/u);
  assert.match(testExperience, /recordProgressiveTest/u);
  assert.match(progressiveProfile, /myfate-progressive-profile:v1/u);
  assert.match(progressiveProfile, /completedTests === 0\) return 24/u);
  assert.match(progressiveProfile, /completedTests === 1\) return 16/u);
  assert.match(progressiveProfile, /confidence >= 0\.76 \? 10 : 12/u);
  assert.match(progressiveProfile, /pillarScore \* 0\.55 \+ mbtiScore \* 0\.45/u);
  assert.match(progressiveProfile, /Math\.min\(8, Math\.max\(-8/u);
  assert.doesNotMatch(testExperience, /结合个人资料、历史画像与本次行为生成/u);
  assert.match(advancedExperience, /核心缘分结构|缘分结构/u);
  assert.match(advancedExperience, /心动引力/u);
  assert.match(advancedExperience, /情绪托举/u);
  assert.match(advancedExperience, /相处节奏/u);
  assert.match(advancedExperience, /长期潜力/u);
  assert.match(advancedExperience, /七个关系板块/u);
  assert.match(advancedExperience, /初始吸引/u);
  assert.match(advancedExperience, /情绪连接/u);
  assert.match(advancedExperience, /沟通默契/u);
  assert.match(advancedExperience, /互补成长/u);
  assert.match(advancedExperience, /宿命\/烙印感/u);
  assert.match(advancedExperience, /冲突消耗/u);
  assert.match(advancedExperience, /你们的关系天赋/u);
  assert.match(advancedExperience, /需要共同练习/u);
  assert.match(advancedExperience, /情绪回应/u);
  assert.match(advancedExperience, /长期稳定/u);
  assert.doesNotMatch(advancedExperience, /综合关系动力|为什么会靠近|为什么可能错过|AI 个性化最终解读|你的关系行动指南/u);
  assert.doesNotMatch(testExperience, /createFallbackInterpretation|createDeepInterpretation/u);
  assert.doesNotMatch(advancedReport, /presentationMbtiInsight|presentationPillarInsight/u);
  assert.match(testExperience, /mf-fate-spectrum/);
  assert.match(testExperience, /mf-answer-stars/);
  assert.match(testExperience, /最有默契/u);
  assert.match(testExperience, /仍需确认/u);
});

test("requires the configured model for an advanced interpretation", async () => {
  const response = await render("/api/myfate/personalize", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      action: "interpretation",
      starId: "james",
      initialScore: 76,
      finalScore: 76,
      userMbti: "INFP",
      birthDate: "1998-06-12",
      behaviorScores: { security: 74, expression: 82, independence: 88, conflict: 61, novelty: 77 },
      answers: [{
        question: "如果 James 需要独处，你会怎么做？",
        answer: "尊重空间并约定联系时间",
        value: 4,
        dimension: "independence",
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
