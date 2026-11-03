# V3 重构 · 代码修改与测试结果(交付物 F)

> 分支:`feat/report-v3-rules`(基线 `preview/dual-pipeline` @ ade3184)。未部署生产。

## 1. 修改文件清单

### 新增
| 文件 | 职责 |
|---|---|
| `app/bazi-rules/constants.ts` | 干支/藏干(本中余)/生克/合冲刑害(含三合族)/禄刃表、十神判定、合化声明 |
| `app/bazi-rules/relations.ts` | 原局两两关系 + 岁运交互(六合/冲/害/破/天干五合/无序刑/三合全/半合/拱合) |
| `app/bazi-rules/shensha.ts` | 驿马/桃花(年支日支双基准)/阳刃,结构化输出 |
| `app/bazi-rules/strength.ts` | 旺衰加权七档 + 从格检测 + 扶抑喜忌 + 十神权重 |
| `app/bazi-rules/pattern.ts` | 月令取格(透干优先级/建禄/阳刃/从格命名) |
| `app/bazi-rules/tiaohou.ts` | 寒暖燥湿 + 调候用神 + 与扶抑关系 |
| `app/bazi-rules/judgment.ts` | 统一判断对象(锚点/事实/evidence 32 条/确定性 timelines) |
| `app/bazi-rules/field-specs.ts` | 九章 35 字段生成规则表(交付物 B 数据源) |
| `app/bazi-rules/consistency.ts` | 跨章一致性校验(15 组规则) |
| `app/bazi-rules/index.ts` | 规则层出口(仅个人报告管线引用) |
| `app/myfate-section-pipeline.ts` | 按章并行生成管线(系统提示/prompt 组装/编排/定向修复) |
| `tests/bazi-rules.test.mjs` | 确定性规则 + 管线编排(mock)单测 14 项 |
| `scripts/test-report-v3.mjs` | 10 盘集成测试(真实 Gemini;`--only=`/`--skip-dual`/`--summary-only`) |
| `scripts/gen-field-rules-doc.mjs` | 交付物 B 文档生成器 |
| `docs/report-v3-audit.md` 等 4 份 | 交付物 A/B/C/D 文档 |
| `test-reports/v3/*` | 交付物 E:10 盘完整报告 + 汇总 |

### 修改(行为增量)
| 文件 | 变更 |
|---|---|
| `app/myfate-reading-generator.ts` | single 分支改走 V3 管线(buildBaziJudgment → generateStaticReadingV3);dual 分支零改动 |
| `app/myfate-static-reading.ts` | 纯导出增量(sectionKeys/sectionSchema/insightSchema/FIELD_CHAR_LIMITS/DEFAULT_FIELD_CHAR_LIMIT);既有函数与 schema 零变更 |
| `app/myfate-bazi-profile.ts` | ①`buildRelations` 刑检查改双向(修复漏判);②流年首年立春交界在依据中标注;两者惠及双管线(事实更准,非逻辑变更) |
| `tests/rendered-html.test.mjs` | 架构契约测试按 V3 更新(其余 16 项不动;4 项存量失败与本次无关,基线一致) |
| `package.json` | `test` 串联 `test:bazi-rules`(esbuild bundle + node --test) |

### 未动(边界确认)
Auth、支付/积分/订单/退款(`myfate-reading-server.ts` 全部计费语义)、复用/重新生成规则、GA4、SEO、`generateDualReading`、`generateValidatedReport`、`buildStaticReadingFacts`/`buildStaticReadingPrompt`/`generateStaticReading`(旧管线全部保留,明星脚本继续可用)、前端渲染组件、`staticReadingSchema`。

## 2. 核心差异摘要

