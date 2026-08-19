import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render(pathname = "/subscribe") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
      redirect: "manual",
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("redirects the root route to the subscription page", async () => {
  const response = await render("/");
  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "http://localhost/subscribe");
});

test("server-renders the WildAI subscription page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(
    html,
    /<title>ChatGPT Plus \/ Claude Pro 订阅价格与套餐 - WildAI<\/title>/i,
  );
  assert.match(html, /WildAI/);
  assert.match(html, /新订阅/);
  assert.match(html, /Gemini Pro\/家庭组/);
  assert.match(html, /<small>¥<\/small>19\.9/);
  assert.doesNotMatch(html, /ChatGPT\/CodeX/);
  assert.doesNotMatch(html, /X Premium\+/);
  assert.doesNotMatch(html, /Claude Code\/Codex/);
  assert.doesNotMatch(html, /开发者 API/);
  assert.doesNotMatch(html, /Claude Pro \/ Max\+/);
  assert.doesNotMatch(html, /Claude API/);
  assert.match(html, /立即订阅/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/);
});

test("keeps the frontend assets self-contained", async () => {
  const [page, data, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/subscription-page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/data.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(data, /export interface Plan/);
  assert.match(data, /export type ProductCategory/);
  assert.match(data, /export interface NavigationItem/);
  assert.match(data, /export interface DemoStep/);
  assert.match(page, /onKeyDown|订阅进度/u);
  assert.match(layout, /og\.png/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  await assert.rejects(access(new URL("../app/_sites-preview", import.meta.url)));
});

test("localizes the visible Gemini plan card", async () => {
  const [page, translations] = await Promise.all([
    readFile(new URL("../app/subscription-page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/i18n.ts", import.meta.url), "utf8"),
  ]);

  assert.match(page, /plan\.gemini\.title/);
  assert.match(page, /plan\.gemini\.subtitle/);
  assert.match(page, /plan\.gemini\.detail/);
  assert.match(page, /plan\.gemini\.suffix/);
  assert.match(translations, /Gemini Pro \/ Family Group/);
  assert.match(translations, /Native multimodal AI powered by Veo/);
  assert.match(translations, /"plan\.gemini\.suffix": "and up"/);
});

test("sends Supabase-generated verification codes through Resend", async () => {
  const emailCodeRoute = await readFile(
    new URL("../app/api/auth/email-code/route.ts", import.meta.url),
    "utf8",
  );

  assert.match(emailCodeRoute, /new Resend\(/);
  assert.match(emailCodeRoute, /auth\.admin\.generateLink/);
  assert.match(emailCodeRoute, /idempotencyKey/);
  assert.match(emailCodeRoute, /type: "magiclink"/);
  assert.doesNotMatch(emailCodeRoute, /signInWithOtp/);
});

test("uses email verification as the only account sign-in method", async () => {
  const [page, loginRoute, disabledRegisterRoute] = await Promise.all([
    readFile(new URL("../app/subscription-page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/auth/login/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/auth/register/route.ts", import.meta.url), "utf8"),
  ]);

  assert.match(page, /new FormData\(event\.currentTarget\.form\)/);
  assert.match(page, /name="code"/);
  assert.doesNotMatch(page, /name="password"/);
  assert.doesNotMatch(page, /PasswordVisibilityIcon/);
  assert.match(loginRoute, /auth\.verifyOtp/);
  assert.doesNotMatch(loginRoute, /signInWithPassword/);
  assert.match(disabledRegisterRoute, /status: 404/);
  assert.doesNotMatch(disabledRegisterRoute, /createUser|verifyOtp|password/);
});

test("switches signed-in users to a round avatar with logout menu", async () => {
  const [header, profilePage, logoutRoute] = await Promise.all([
    readFile(new URL("../app/site-chrome.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/profile-page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/auth/logout/route.ts", import.meta.url), "utf8"),
  ]);

  assert.match(header, /className="account-avatar"/);
  assert.match(header, /account\.sign_out/);
  assert.doesNotMatch(header, /href="\/profile"/);
  assert.doesNotMatch(header, /account-dropdown-summary/);
  assert.match(header, /window\.location\.assign\("\/subscribe"\)/);
  assert.match(profilePage, /account\.username/);
  assert.match(profilePage, /account\.email/);
  assert.match(logoutRoute, /auth\.signOut\(\{ scope: "local" \}\)/);
  assert.match(logoutRoute, /clearSessionCookies/);
});

test("includes the Gemini family group checkout flow", async () => {
  const [page, familyWizard, translations, paymentServer, paymentNotify] = await Promise.all([
    readFile(new URL("../app/subscription-page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/gemini-family-wizard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/i18n.ts", import.meta.url), "utf8"),
    readFile(
      new URL("../app/api/payments/epay/server.ts", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../app/api/payments/epay/notify/route.ts", import.meta.url),
      "utf8",
    ),
  ]);

  assert.match(page, /GeminiFamilyWizard/);
  assert.match(familyWizard, /useLanguage/);
  assert.doesNotMatch(familyWizard, /[\u4e00-\u9fff]/u);
  assert.match(familyWizard, /19\.9/);
  assert.match(familyWizard, /49\.9/);
  assert.match(familyWizard, /89\.9/);
  assert.match(familyWizard, /ANNUAL_PRICE = "145"/);
  assert.match(familyWizard, /https:\/\/play\.google\.com\//);
  assert.match(familyWizard, /gemini\.region_guide\.scroll/);
  assert.match(familyWizard, /name="region"/);
  assert.match(familyWizard, /gemini\.success\.monthly_title/);
  assert.match(familyWizard, /gemini\.annual\.delivery/);
  assert.match(familyWizard, /\/api\/payments\/epay\/stock/);
  assert.match(familyWizard, /gemini\.stock/);
  assert.match(familyWizard, /deliveredAccount\.password/);
  assert.match(familyWizard, /\/api\/payments\/epay\/create/);
  assert.match(familyWizard, /gemini\.checkout\.pay_with_alipay/);
  assert.match(familyWizard, /qrcode-generator/);
  assert.match(familyWizard, /createDataURL/);
  assert.match(familyWizard, /providerCheckout\.paymentUrl/);
  assert.match(paymentServer, /mapi\.php/);
  assert.doesNotMatch(paymentServer, /submit\.php/);
  assert.match(paymentServer, /result\.qrcode/);
  assert.match(translations, /Choose a Billing Option/);
  assert.match(translations, /Enter Your Email and Country\/Region/);
  assert.match(translations, /Select a Payment Method/);
  assert.match(translations, /Your Invitation Will Arrive Within 20 Minutes/);
  assert.match(paymentServer, /type: "alipay"/);
  assert.doesNotMatch(familyWizard, /不会发起真实扣款/);
  assert.match(paymentServer, /createHash\("md5"\)/);
  assert.match(paymentServer, /timingSafeEqual/);
  assert.match(paymentServer, /amountsMatch/);
  assert.match(paymentNotify, /verifyCallback/);
  assert.match(paymentNotify, /acceptProviderPayment/);
});

test("lists only the signed-in user's payment orders", async () => {
  const [ordersPage, ordersRoute, paymentCreate] = await Promise.all([
    readFile(new URL("../app/orders-page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/orders/route.ts", import.meta.url), "utf8"),
    readFile(
      new URL("../app/api/payments/epay/create/route.ts", import.meta.url),
      "utf8",
    ),
  ]);

  assert.match(ordersRoute, /getSessionUser/);
  assert.match(ordersRoute, /\.eq\("user_id", user\.id\)/);
  assert.doesNotMatch(ordersRoute, /provider_payload|access_token_hash/);
  assert.match(paymentCreate, /p_user_id: user\.id/);
  assert.match(ordersPage, /fetch\("\/api\/orders"/);
  assert.match(ordersPage, /order-status/);
  assert.match(ordersPage, /copyOrderNumber/);
});
