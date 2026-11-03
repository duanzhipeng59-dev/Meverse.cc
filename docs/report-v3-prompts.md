# V3 AI Prompt 与输出 Schema(交付物 D)

> 实现位置:系统提示词与章节 prompt 组装在 `app/myfate-section-pipeline.ts`;字段级约束在 `app/bazi-rules/field-specs.ts`(详见交付物 B 文档);输出 Schema 沿用 `app/myfate-static-reading.ts` 的 `staticReadingSchema`(single-full-v3,结构零变更)。

## 1. 生成链路(Step 1-5 对应需求第六阶段)

```
Step 1 命盘计算    buildBaziChart(引擎,确定性)
Step 2 命理规则    buildBaziJudgment → 统一判断对象(锚点+事实+evidence+timelines)
Step 3 章节生成    9 章 Promise.allSettled 并行,每章:
                   系统提示(SECTION_SYSTEM_PROMPT)
                   + 用户 prompt(锚点块 / 本章命理事实 / 本章字段规则 / 表达层硬约束 / 输出结构样例 / 证据清单)
                   → 单章 JSON → zod section 校验 + 字段顺序预检
Step 4 一致性校验  组装全文 → staticReadingSchema → checkConsistency(15 组规则)
                   → 违规章节定向重生成(≤2 轮,总预算 240s;硬性违规耗尽即抛错)
Step 5 结构化输出  evidence/timelines/disclaimer 由规则层确定性产出,AI 不参与
```

模型参数:`provider gemini, temperature 0.35, maxTokens 12000/章, json mode`(经 `generateChatText`,与其他功能同一出口)。

## 2. 系统提示词(SECTION_SYSTEM_PROMPT,10 条规则)

1. **锚点原样引用**:旺衰档位、格局名、喜用忌神五行、调候结论、财富档位必须原样引用,不得改判。
2. **只用给定事实**:干支、十神、合冲刑害、神煞、大运流年以【本章命理事实】为准;只能引用其中存在的;证据不足降强度或写明,不补造。
3. **先结论后依据**:每字段第一句是结论句;核心结论→命理依据→现实解读→条件提醒(按字段规格取舍)。
4. **术语紧跟白话**:十神五行格局术语后括号或紧跟白话,转化为"这意味着你怎样"。
5. **第二人称「你」**;核心结论词用「」;不用 Markdown 星号。
6. **个性化**:不同字段不同结构;相同开头句式不得连续;杜绝空话;同章不重复解释同一结构。
7. **优缺并存**:优势、成因、发挥条件、何环境变短板。
8. **不写确定事实**:不写必然年份/疾病诊断/子女数量/未来成就;绝对化措辞禁用(标准量化格式例外:财富T档、缘分概率、评分、准确率标注);不虚构经历,不使用未核验古籍引文。
9. **开头多样**:给出五种进入方式(从命局结构来看/传统命理中,这种组合通常被理解为/这一结构更强调/在现实生活中,可以将其理解为/值得留意的是),禁止机械轮换;禁止六种通用开头(你天生注定/你一定会/你的命运必然/你拥有无限潜力/只要努力就会成功/你是一个非常聪明的人)。
10. **输出纪律**:单章 JSON 对象、无 Markdown、字符串内禁英文双引号与反斜杠、引用一律「」。

明星版:`SECTION_STAR_SYSTEM_PROMPT` 追加 TA 称呼与三柱盘约束(缺时辰判断如实写「时柱未定,依据不足」)。

## 3. 章节用户 prompt 结构(以 wealth 章为例的骨架)

```
请依据下面的排盘判断,生成《MeVerse 个人八字报告》的「财富」章节,只输出本章的 JSON 对象。

【全局命理结论(锚点,必须原样引用,不得改判)】
- 日主:戊(土,阳干),月令未(土旺之令)
- 旺衰档位:「偏强」(15 vs 8.4,同党占比64%)
- 格局:「正印格」(成色:中气透出;…)
- 喜用五行:金、木;忌神五行:土、火;闲神:水
- 调候:寒暖适中(无急需)
- 十神排序:印星2.5 > 官杀2 > 比劫1.5 > 财星1.5 > 食伤0
- 合化口径:只论合、不默认化…
- 财富档位:T6(700万-1500万),推导链:…   ← 本章专属锚点

【本章命理事实】(财富档推导链/四柱/大运9步含十神与互动/未来10流年含信号)

【本章字段规则】4 字段逐一:结构/推导/触发/禁止/必引证据/字数上限

【表达层硬约束】结论句先行、禁词表、字数上限清单、下限30字

【输出 JSON 结构】{"title":"财富","summary":…,"insights":[…],"advice":[…]}

【可用证据清单】(evidenceIds 白名单,每字段最多4个)
[重试时追加]【上次输出未通过校验,必须修正】- [一生财富高度]字数超限:…
```

## 4. 输出 Schema(不变)

- 单章:`{ title, summary?, evidenceIds?, insights:[{label, content, evidenceIds?}], advice: string[] }`(zod strict)。
- 全文:`staticReadingSchema` single-full-v3——九章 sections(35 字段)+ evidence(min 8,规则层实际产 30+ 条)+ timelines(career/wealth/relationship 三域,规则层确定性产出)+ disclaimer(固定文案)。
- 内部规则对象 BaziJudgment 为**独立数据结构**,不进入前端契约;前端/历史报告/追问/明星上传全部零改动。

## 5. 失败与重试语义

- 单章失败/超时(150s)/结构不符 → 仅该章重试;整篇失败仅当章节缺失或硬性违规修复耗尽(2 轮)。
- 总预算 240s(Vercel 300s 函数上限内留 failed 落库+退款余量);超预算抛错 → `runReadingGeneration` catch → status failed + 幂等退款(计费语义不变)。
