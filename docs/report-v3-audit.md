# MeVerse 个人八字报告系统 V3 重构 · 现状审计(交付物 A)

> 审计范围:个人八字报告生成全链路。所有结论基于 `feat/report-v3-rules` 分支切出点(`preview/dual-pipeline` @ ade3184)的实际代码,行号以该版本为准。

## 1. 系统现状数据流

```
表单 app/home/dual-star-match/start-reading-form.tsx
  → POST /api/reading/create (zod 校验 → reading_reports 落库 pending/generating → 扣 1 次额度)
  → after() 后台执行 runReadingGeneration (app/myfate-reading-generator.ts:30)
      single 分支:
        buildBaziChart (app/myfate-bazi-engine.ts:83)        ← 确定性排盘
        buildBaziLifeProfile (app/myfate-bazi-profile.ts:228) ← 旺衰/喜忌/十神权重/关系/岁运打分
        buildStaticReadingFacts (app/myfate-static-reading.ts:131) ← ~30 条 evidence 文字事实
        generateStaticReading → generateValidatedReport (:316)   ← AI 单次直出整篇 + 3 轮整体重试
        → updateReadingReport(ready)
      dual 分支: generateDualReading (app/myfate-dual-reading.ts:155) ← 本次不动
  → 前端轮询 /api/reading/[id] → app/home/reading/[id]/page.tsx 渲染
```

AI 调用:`generateChatText`(app/api/myfate/personalize/model-provider.ts:209),个人报告固定 `provider:"gemini", temperature:0.35, maxTokens:30000, json:true`,非流式。

## 2. 算法确定 vs AI 生成的职责划分(现状)

### 2.1 由算法确定(引擎/表查)

| 项 | 位置 | 说明 |
|---|---|---|
| 四柱排盘/真太阳时/晚子时 | `myfate-bazi-engine.ts:83-133` | lunar-javascript EightChar + 自研经度差/均时差修正,`setSect(2)` |
| 藏干及藏干十神 | 库表 `ZHI_HIDE_GAN` + engine:129-132 | 本/中/余三气 |
| 天干十神 | 库表 `LunarUtil.SHI_SHEN` | 每柱天干十神 |
| 十神权重(天干1/藏干0.5) | `myfate-bazi-profile.ts:245-249` | 五大类排序 |
| 日主旺衰(简化计数) | `myfate-bazi-profile.ts:237-241` | `support = 日主五行+印星+月令同党`,`≥4身强/≤1从势/其余身弱`,三档 |
| 扶抑喜忌 | `myfate-bazi-profile.ts:242-243` | 身强喜财食伤、身弱喜印比劫、从势喜最旺两行,纯扶抑两分法 |
| 五行计数/缺五行 | engine:135-139 / profile:257 | 8 字各计 1,藏干不计入 |
| 干支关系(原局两两) | `buildRelations` profile:167-183 | 六合/冲/害/破/天干五合/刑(单向,有漏判) |
| 大运(起运/顺逆) | engine:141-157 | 库计算,9 步,当前运标记 |
| 流年(未来10年) | profile:314-388 | `((year-1984)%60+60)%60` 公式,**公历年对齐,未按立春** |
| 流年打分(信号制) | profile:329-344 | 基础60分+喜忌/冲合刑害加减,夹取[38,88] |
| 财富 T 档 | `myfate-wealth-tier.ts` | 确定性定档(十神权重+财星透藏+身强弱+25-50岁大运喜忌) |
| 神煞三件套 | `buildShenShaFacts` static-reading:101-129 | 驿马/桃花(年支+日支双基准)、阳刃(阳干查帝旺) |

### 2.2 由 AI 自行生成(无确定性依据)

| 项 | 现状 | 风险 |
|---|---|---|
| **格局定名**(偏财格/食神制杀等) | 模板要求模型"月令藏干透出了X…给出格局名"(static-reading:165),引擎 `pattern` 字段只是"十神主导"排序标签(profile:414) | 与"禁止编造命理事实"存在张力;不同章节可能定名不一 |
| **调候** | 全库零实现(grep 无命中) | 寒暖燥湿维度完全缺失 |
| 各章文案 | 引擎只给事实,解读全由模型写 | 千人一面风险依赖 prompt 约束 |

### 2.3 缺失或口径不一

1. **旺衰两套阈值**:profile `≥4身强/≤1从势/无中和` vs `myfate-star-bazi-report.ts:178-179` `≥5/≤2/有中和`——同一命盘两条产品线定性可能不同。
2. **神煞基准两套**:static-reading 年支+日支双基准(传统口径)vs star-report 仅日支。
3. **三合/半合**:仅明星感情流年用(`star-bazi-report.ts:28,384`),原局关系、流年打分、双人跨盘均不做。
4. **合化**:天干五合/地支六合只判"合",无"化"的条件判断(下文按"不默认化"处理)。
5. **刑检查单向**:`buildRelations` profile:179 只查正序,`ZHI_XING` 表部分成对收录,反序对(如巳寅)漏判;流年打分 :342 是双向——同库两口径。
6. **流年未按立春**:`yearGanZhi` 按公历年取干支,公历 1-2 月上旬出生/流年实际仍属前一干支年。
7. **藏干表重复 5 处**:GAN_WUXING/ZHI_WUXING 在 engine/profile/star-report/portrait-consult/bazi-result 各一份,漂移风险。
8. **干支生克表重复 3 处**:profile/star-report/dual-reading 内联。
9. **神煞仅 3 个**:文昌/天乙/华盖/禄神无计算,只出现在静态短语池与人工精校文案。
10. **空亡/胎元/命宫**仅透传展示,无下游消费。
11. **时区缺陷**:引擎不用 `city.tz`,一律按北京时间+经度差修正;欧美盘可引入数小时偏差(城市库以中国城市为主,本次不修,标注)。
12. **测试**:全库零命理计算测试;唯一测试 `tests/rendered-html.test.mjs` 只做渲染冒烟。

