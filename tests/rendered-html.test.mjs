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
  assert.match(html, /ChatGPT\/CodeX/);
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