1. **确定性命理判断从 0 → 全覆盖**:格局定名、调候、统一旺衰七档、三合族关系、岁运交互评分此前缺失或交给 AI,现在全部由规则层确定性计算,同盘同值。
2. **生成从整篇单次 → 按章并行**:9 章 Promise.allSettled,每章注入同一份锚点块(跨章一致由构造保证);失败章/违规章**定向重生成**(≤2 轮),不再整篇重写。
3. **校验从表达层 → 跨章一致性**:新增旺衰家族/格局名(家族感知)/喜忌集合/干支与岁运存在性/绝对化断言/证据引用有效性/跨字段重复等检查;硬性违规修复耗尽即失败退款,表达类容忍放行。
4. **evidence/timelines/disclaimer 由规则层确定性产出**,AI 不再参与;`single-full-v3` Schema 与前端契约零变更。

## 3. 测试结果

- **单元测试**:`npm run test:bazi-rules` 14/14 通过(藏干表与库对齐、基准盘、8 组强弱从禄刃格局、扶抑方向、调候寒热、三合全/无序刑、流年与库一致、判断对象完整性、35 字段兼容基准、一致性规则、管线三路径)。
- **typecheck/lint**:tsc 干净;新增文件 eslint 0 error 0 warning(app/ 全量存在 21 个存量 error 位于未触碰文件,与基线一致)。
- **build + 渲染冒烟**:构建通过;渲染测试与基线失败集合完全一致(4 个存量失败,非本次引入)。
- **10 盘集成测试(真实 Gemini)**:**10/10 成功**(9 盘 35 字段 + 1 盘三柱 32 字段),校准后一致性违规 **0 条**;单盘 83–195s(均值 ~110s,含修复轮),在 240s 内部预算内。完整报告与逐盘数据见 `test-reports/v3/`(chart-01/04/09 为人工审读指定样本)。
- **个性化指标**:跨盘全文相似度均值 0.38 / 最大 0.40;同日主对照(丙日 chart-03 vs chart-06)关键字段相似度 0.16–0.31,远低于 0.6 阈值——同日主不同结构的文案差异显著,无"替换五行名称"式模板化。
- **双人合盘回归**:generateDualReading 正常产出 9 章 23 字段(`test-reports/v3/dual-regression.json`),共用内核未受影响。
- **历史兼容**:11/11 份手写明星报告(consult_overrides 同构)通过 staticReadingSchema。

### 已修复的校验器校准问题(首轮集成测试暴露,修复后 0 误报)
1. 「缺少干支依据」误报:只认干支对,不认"庚金劫财"式单字引用 → 放宽为干支对或 ≥2 个命盘干支字。
2. 「格局名冲突」过度严格:非月令格局字段的同族表述(从财格锚点下写从势格)被拦 → 家族感知(月令格局字段仍严格相等)。
3. 「旺衰口径冲突」误伤假设语境:"若身强则…"式条件句被当断言 → 条件语境放行。
4. 「旺衰口径冲突」误伤财富链:引擎财富推导链固定文案("身弱财难任"等三档内部用语)被字段规则要求原样引用 → 财富 T 档量化字段豁免(链由引擎产出,非 AI 断言)。

## 4. 未解决问题与风险

1. **单盘耗时 ~80-195s**(含修复轮),在 240s 内部预算与 Vercel 300s 上限内,但比旧单次直出(~60s)长;失败自动退款兜底不变。
2. **输入 token 成本约 2-3 倍**(9 章各自注入锚点+事实);输出相近。
3. **外国城市时区缺陷**(按北京时间+经度差)为存量问题,本次未修(审计文档已标注)。
4. **神煞仍为 3 个**(驿马/阳刃/桃花);文昌/天乙等未扩(需求允许标记缺失,不虚构)。
5. **大运/流年评分口径变化**:V3 用规则层新喜忌(旧 profile 口径保留给双管线)——同一命盘两条产品线的参考分可能略有差异,属预期(个人报告内部完全自洽)。
6. 渲染测试的 4 个存量失败(landing/relationship-test/branding/4-tab)与本次无关,建议另行处理。

## 5. 回滚方案

- 代码:单分支 revert(`git revert` 两个提交)或直接切回 `preview/dual-pipeline`;无数据库迁移、无数据格式变更。
- 生成失败的报告走既有 failed + 自动退款路径,无需人工处理;历史报告不受影响(不重算)。