### 2.4 字段输入覆盖情况(九章 35 字段)

- 有直接引擎事实:旺衰定性、喜神、忌神、闲神(可推)、神煞底色、月令格局(仅原材料)、结构清浊(关系)、财富章(T档链)、大运流年类字段(排盘+参考分)、配偶特征(配偶星+夫妻宫)、子女章(子女星+时柱)、六亲(星+柱位)。
- **缺确定性中间判断**:道法标签(现靠 DAO_FA 组合表在 consult 链,个人链靠 AI)、格局成色、调候、强弱与喜忌的分层表述——AI 需要自行推导这些"判断",是跨章冲突与套话的主要来源。

## 3. AI 生成与校验现状

- **整篇单次直出**:一次调用产整份九章 JSON;失败后**整篇重试**(≤3 轮/150s 预算),无字段级定向重试(static-reading:316-343)。
- 校验链:JSON.parse→jsonrepair 兜底→`sanitizeReportDraft` 宽容剥离→zod strict→`checkStaticReadingStyle`(禁词/字数/感叹号/道法标签长度)。
- evidence 体系已存在:`insight.evidenceIds`(正则校验的 id 引用),但 AI 目前**并不稳定输出**,evidence 数组 min(8) 可选;无"引用的干支十神必须真实存在"的实体校验。
- 表达层约束与 prompt 共享常量(`FIELD_CHAR_LIMITS`/`BANNED_STYLE_WORDS`),这是本次字段规则表可复用的机制。

## 4. 存储/复用/计费(边界,不动)

- 表 `reading_reports`(mode single/dual,status pending/generating/ready/failed,content jsonb);RLS deny-all,service role + 路由层归属校验。
- 先扣费后生成(RPC `consume_report_credit_for_reading` 幂等),失败自动退款(`refundReadingCredit`);重新生成=新建记录+新扣费;pending 去重;分享导入去重。
- 双人合盘与个人报告共用:`generateValidatedReport`、`buildBaziChart`、`buildBaziLifeProfile`、`buildShenShaFacts`、`BANNED_STYLE_WORDS`、同一张表与计费 RPC。**任何对共用函数的行为变更都会波及双管线**。

## 5. 兼容性要求(必须保持)

1. `staticReadingSchema`(single-full-v3)结构不变——前端四路 safeParse 分发、历史报告、明星 `consult_overrides` 上传规范(docs/star-report-upload.md)、追问链路全依赖它。
2. `runReadingGeneration` 的 status 流转与失败退款语义不变;`/api/reading/*` 路由不动。
3. 双人合盘 `generateDualReading` 及其依赖行为不变(引擎事实性 bug 修复除外,见改动文档)。
4. 前端渲染组件(StaticReadingReport/ReadableText/FortuneCurve 等)不改——insights 动态渲染,天然兼容。
5. 三柱盘(明星缺时辰)通道:`STAR_REPORT_PROMPT_SUFFIX` + `chart.pillars[3]` 分支保留。

## 6. 竞品要点(4 家公开样例)

| 竞品 | 可借鉴 | 不采用 |
|---|---|---|
| 渊海(18章) | 每章"理论依据→本盘分析→利弊"结构;典籍条文出处标注;双算法校验声明;强免责 | 18 章目录;生平节点对照(无用户数据) |
| 明理 | 排盘→旺衰→格局→用神→分领域的**显式推导链**;大运评级(平/小吉/小凶);古籍原文+白话双轨 | 半文半白"阁下"式文风 |
| 元梓知易(8章) | "本节判断—命盘证据—现实表现—行动建议"四段式;**"不默认合化"式限定声明**;命盘证据段引用具体干支;克制因果("不据此断定") | 岗位对照表/90天计划等重操作工具 |
| Mingsage(6章) | 五行比例、柱间支持/摩擦矩阵等可视化;术语中英对照;扶抑取用并注明"不同方法可能分歧" | 英文市场定位;6 章结构 |

**共性**(与本次需求一致):确定性排盘声明、推导链可见、术语+白话双轨、克制表达与免责、领域判断挂钩具体干支结构。

## 7. 审计结论(映射到本次改造)

| 问题 | 对策 |
|---|---|
| 格局定名/调候无确定性依据 | 规则层新增 `pattern.ts`/`tiaohou.ts` 确定性计算,AI 只引用 |
| 旺衰简化+两套口径 | 规则层 `strength.ts` 统一加权算法(得令/得地/得势),仅个人报告使用 |
| 跨章判断可能冲突 | 统一判断对象 BaziJudgment 全章注入同一份锚点+一致性校验 |
| 整篇重试浪费 | 按章并行生成,校验失败仅重生成违规章节 |
| 千人一面 | 字段规则表 trigger_conditions/interpretation_rules 按命盘结构差异化触发 |
| 引用不存在命理关系 | 一致性校验做实体存在性检查(十神/干支/岁运必须在事实集内) |
| 零测试 | 确定性规则单测 + 10 盘集成测试 |

## 8. 已知缺陷清单(本次修/不修)

**修**:刑检查双向漏判;流年立春口径;规则层内统一旺衰/神煞口径。
**不修(标注)**:外国城市时区;神煞仅 3 个(文昌/天乙等不扩);合化条件(统一"只论合、不默认化"并显式声明);`dual_star_reports` 遗留空表;`/api/reading/[id]` error 字段恒 null。
