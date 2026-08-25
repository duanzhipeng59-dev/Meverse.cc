# Myfate

Myfate 是一个明星人格兼容性测试 MVP。用户可以选择心动对象，完成关系情境测试，并获得结合 MBTI、出生日期三柱与行为证据生成的高级缘分报告。

## 当前 MVP

- 六位人物肖像卡片首页
- 明星情感人格详情页
- 首次 24 道、后续渐进缩短的偶像情境测试
- 七维关系数据、缘分深度、长期匹配与冲突消耗
- 三柱与 MBTI 主判断、行为结果辅助校准
- DeepSeek 生成的七板块高级报告
- 桌面端与移动端响应式界面

公式引擎只生成固定分数与可视化证据，高级报告的个性化解读统一由 DeepSeek 输出。模型不可修改分数或关系类型；接口不可用时页面显示重试状态，不再展示本地规则报告。模型调用位于独立适配层，后续可以替换为 Gemini，而不改变评分与页面结构。

## 高级报告模型

复制 `.dev.vars.example` 为 `.dev.vars`，填入 DeepSeek API Key：

```bash
MYFATE_AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=your-deepseek-api-key
DEEPSEEK_MODEL=deepseek-v4-flash
DEEPSEEK_BASE_URL=https://api.deepseek.com
```

不配置 `DEEPSEEK_API_KEY` 时，高级报告不会生成，页面会提示检查配置并重试。

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
- `app/myfate-test.tsx`：渐进式测试和结果逻辑
- `app/api/myfate/personalize`：报告输入、Prompt 与模型适配层
- `docs/myfate-relationship-report-prompt.md`：完整报告 Prompt 规范
- `app/myfate.css`：MVP 视觉系统
- `public/*.webp`：本地人物肖像素材

原订阅、支付、订单与后台代码暂时保留，当前首页不再进入这些旧业务流程。
