# Myfate

Myfate 是一个明星关系情境测试 MVP。用户可以选择心动对象、完成题目，并获得由大模型根据本次选择写成的个性化文字报告。

## 当前 MVP

- 六位人物肖像卡片首页
- 明星情感人格详情页
- 后台统一管理的偶像情境测试题
- 不设分数、对错或结果等级；明星报告使用可独立维护的九段模板
- 仅保存用户本次选择，不向报告引擎传入用户个人资料
- DeepSeek 只根据题目与本次选择生成完整纯文字报告
- 关系行为画像同样使用无评分的大模型报告
- 桌面端与移动端响应式界面

产品端不再计算或映射测试结果。明星报告按照独立 Prompt 中的九段结构生成，关系行为画像仍由模型根据回答自主组织；前端只安全地呈现模型返回的纯文本并保存历史报告。接口不可用时页面显示重试状态，不展示本地规则报告。模型调用位于独立适配层，后续可替换为 Gemini。

## 大模型报告

复制 `.dev.vars.example` 为 `.dev.vars`，填入 DeepSeek API Key：

```bash
MYFATE_AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=your-deepseek-api-key
DEEPSEEK_MODEL=deepseek-v4-flash
DEEPSEEK_BASE_URL=https://api.deepseek.com
```

不配置 `DEEPSEEK_API_KEY` 时，文字报告不会生成，页面会提示检查配置并重试。

## 构建与部署

当前本地和 Cloudflare 构建使用 vinext + Cloudflare Worker：

- `npm run build` / `npm run start` 均使用 `vinext`，构建产物为 Cloudflare Worker（`worker/index.ts` 是入口，含 `/_vinext/image` 图片优化与 RSC 处理）。
- `.openai/hosting.json` 声明了 Cloudflare 项目与 D1 绑定；`vite.config.ts` 的 Cloudflare 插件绑定同样来自该文件。
- `/portrait/*` 肖像代理依赖 Cloudflare Cache API（`caches.default`）做边缘缓存。

仓库仍保留 Vercel 配置，避免在无法确认线上平台时破坏现有部署。Vercel 环境没有
Cloudflare `caches.default`，图片代理会依赖标准 HTTP CDN 缓存头。

## 本地运行

要求 Node.js `>=22.13.0`。

```bash
npm install
npm run dev
```

常用检查：

```bash
npm run typecheck
npm run lint
npm test
```

## 项目结构

- `app/page.tsx`：Myfate 首页
- `app/celebrity/[id]`：人物详情
- `app/test/[id]`：测试入口
- `app/myfate-data.ts`：人物档案和通用测试题
- `app/myfate-test.tsx`：测试作答和文字报告生成流程
- `app/api/myfate/personalize`：报告输入、Prompt 与模型适配层
- `app/api/myfate/personalize/celebrity-report-template.ts`：可手动修改的明星报告九段结构
- `docs/myfate-relationship-report-prompt.md`：完整报告 Prompt 规范
- `app/myfate.css`：MVP 视觉系统
- `public/*.webp`：本地人物肖像素材

原订阅、支付、订单与后台代码暂时保留，当前首页不再进入这些旧业务流程。
