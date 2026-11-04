# 双人合盘 V3 优化 · 代码修改与测试结果

> 分支:`feat/report-v3-rules`(在个人 V3 之上增量提交)。未部署生产。

## 1. 核心变化

**旧**:双方各自旧 profile 三档旺衰/老喜忌 → 跨盘关系仅 16 对支的六合/冲/害/刑+天干五合+互补计数 → 单次直出 23 字段(30k tokens,失败整篇重试) → 校验只查禁词/字数。

**新**:双方各自由规则层 `buildBaziJudgment` 出锚点(**与单人报告完全同口径**)→ `buildDualJudgment` 补确定性跨盘关系 → 9 章并行生成(每章注入双方锚点+关系锚点+本章字段规则)→ 组装 `dual-reading-v1`(前端零改动)→ 双人一致性校验 → 违规章节定向重生成。

## 2. 新增/修改文件

### 新增
| 文件 | 职责 |
|---|---|
| `app/bazi-rules/dual-judgment.ts` | 双人统一判断对象:双方锚点(复用单人规则层)+跨盘关系(日主生克/8支混扫含三合半合破/夫妻宫互看十神互见/喜忌互补三档/旺衰组合/逐年顺压信号)+evidence 34 条 |
| `app/bazi-rules/dual-field-specs.ts` | 23 字段规则表(结构/顺序与现模板一致;`{A}的底色` 动态姓名 label 模板+解析) |
| `app/bazi-rules/dual-consistency.ts` | 双人一致性校验:结构/双方锚点/张冠李戴/喜忌缺失/干支流年存在性/跨盘关系存在性/宿命断言(克夫克妻注定结婚等)/禁词/字数/感叹号/「」/必引干支/关键年数量 |
| `app/myfate-dual-pipeline.ts` | 双人按章并行管线(双人版系统提示/prompt 组装/generateDualReadingV3) |
| `app/section-pipeline-core.ts` | 从单管线抽出的通用编排内核(并行/定向重试/预算),单双共用 |
| `tests/dual-rules.test.mjs` | 单测 8 项 |
| `scripts/test-dual-v3.mjs` | 3 对命盘集成测试 |

### 修改(行为增量)
- `app/myfate-reading-generator.ts`:dual 分支接 V3 双管线;修正"双人走 DeepSeek"的误导注释;callModel 提升为单双共用
- `app/myfate-section-pipeline.ts`:编排逻辑委托 section-pipeline-core,公共 API 与行为不变(单测 14 项原样通过)
- `app/myfate-dual-reading.ts`:纯导出增量(dualSectionKeys/dualSectionSchema/DUAL_FIELD_CHAR_LIMITS/DUAL_DEFAULT_CHAR_LIMIT);`generateDualReading` 旧管线保留,scripts 预览继续可用
- `package.json`:`test` 串联 `test:dual-rules`

### 未动
`dualReadingSchema`(dual-reading-v1)、前端渲染组件、计费/状态机/退款、legacy 双人报告、追问、单人管线行为。

## 3. 测试结果

- **单元测试 8/8**:23 字段与动态 label、口径一致性(同一人单人/双人锚点相同)、跨盘事实(强弱互补/互补定性/夫妻宫/逐年信号)、比和误报回归、一致性规则(旺衰冲突/张冠李戴/宿命断言/不存在干支被拦)、管线三路径(9 章一次过/单章定向重生成/硬性违规抛错)
- **集成测试(真实 Gemini)3/3**:强弱互补对/双强对/中和组合对,19–37s/对,**一致性违规 0**,口径一致全部通过;跨对相似度 0.30–0.33(个性化良好)
- **旧管线回归**:旧 dual-regression.json 仍过 dualReadingSchema
- **单人回归**:`test:bazi-rules` 14/14 原样通过;typecheck/lint 干净;build 通过;渲染测试与基线一致
- **本地端到端**:经 `/api/reading/start` 同一服务端序列落库一条真实双人记录(40s,9 章 23 字段,dual-reading-v1),额度核销正确

## 4. 修复的问题

1. 夫妻宫"比和"误用天干五行表查地支(任意两支都误判比和)→ 改 ZHI_WUXING
2. `myfate-reading-generator` 注释与实际 provider 不符

## 5. 风险与说明

- 双人 9 章并行 token 成本约 2–3 倍,但单对生成 19–40s(快于旧单次直出实测 ~60s)
- 23 字段字数上限维持现值(校准需上线样本,列为后续)
- 旧 `generateDualReading` 保留导出,与 V3 并存;线上切换后以 V3 为准
- 回滚:revert 本次提交即可,无迁移无数据变更
