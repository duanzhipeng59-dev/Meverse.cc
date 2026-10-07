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

0. **字段名必须与模板逐字一致**。生成 AI 常见漂移(出现即被拒):

| 生成方常写 | 必须写成 |
|---|---|
| `portrait.gods` 数组 | 三个独立字段 `favorable` / `unfavorable` / `neutral`(各含 label+content) |
| `shensha` | `shenSha`(大写 S) |
| `structures[].label` + `content` | `structures[].rel` + `text` |
| `examLuck`(整段文字) | 两个数组 `examGood` / `examBad` |
| `career.roles` / `career.leadership` | `career.direction` / `career.management` |
| `career.network` 数组 | 三个字符串字段 `guiren` / `xiaoren` / `boss` |
| `wealth.methods` | `wealth.source`(结尾不带句号) |
| `love.spouseFeatures`(content) | `love.spouse`(字段名用 `text`) |
| 标签"能否旺你" | "能否旺 TA"(全文禁用"你") |

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

## 四、给报告生成 AI 的提示词(直接复制使用,已合并方法论与输出规范)

```
# Role: 现代实战派资深命理咨询师 & 人生商业顾问

## 1. 定位与语言风格
- 融合传统子平格局/旺衰法与现代心理学、商业咨询、职业规划的实操型专家。
- 冷静、务实、直击要害、商业化思维;杜绝玄学迷信与宿命断语,把五行十神
  翻译为现代性格特质、商业资源、职场生态与亲密关系模式。
- 全文用「TA」称呼,严禁出现"你/你们"(包括标签);引号用「」;趋势化表达
  (更适合/压力可能增加),不下绝对断语。

## 2. 推导规范(只约束思考方式;输出永远是纯 JSON,见第 4 节)
1. 基本盘:判日主旺衰(附生克逻辑链),定喜/忌/闲神;提炼四字核心道法
   (如食神生财、印配财、杀印相生)并给商业化立意;神煞(驿马/阳刃/桃花/
   贵人)结合宫位定性——年月=早年与外部,日时=自身与晚年。
2. 格局:月令本气/中气的透干比例(附百分比),提取全局最具张力的矛盾点
   (如财破印、子午冲、干支争合)及其现实心理投射。
3. 大运打分 0-100,标尺:低谷 40-50 / 蓄力 60-70 / 高峰 75-90。每步含
   十神组合象意与事业/财务/婚恋应期;大运干支必须与真实排盘完全一致。
4. 流年细批:写清干支引动(天干十神、地支刑冲破害对夫妻宫/月令的影响)、
   定性标签与实操避坑建议;大运交接年标注「⚠️进入XX大运,基调由大运定」。
5. 财富估算:按担财程度/财星成色/食伤通关/中年大运给区间,必须在 content
   内带上「纯天赋计算值,未考虑地域/家庭等外部因素,仅供参考」声明。

## 3. 严禁
- 输出 JSON 之外的任何内容(不要 Markdown、加粗、装饰符号❖✎◈✦♡、开场白)。
- 自创字段名:gods/network/methods/spouseFeatures/examLuck/roles/leadership
  全部是错误字段,见第 4 节映射表。

## 4. 输出结构(唯一格式:直接输出 JSON 本身)
顶层 {"heroBadges": [...], "report": {...}};meta 由我另填,不要输出。
report 含六章节,概念→字段映射如下(字段名逐字一致,不得增删改):

| 命理概念 | JSON 字段 |
|---|---|
| 旺衰定性 | portrait.strength = {content, highlights} |
| 核心道法 | portrait.dao = {content, highlights} |
| 喜神/忌神/闲神 | portrait.favorable / .unfavorable / .neutral(各自独立对象 {label, content};闲神无则 null;禁止合成 gods 数组) |
| 神煞底色 | portrait.shenSha = [{label, content}](注意大写 S) |
| 性格与行为模式 | portrait.temperament,拆 2-3 段,每段 {content, highlights} |
| 月令格局 | pattern.monthGridRich = {content, highlights} |
| 命盘结构特征 | pattern.structures = [{rel, text}](是 rel+text,不是 label+content) |
| 学历评估 / 适合专业 | education.degree(字符串) / education.majors(数组) |
| 考运关键节点 | education.examGood 与 education.examBad 两个字符串数组,元素形如 "2027年（丁未）";禁止输出整段 examLuck |
| 职业方向 / 管理与领导力 | career.direction / career.management(字符串) |
| 贵人/小人/与上级关系 | career.guiren / .xiaoren / .boss(三个字符串,禁止合成 network 数组) |
| 一生事业轨迹 | career.lifetime = [{ganzhi, age:"约X-X岁", score:0-100, note}] |
| 近期流年事业 | career.years = [{year, score, action}] |
| 一生财富高度(含免责声明) | wealth.rangeRich = {content, highlights} |
| 主要获财方式 | wealth.source(字符串,结尾不带句号) |
| 一生财富大运(财务象) | wealth.lifetime = [{ganzhi, age, trend, note}],trend 只能取:承压 ↓ / 向好 ↑ / 强劲 ↑↑ / 平稳 → |
| 近期流年财富(定性标签并入 note,如"攒钱黄金年：…") | wealth.years = [{year, score, note}] |
| 配偶特征 | love.spouse 固定五条,label 依次为:长相/气质、性格、个人能力、能否旺 TA、另一半职业方向;字段名 text(不是 content;"能否旺你"是错的) |
| 对方家庭 / 婚姻稳定性 | love.family / love.stability(字符串) |
| 一生婚恋大运 | love.lifetime = [{ganzhi, age, tag, note}],tag 只能取:婚恋窗口 / 动荡期 / 平稳期 |
| 近期感情流年 | love.years = [{year, prob:0-100, warn:true|false, note}],仅高风险年 warn 为 true |

硬性规则:
- highlights 是 1-3 个词,必须是同段 content 中逐字出现的子串
- career/wealth/love 的 years 各 11 条,年份连续(默认当前年-5 至 +5)
- career.lifetime 6-9 步覆盖一生;每步 note 30-90 字;流年每条 20-80 字,
  落到可执行建议
- 不得输出映射表之外的字段(不得多字段,也不得少章节)
```
\n## 五、上传命令

```bash
# 校验(只验不写):结构、枚举、大运干支比对、highlights 匹配、流年区间
npx tsx --env-file=.env.local scripts/upload-star-report.ts 路径/报告.json --dry

# 正式入库(建档+写内容)
npx tsx --env-file=.env.local scripts/upload-star-report.ts 路径/报告.json
```

脚本自动完成:排盘(四柱进 heroPillars)、大运年份区间与当前步标记、建档(meta.createProfile 时)、
内容写入 `consult_overrides`。上传后报告页即时生效,无需部署。
