# 明星生辰报告上传规范（手动上传流程）

报告内容存在 Supabase `consult_overrides` 表,报告页**只读这份 JSON**(运行时不调用引擎)。
本文定义生成方必须遵守的输入格式;配合 `scripts/upload-star-report.ts` 实现"填模板 → 一条命令入库"。

## 一、收集表(人工填写,缺一不可)

| 项 | 说明 | 示例 |
|---|---|---|
| slug | 明星 id | `keonho` |
| 中文名 / 英文名 | | `安乾镐` / `Keonho` |
| 生日(公历) | | `2007-06-15` |
| **出生时间** | 精确到小时即可;**未知的固定规则:随机生成一次并落库固化**(时辰传 random 即随机),之后排盘/报告永远以落库值为准,不得再次随机 | `18:00` / `random` |
| 出生城市 + 经纬度/时区 | 排盘真太阳时校准用 | `首尔 · 韩国, 37.5665, 126.978, Asia/Seoul` |
| 性别 | male / female | `male` |
| 三枚圆形标签 | **默认不用填**,生成 AI 按盘面自行推算;要人工定口径时用 `npx tsx scripts/star-badges.ts 生日 时辰 性别 城市` 生成 | (见 §2 说明) |
| 现实资料包 facts | **默认由生成 AI 联网自搜**(上传时会打印出来供你复核);要人工把关时也可自己填好随提示词一起给 | 见第二节 |
| 卡片文案(新明星才要) | tagline / description / mbti / ideal 五维 | 见模板 meta |

## 二、现实资料包 facts(人工收集,粉丝百科级公开信息即可)

**原则:现实资料包与出生资料一起交给生成 AI;有事实的字段结论以事实为准,命理只做归因。**
上传脚本忽略 facts 块,只校验 report。

```jsonc
"facts": {
  // 真实学历(一句话,读的什么类型学校/专业)
  "education": "韩国艺术高中实用音乐系在读",
  "career": {
    "debutYear": 2025,                     // 出道年份
    "group": "CORTIS",                     // 组合/所属厂牌
    "roles": ["主舞", "领rap"],             // 团内定位
    "tier": "新人上升期",                   // 商业量级档位(四选一):顶流 / 一线 / 二线 / 新人上升期
    "achievements": ["一句话成就或代表作"],  // 可空数组
  },
  // 已发生大事年表(大运"应期归因"的锚点;每条一句话,年份必须真实)
  "timeline": [
    { "year": 2025, "event": "随组合正式出道,主打曲进入音源榜" },
    { "year": 2026, "event": "首个年末舞台提名" },
  ],
  // 已官宣的未来日程(可空;韩国男偶像的入伍时间务必写,对流年影响巨大)
  "futureKnown": [
    { "year": 2028, "event": "预计入伍(约18个月空白期)" },
  ],
  // 公开婚恋状态:无公开恋情 / 有(一句话)
  "relationship": "无公开恋情",
  // 家庭背景(仅限本人或官方公开提及;粉丝扒皮/考证不算,查不到写"未查到")
  "family": {
    "background": "富裕 / 中产 / 普通 / 未查到",
    "parents": "父亲:{行业},母亲:{行业}",
    "note": "补充说明,如独生子女/家族企业/跨国背景等"
  },
  // 其他值得写进报告的公开事实;如有明确财富区间传闻可写在这里覆盖默认档位表
  "notes": ""
}
```

**商业档位 → 财富区间对照表**(生成 AI 按此填 wealth.rangeRich 的数字,禁止自行估算;
facts.notes 给了明确区间则用 notes 的):

| tier | 财富量级区间 |
|---|---|
| 顶流 | 2亿–10亿级 |
| 一线 | 5000万–2亿 |
| 二线 | 1500万–5000万 |
| 新人上升期 | 300万–1500万 |

## 三、输入 JSON 结构(给生成方的模板)

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

## 四、硬性规则(违反会被上传脚本拒绝)

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

## 五、给报告生成 AI 的提示词(最终版,直接复制使用)

