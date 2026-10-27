# 明星生辰报告上传规范（手写 v3 口径）

报告内容存在 Supabase `consult_overrides` 表,报告页**只读这份 JSON**、不做任何运行时生成。
本文定义手写报告的输入格式;配合 `scripts/upload-star-report.ts` 实现"填模板 → 一条命令入库"。
页面渲染见 `app/star-reading-report.tsx`(九章可视化),结构校验以 `app/myfate-static-reading.ts` 的 `staticReadingSchema` 为准。

## 一、收集表(人工填写,缺一不可)

| 项 | 说明 | 示例 |
|---|---|---|
| slug | 明星 id | `keonho` |
| 中文名 / 英文名 | | `安乾镐` / `Keonho` |
| 生日(公历) | | `2007-06-15` |
| 出生时间 | 精确到小时;不确定时按公开资料最可信口径选定一个并固定 | `18:00` |
| 出生城市 + 经纬度/时区 | 排盘真太阳时校准用 | `首尔 · 韩国, 37.5665, 126.978, Asia/Seoul` |
| 性别 | male / female | `male` |
| 卡片文案(新明星才要) | tagline / description / mbti / ideal 五维 | 见模板 meta |

## 二、输入 JSON 结构(手写模板)

```jsonc
{
  "meta": {                          // 上传脚本用;存量明星可只填 id+出生资料(createProfile:false)
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
    "publish": false                 // true 才进卡片列表
  },
  "report": {
    "schemaVersion": "single-full-v3",
    "scope": "full-reading",
    "heroBadges": ["壬水日主", "身强", "喜用 木 · 火"],   // 可不填,脚本按排盘自动推算
    "sections": {
      "portrait":      { "title": "章节个性化标题", "summary": "导语一段", "insights": [...], "advice": [...] },
      "pattern":       { ... },
      "education":     { ... },
      "career":        { ... },
      "wealth":        { ... },
      "relationship":  { ... },
      "wellbeing":     { ... },
      "children":      { ... },   // 可省略(结构允许)
      "family":        { ... }
    },
    "disclaimer": "本报告基于公开出生资料与传统子平命理模型手写整理,仅供娱乐与文化参考。"
  }
}
```

### 章节结构(九选八以上,`children` 可省略)

```jsonc
"career": {
  "title": "重写规则的超级个体操盘手",       // 个性化标题(渲染为章节副标题)
  "summary": "导语,建议 60-120 字。",        // 渲染为章节导语块
  "insights": [                              // 至少 1 条;每条一个子卡
    { "label": "职业定位", "content": "……" }, // label 渲染为玫红徽章
    { "label": "一生事业轨迹", "content": "丁丑运（9–18岁）伤官得库，技艺奠基；戊寅、己卯运（19–38岁）食伤连生财官，……；庚辰运（39–48岁）偏财透出主事，……" }
  ],
  "advice": ["建议一句话。"]                  // 渲染为章末建议条;可为空数组
}
```

章节名固定:portrait 人生画像 / pattern 格局 / education 学业 / career 事业 /
wealth 财富 / relationship 感情 / wellbeing 健康 / children 子女 / family 六亲。

## 三、硬性规则(违反会被上传脚本拒绝)

1. **全文用「TA」称呼**,不用"你/你们";引号用「」。
2. `sections` 除 `children` 可省略外缺一不可;每章 `title/summary/insights/advice` 四字段齐全
   (strict 校验,不得增删字段名)。
3. `insights[].label/content` 均为字符串,content 建议 80 字以上;`advice` 为字符串数组。
4. `heroBadges` 若手填,固定 3 枚:`["X X日主", "身强|中和|身弱", "喜用 X · X"]`;
   第 1 枚(日主)必须与真实排盘一致,脚本会比对,不一致直接拒绝;第 2/3 枚与引擎不同仅提示。
5. 四柱 `heroPillars` 不用写,脚本按出生资料排盘自动补。
6. `disclaimer` 必填,注明出生资料口径与"仅供娱乐文化参考"。

## 四、大运时间轴的自动可视化(写作提示,非强制)

insight 的 content 里若整段由分号分隔、且每段形如

```
干支运（起始岁–结束岁）描述文字
```

(如 `丁丑运（9–18岁）技艺奠基；戊寅运（19–38岁）黄金上升，……`),**至少 3 段且全部规整**时,
页面自动渲染为步进时间轴卡(干支 + 年龄段 + 描述);任一段不规整则整段回退为普通文本,内容零丢失。
写「一生事业轨迹」「一生财富大运」「一生婚恋大运」这类内容时按此格式写即可获得时间轴效果。

## 五、上传命令

```bash
# 校验(只验不写):结构、heroBadges 排盘交叉校验
npx tsx --env-file=.env.local scripts/upload-star-report.ts 路径/报告.json --dry

# 正式入库(可选建档 + 写内容)
npx tsx --env-file=.env.local scripts/upload-star-report.ts 路径/报告.json
```

脚本自动完成:排盘打印(四柱/大运供你核对)、heroPillars 补全、heroBadges 缺省推算、
建档(meta.createProfile 时)、内容写入 `consult_overrides`。上传后报告页即时生效,无需部署。

历史工具:`scripts/import-foreign-reports.mjs` 是 10 份国际明星报告的一次性导入脚本,保留备查;
旧六章(legacy)结构的报告页面不再渲染,重新手写 v3 上传覆盖即可。
