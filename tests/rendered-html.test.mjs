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
  assert.match(html, /href="\/#stars"/u);
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
  assert.doesNotMatch(html, /href="\/home\/celebrity-match\/hyunjin\/test"/);
  assert.match(html, /\/login\?next=%2Fhome%2Fcelebrity-match%2Fhyunjin%2Ftest/);
  assert.match(html, /mf-workspace-detail/u);
});

test("keeps the workspace around the question and report flow", async () => {
  const response = await render("/home/celebrity-match/bang-chan/test");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /正缘测试/u);
  assert.match(html, /专属正缘测试/u);
  assert.match(html, /正在为你生成专属测试/u);
  assert.match(html, /仍会在后台生成/u);
  assert.doesNotMatch(html, /退出，稍后继续/u);
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

test("gates generated celebrity tests before model use while keeping the behavior questionnaire resumable", async () => {
  const [celebrityDetail, celebrityEntry, generatedTest, generateRoute, profileTest] = await Promise.all([
    readFile(new URL("../app/celebrity-detail.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/home/celebrity-match/report-aware-entry.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/myfate-generated-test.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/myfate/generated-tests/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/home/relationship-profile/test/relationship-profile-test.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(celebrityDetail, /AuthEntryLink/u);
  assert.match(celebrityEntry, /AuthEntryLink/u);
  assert.match(generatedTest, /status === "anonymous"/u);
  assert.match(generatedTest, /window\.location\.replace/u);
  assert.doesNotMatch(generatedTest, /sessionStorage/u);
  assert.match(generateRoute, /requireReportUser/u);
  assert.match(generateRoute, /LOGIN_REQUIRED/u);
  assert.match(profileTest, /myfate-pending-relationship-profile/u);
  assert.match(profileTest, /登录并生成报告/u);
  assert.doesNotMatch(profileTest, /补全你的专属资料|birthDate|mbti/u);
  assert.match(profileTest, /sessionStorage/u);
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
  const [testExperience, generatedTest, reportStorage, reportApi, reportDetailApi, reportDetail, advancedReport, reportAwareEntry, guardedTestEntry, reportsWorkspace, relationshipStorage] = await Promise.all([
    readFile(new URL("../app/myfate-test.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/myfate-generated-test.tsx", import.meta.url), "utf8"),
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
  assert.match(testExperience, /查看历史记录/u);
  assert.match(testExperience, /href="\/home\/reports"/u);
  assert.doesNotMatch(testExperience, /保存结果/u);
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
  assert.match(reportDetail, /MyfateFormulaResult/u);
  assert.match(reportDetail, /parseFormulaResult/u);
  assert.match(reportDetail, /test\?restart=1/u);
  assert.match(reportDetail, /返回明星工作台/u);
  assert.match(reportDetail, /正在为你生成专属测试/u);
  assert.match(reportDetail, /去答题/u);
  assert.match(advancedReport, /mf-model-report-sections/u);
  assert.match(advancedReport, /mf-model-report-section/u);
  assert.match(advancedReport, /mf-model-report-subsection/u);
  assert.match(advancedReport, /mf-relationship-orbit/u);
  assert.match(advancedReport, /mf-model-report-facts/u);
  assert.doesNotMatch(advancedReport, /缘分结构|七个关系板块|初始吸引|综合匹配度/u);
  assert.match(reportAwareEntry, /查看关系报告/u);
  assert.match(reportAwareEntry, /去答题/u);
  assert.match(reportAwareEntry, /去测试/u);
  assert.match(reportAwareEntry, /from=celebrity-match/u);
  assert.match(guardedTestEntry, /MyfateGeneratedTest/u);
  assert.doesNotMatch(guardedTestEntry, /questions=\{questions\}/u);
  assert.doesNotMatch(guardedTestEntry, /allowRetest|router\.replace/u);
  assert.match(generatedTest, /createSavedReport/u);
  assert.match(generatedTest, /serializeFormulaResult/u);
  assert.match(reportsWorkspace, /window\.confirm/u);
  assert.match(reportsWorkspace, /删除后无法恢复/u);
  assert.match(reportsWorkspace, /label: "生成中"/u);
  assert.match(reportsWorkspace, /label: "去答题"/u);
  assert.match(reportsWorkspace, /mf-report-generation-disabled/u);
  assert.match(relationshipStorage, /deleteRelationshipReport/u);
});

test("requires login for cloud report data", async () => {
  const response = await render("/api/myfate/reports", { headers: { accept: "application/json" } });
  assert.equal(response.status, 401);
  const result = await response.json();
  assert.equal(result.error, "login_required");
});

test("keeps celebrity content authoritative and protects the hidden studio", async () => {
  const [starsServer, adminPage, adminStudio, adminContentApi, relationshipPage] = await Promise.all([
    readFile(new URL("../app/myfate-stars-server.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/studio/orbit/mf-7k9v2q4x/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/studio/orbit/mf-7k9v2q4x/studio.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/content/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/home/relationship-profile/test/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(starsServer, /\.\.\.stars\.filter/u);
  assert.doesNotMatch(starsServer, /managed\.length \? managed : stars/u);
  assert.match(starsServer, /return data \? mapCelebrity/u);
  assert.match(adminPage, /requireAdmin/u);
  assert.match(adminPage, /notFound/u);
  assert.match(adminContentApi, /requireAdmin\(request\)/u);
  assert.doesNotMatch(adminStudio, /题库管理|AdminQuestion|questionDraft/u);
  assert.doesNotMatch(adminContentApi, /myfate_question_bank|kind === "question"/u);
  assert.match(relationshipPage, /relationshipQuestions/u);

  const [hiddenPage, contentApi] = await Promise.all([
    render("/studio/orbit/mf-7k9v2q4x"),
    render("/api/admin/content", { headers: { accept: "application/json" } }),
  ]);
  assert.equal(hiddenPage.status, 404);
  assert.equal(contentApi.status, 401);
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
  assert.match(html, /\/login\?next=%2Fhome%2Fcelebrity-match%2Fbang-chan%2Ftest/);
});

test("generates a fresh sealed question set and evaluates it without a second model call", async () => {
  const [testPage, generatedTest, generateRoute, submitRoute, prompt, evaluation, formulaResult, relationshipTest] = await Promise.all([
    readFile(new URL("../app/test/[id]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/myfate-generated-test.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/myfate/generated-tests/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/myfate/generated-tests/[id]/submit/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/myfate/generated-tests/prompt.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/myfate/generated-tests/server.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/myfate-formula-result.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/home/relationship-profile/test/relationship-profile-test.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(testPage, /MyfateGeneratedTest/u);
  assert.match(generatedTest, /fetch\("\/api\/myfate\/generated-tests"/u);
  assert.match(generatedTest, /查看正缘结果/u);
  assert.doesNotMatch(generatedTest, /sessionStorage/u);
  assert.match(generatedTest, /serializeFormulaResult/u);
  assert.match(generateRoute, /generateReportText/u);
  assert.match(generateRoute, /myfate_generated_tests/u);
  assert.match(generateRoute, /publicQuestions/u);
  assert.match(prompt, /恰好 25 道/u);
  assert.match(prompt, /MBTI：\$\{star\.mbti\}/u);
  assert.match(prompt, /出生年月日：\$\{star\.birthDate\}/u);
  assert.doesNotMatch(prompt, /star\.(?:name|role|threePillars|traits|description|relationshipStyle|focus)/u);
  assert.match(prompt, /约占 70% 定性参考/u);
  assert.match(prompt, /约占 30% 定性参考/u);
  assert.match(prompt, /不要输出逐题标题、专属维度、针对特点或考察意图/u);
  assert.doesNotMatch(prompt, /后台专属提示词|idolPrompt/u);
  assert.match(prompt, /correctIndex/u);
  assert.match(prompt, /每个选项.*explanation/u);
  assert.match(prompt, /最长与最短相差不得超过 8 个字符/u);
  assert.match(prompt, /正确项为四项最长的题不得超过 6 道/u);
  assert.match(prompt, /globalBasis/u);
  assert.match(prompt, /28–48 个中文字符/u);
  assert.match(prompt, /8,500 个中文字符以内/u);
  assert.match(prompt, /TA 当下更可能有什么感受/u);
  assert.match(prompt, /恰好 5 道 riskItem=true/u);
  assert.match(submitRoute, /evaluateGeneratedTest/u);
  assert.doesNotMatch(submitRoute, /generateReportText|personalize/u);
  assert.match(evaluation, /selectedExplanation: selected\.explanation/u);
  assert.match(evaluation, /correctExplanation: correct\.explanation/u);
  assert.match(evaluation, /riskWrongCount >= 3/u);
  assert.match(formulaResult, /为什么适配|更适合 TA 的回答/u);
  assert.doesNotMatch(formulaResult, /为什么这是正确答案|为什么会错位/u);
  assert.match(formulaResult, /fallbackCorrectExplanation/u);
  assert.match(formulaResult, /HighlightedCopy/u);
  assert.match(formulaResult, /mf-key-point/u);
  assert.match(formulaResult, /result\.reviews\.map/u);
  assert.doesNotMatch(formulaResult, /你容易误读 TA 的地方|你真正懂 TA 的地方|本次测试依据/u);
  assert.doesNotMatch(formulaResult, /generateReportText|personalize/u);
  assert.match(relationshipTest, /options: question\.options\.map/u);
  assert.match(relationshipTest, /answer: option\.label/u);
  assert.doesNotMatch(relationshipTest, /calculateRelationshipScores|relationshipArchetype|birthDate|mbti/u);
});

test("rejects anonymous generated-test requests before invoking the model", async () => {
  const response = await render("/api/myfate/generated-tests", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ starId: "hyunjin" }),
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
