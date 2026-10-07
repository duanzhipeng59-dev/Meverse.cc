# 明星生辰报告上传规范（手动上传流程）

报告内容存在 Supabase `consult_overrides` 表,报告页**只读这份 JSON**(运行时不调用引擎)。
本文定义生成方必须遵守的输入格式;配合 `scripts/upload-star-report.ts` 实现"填模板 → 一条命令入库"。

## 一、收集表(人工填写,缺一不可)

| 项 | 说明 | 示例 |
|---|---|---|
| slug | 明星 id | `keonho` |
| 中文名 / 英文名 | | `安乾镐` / `Keonho` |
| 生日(公历) | | `2007-06-15` |
| **出生时间** | 精确到小时即可,不知道必须去查,不许估 | `18:00` |
| 出生城市 + 经纬度/时区 | 排盘真太阳时校准用 | `首尔 · 韩国, 37.5665, 126.978, Asia/Seoul` |
| 性别 | male / female | `male` |
| 三枚圆形标签 | 日主 / 身强弱 / 喜用,**报告口径是什么就写什么** | `["壬水日主","身强","喜用 木 · 火"]` |
| 卡片文案(新明星才要) | tagline / description / mbti / ideal 五维 | 见模板 meta |

## 二、输入 JSON 结构(给生成方的模板)

```jsonc
{
  "meta": {                          // 上传脚本用;存量明星可只填 id+birth*
    "id": "keonho",
    "name": "安乾镐", "nameEn": "Keonho",
    "role": "CORTIS成员-安乾镐",
    "gender": "male",
    "birthDate": "2007-06-15", "birthTime": "18:00",
    "birthPlace": "首尔 · 韩国",
    "lat": 37.5665, "lon": 126.978, "tz": "Asia/Seoul",
    "tagline": "卡片一句话", "description": "卡片画像文案", "mbti": "ISFP",
    "ideal": { "security": 68, "expression": 64, "independence": 82, "conflict": 58, "novelty": 88 },
    "portraitUrl": "/keonho.webp",
    "createProfile": true,           // 新明星建档案(默认 published=false);存量明星填 false
    "publish": false                 // true 才进卡片列表;静态卡成员保持 false
  },
  "heroBadges": ["壬水日主", "身强", "喜用 木 · 火"],
  "report": {
    "portrait": {
      "strength":    { "content": "身强。TA 的命局……", "highlights": ["身强"] },
      "dao":         { "content": "TA 的道法是「……」……", "highlights": ["比劫配食伤"] },
      "favorable":   { "label": "喜神", "content": "木（食伤）、火（财）……" },
      "unfavorable": { "label": "忌神", "content": "金（印）、水（比劫）……" },
      "neutral":     { "label": "闲神", "content": "土（官杀）……" },   // 没有则填 null
      "shenSha": [
        { "label": "阳刃", "content": "……" },
        { "label": "桃花", "content": "……" },
        { "label": "驿马", "content": "无——……" }
      ],
      "temperament": [                                               // 2-3 段
        { "content": "在别人眼里,TA ……", "highlights": ["比劫旺"] },
        { "content": "TA 的心理底色是……", "highlights": ["务实"] }
      ]
    },
    "pattern": {
      "monthGridRich": { "content": "阳刃格（本气透，层级70%）……", "highlights": ["阳刃格"] },
      "structures": [                                                // 2-4 条
        { "rel": "食伤泄秀（吐秀不见财）", "text": "……" },
        { "rel": "官印相生（为忌）", "text": "……" }
      ]
    },
    "education": {
      "degree": "命理倾向为大专至普通本科……",
      "majors": ["技术类", "设计", "工程"],
      "examGood": ["2027年（丁未）"],
      "examBad": ["2026年（丙午）"]
    },
    "career": {
      "direction": "……", "management": "……",
      "guiren": "……", "xiaoren": "……", "boss": "……",
      "lifetime": [                        // 6-9 步;只写这 4 个字段!
        { "ganzhi": "辛亥", "age": "约9-18岁", "score": 25, "note": "……" },
        { "ganzhi": "庚戌", "age": "约19-28岁", "score": 45, "note": "……" }
      ],
      "years": [                           // 当前年 ±5 共 11 条
        { "year": 2026, "score": 51, "action": "……" }
      ]
    },
    "wealth": {
      "rangeRich": { "content": "TA 的财富量级落在「百万左右」……", "highlights": ["百万左右"] },
      "source": "……",                     // 不要以句号结尾(页面会补)
      "lifetime": [
        { "ganzhi": "庚戌", "age": "约19-28岁", "trend": "承压 ↓", "note": "……" }
      ],
      "years": [
        { "year": 2026, "score": 55, "note": "破财与机遇并存:……" }
      ]
    },
    "love": {
      "spouse": [
        { "label": "长相/气质", "text": "……" },
        { "label": "性格", "text": "……" },
        { "label": "个人能力/经济", "text": "……" },
        { "label": "能否旺 TA", "text": "……" },
        { "label": "另一半职业方向", "text": "……" }
      ],
      "family": "……", "stability": "……",
      "lifetime": [
        { "ganzhi": "庚戌", "age": "约19-28岁", "tag": "婚恋窗口", "note": "……" }
      ],
      "years": [
        { "year": 2028, "prob": 30, "warn": true, "note": "⚠️分手风险。……" }
      ]
    }
  }
}
```