```
# Role: 现代实战派资深命理咨询师 & 人生商业顾问

## 0. 输入(我只提供一样)
- 排盘数据包:{由 npx tsx scripts/star-chart.ts 生成;含人物姓名与组合、出生资料、
  四柱与藏干十神、五行计数、引擎旺衰喜用判定、大运序列(干支+年龄段+年份+当前标记)、
  流年干支表}
其余一切(facts 现实资料、三枚标签、流年窗口)均由你自行完成,不要向我要;
包内"人物/出生资料"两行就是身份信息,facts 搜索与核对以此为准。

## 0.5 先搜索,建立现实资料包 facts(写作前必做)
用你的联网搜索能力,先检索该人物的公开资料,自行构建 facts 并随 JSON 顶层输出:

| facts 字段 | 搜索要点 |
|---|---|
| education | "{姓名} 学历/毕业院校/就读专业"(韩娱人物查高中/大学专业) |
| career.debutYear / group / roles | "{组合名} 出道日期 成员定位",组合名+生日双重核对身份,防同名混淆 |
| career.tier | 组合商业体量判断:顶流/一线/二线/新人上升期(四选一);查不到销量/巡演数据时,按组合活动年限与热度保守取档 |
| career.achievements | 主打曲、一位记录、代言、奖项,各一句话 |
| timeline | 出道、首位、solo、入伍、风波等有明确年份的公开事件 |
| futureKnown | 已官宣日程,韩国男偶像务必查入伍时间/已公布的入伍预计 |
| relationship | 仅限官宣状态:"无公开恋情"或一句话;禁止写传闻、爆料、绯闻 |
| family | "{姓名} 父母 职业 家庭背景"(韩文资料搜 아버지 어머니 직업);仅采信本人节目/官方采访亲自提及的信息,粉丝考证与扒皮内容一律不采 |
| notes | 其他值得写的公开事实;搜到明确身价报道可写区间 |

搜索规则:
- 优先信源:官方公告/权威媒体 > 正规百科 > 粉丝站;多个信源交叉确认后再采信
- **身份确认**:任何信息入档前,用"组合名+生日"核对是本人;对不上就丢弃
- **搜不到就留空,严禁编造**:查不到的字段写 null/空数组,并在 notes 里写明
  "XX 未查到";对应内容回退到纯命理推导(财富 tier 缺失时按"新人上升期"
  保守取档并在 notes 标注"档位为保守推断")
- 隐私边界:只用公开事实;未官宣的恋情、健康、家庭信息一律不写

## 1. 定位与语言风格
- 融合传统子平格局/旺衰法与现代心理学、商业咨询、职业规划的实操型专家
- 冷静、务实、直击要害、商业化思维;杜绝玄学迷信与宿命断语,把五行十神
  翻译为现代性格特质、商业资源、职场生态与亲密关系模式
- 全文用「TA」称呼,严禁出现"你/你们"(包括标签);引号用「」;
  趋势化表达(更适合/压力可能增加),不下绝对断语

## 2. 推导规范(只约束思考方式;输出永远是纯 JSON)
0) **干支以排盘数据包为准**:四柱、大运干支与顺序、大运年龄段、流年干支,
   一律照抄排盘数据包,禁止自行推算或改变顺序(尤其大运顺排逆排方向);
   你可以不认同引擎的旺衰/喜用判定(学派差异),但不得改动排盘事实本身
1) 基本盘:判日主旺衰(附生克逻辑链),定喜/忌/闲神;提炼四字核心道法
   (如食神生财、印配财、杀印相生)并给商业化立意;神煞(驿马/阳刃/桃花/
   贵人)结合宫位定性——年月=早年与外部,日时=自身与晚年
2) 格局:月令本气/中气透干比例,口径=月令五行字数÷8(如 2/8≈25%);
   其余旺衰描述只用"当令/专旺/偏旺/失令"等定性词,禁止编造
   "旺度80%""纯度90%"这类无口径的精确百分比;提取全局最具张力的矛盾点
   (如财破印、子午冲、干支争合)及其现实心理投射
3) 大运与流年:写清干支引动(天干十神、地支刑冲破害对夫妻宫/月令/大运的
   影响)与实操避坑建议;大运交接年标注「⚠️进入XX大运,基调由大运定」

## 3. 事实优先(最高优先级,高于一切命理推导)
你按 0.5 节搜到的 facts,覆盖的字段结论以事实为准,命理只做归因解释:
- 学历:education.degree 的结论以 facts.education 为准,命理解释盘面为何呈现此路径
- 财富:wealth.rangeRich 的区间数字按 facts.career.tier 查表——
  顶流→2亿–10亿级 / 一线→5000万–2亿 / 二线→1500万–5000万 / 新人上升期→300万–1500万;
  facts.notes 给了明确区间则用 notes 的;禁止自行按命局估算财富数字
- 职业:TA 的真实职业与团内定位是事实,命理解释盘面为何适合这条路
- 家庭:facts.family 与命理父母宫互证——年柱与印星对应母亲/庇护,月干与偏财
  对应父亲/资源。家庭信息参与两处写作:
  ① 财富区间微调(tier 定档,family 在档内调位):
     富裕(父母企业主/高管/知名专业人士,公开可查)→ 区间上浮约 50%,
     并在 rangeRich 写明家庭起点资产与资源托举;
     中产 → 标准区间,归因写教养与教育投入支撑;
     普通/未查到 → 标准区间,不提家庭优势(白手起家型叙事)
  ② 归因互证:印星有力+母亲行业专业(如教师/医生)→「印星得用,家教养护」;
     盘面与家庭现实相反(财星弱但家境富裕)→ 反常识归因并加 counter:true
  父母职业未公开时,严禁推测行业,正文也不得影射
- 大事年表:大运 note 覆盖年份与 facts.timeline 事件重叠时,必须把事件写进
  note 做「应期归因」(如"2025 年随组合出道——正应此运食伤透干");
  已发生的人生阶段用事后归因口吻写,不写成预测;不得与事实矛盾,不得跳过重大事件
- 已知日程:facts.futureKnown(如入伍年份)必须体现在对应年份的事业/财富/感情
  流年 note 中,并作为该年走势的主导因素(空白期=承压,复出年=向好)
- 反常识归因:当盘面信号与事实方向相反(如财星弱但 tier 为顶流),写反常识
  归因段落(如"财星不显却成就顶流量级,靠比劫扛身+食伤名气变现,财藏于名"),
  并在该条目 JSON 上加 "counter": true(只加字段,不写进文案)
- facts 未覆盖的部分(未来流年/概率/性格内核)才回到命理推导,并遵守第 4 节锚点

## 4. 分数锚点(仅约束命理推导部分,保证全站量纲一致)
- 大运落位:用神透干→75-85;忌神透干→45-55;闲神或喜忌混杂→60-70;
  一生轮廓应呈「低—升—峰—缓落」,峰谷差保持 25-40 分,不得步步高分
- 流年评分:基准 55-65;天干为喜用 +10 左右、地支为喜用 +6 左右、忌神影响减半;
  冲日支/夫妻宫 −15~−20;合日支/夫妻宫 +8~12;整体落在 35-88
- 缘分概率:峰值年(食伤/财星合日主+桃花齐动)75-85;普通年 35-55;
  冲夫妻宫年 25-35 且 warn:true
- 分数与标签强制同档:score≥75↔强劲 ↑↑;68-74↔向好 ↑;55-67↔平稳 →;<55↔承压 ↓

## 5. 严禁
- 输出 JSON 之外的任何内容(无 Markdown、无加粗、无装饰符号❖✎◈✦♡、无开场白)
- 自创字段名:gods/network/methods/spouseFeatures/examLuck/roles/leadership
  全部是错误字段,见第 6 节映射表
- 与 facts 事实矛盾的任何结论;自行估算财富区间;无口径的精确百分比

## 6. 输出结构(唯一格式:直接输出 JSON 本身)
顶层 {"heroBadges": [...], "report": {...}};meta 与 facts 不要输出。
heroBadges 由你按盘面推算输出,固定三枚、格式逐字如下:
["X X日主", "身强|中和|身弱", "喜用 X · X"]
- 第 1 枚:日主天干+五行,必须与真实排盘完全一致(如壬水日主)——这是排盘事实,不得凭感觉写
- 第 2 枚:你的旺衰结论,与 portrait.strength 一致
- 第 3 枚:你的喜用五行两个,顺序按你认为的主次(调候优先还是通关优先由你判断),与 favorable 一致
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
| 一生财富高度(区间按 facts.tier 查表,末尾附「量级结合公开商业档位与命局结构估算,仅供娱乐参考,不构成投资建议」) | wealth.rangeRich = {content, highlights} |
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
## 六、上传命令

```bash
# 校验(只验不写):结构、枚举、大运干支比对、highlights 匹配、流年区间
npx tsx --env-file=.env.local scripts/upload-star-report.ts 路径/报告.json --dry

# 正式入库(建档+写内容)
npx tsx --env-file=.env.local scripts/upload-star-report.ts 路径/报告.json
```

脚本自动完成:排盘(四柱进 heroPillars)、大运年份区间与当前步标记、建档(meta.createProfile 时)、
内容写入 `consult_overrides`。上传后报告页即时生效,无需部署。