## 三、硬性规则(违反会被上传脚本拒绝)

1. **全文用"TA"称呼**,不用"你/你们";引号用「」。
2. **枚举值**:
   - 财富 `trend` 只能取:`承压 ↓` `向好 ↑` `强劲 ↑↑` `平稳 →`(运势曲线按这四个值换算分数)
   - 婚恋 `tag` 只能取:`婚恋窗口` `动荡期` `平稳期`
3. **流年区间**:career/wealth/love 的 `years` 覆盖**当前年 ±5 共 11 年**,年份连续不跳。
4. **大运 `lifetime`**:干支必须与真实排盘一致(脚本会按出生数据排盘比对,不一致报错);
   只写 `ganzhi/age/score|trend|tag/note`,**年份区间与"当前步"由脚本自动计算**,不要自己写。
5. **highlights 必须是同段 content 里逐字出现的子串**(页面按原文匹配加粗),每处 1–3 个。
6. **数值范围**:score 0–100(建议 30–88;<40 页面显示警示色,≥70 显示良好色);prob 0–100;
   感情流年高风险才 `warn: true`。
7. `wealth.source` 结尾**不带句号**。
8. 六个章节 `portrait/pattern/education/career/wealth/love` 缺一不可(缺任一整份视为无效)。

## 四、给报告生成 AI 的提示词(直接复制使用)

```
你是专业命理报告撰写师。根据我给出的出生资料,按下面的 JSON 结构输出完整报告。
直接输出 JSON 本身,前后不要任何解释文字。

出生资料:{生日} {时辰} 出生,{城市}(性别:{男/女})
三枚标签(原样填入 heroBadges,不要改动):{如 壬水日主 / 身强 / 喜用 木 · 火}

结构规则:
- 顶层 {"heroBadges": [...], "report": {...}}(meta 部分由我另填,你不要输出)
- report 含六个章节:portrait / pattern / education / career / wealth / love,字段按下述模板
- portrait.strength/dao 与 temperament 各条是 {content, highlights} 结构;
  pattern.monthGridRich 与 wealth.rangeRich 同样;其余为纯文本或 {label, content} / {label, text}
- career.lifetime 每步 {ganzhi, age:"约X-X岁", score:0-100, note}
- wealth.lifetime 每步 {ganzhi, age, trend, note},trend 只能取:承压 ↓ / 向好 ↑ / 强劲 ↑↑ / 平稳 →
- love.lifetime 每步 {ganzhi, age, tag, note},tag 只能取:婚恋窗口 / 动荡期 / 平稳期
- career.years/wealth.years 每条 {year, score, action|note},覆盖 {起始年}-{结束年} 共 11 年连续
- love.years 每条 {year, prob:0-100, warn:true|false, note},高风险年份 warn 才为 true
- highlights 是 1-3 个词,必须是同段 content 中逐字出现的子串

写作规则:
- 全文用「TA」称呼,口吻克制、趋势化表达(更适合/压力可能增加),不下绝对断语
- 大运干支、十神、合冲刑害必须按真实排盘书写,与出生资料一致
- career.lifetime 6-9 步覆盖一生;每步 note 30-90 字,写该阶段的事业/财务/婚恋主题与建议
- 每个流年条目 20-80 字,落到具体可行动的建议
```

## 五、上传命令

```bash
# 校验(只验不写):结构、枚举、大运干支比对、highlights 匹配、流年区间
npx tsx --env-file=.env.local scripts/upload-star-report.ts 路径/报告.json --dry

# 正式入库(建档+写内容)
npx tsx --env-file=.env.local scripts/upload-star-report.ts 路径/报告.json
```

脚本自动完成:排盘(四柱进 heroPillars)、大运年份区间与当前步标记、建档(meta.createProfile 时)、
内容写入 `consult_overrides`。上传后报告页即时生效,无需部署。
