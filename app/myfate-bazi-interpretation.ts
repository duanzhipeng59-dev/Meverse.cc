import { z } from "zod";
import { generateReportText } from "./api/myfate/personalize/model-provider";
import type { BaziChart } from "./myfate-bazi-engine";
import type { BaziSection } from "./myfate-bazi-types";

const SECTION_IDS = ["day_master", "shi_shen", "wu_xing", "ge_ju", "da_yun", "liu_nian", "advice", "summary"] as const;
const SECTION_TITLES: Record<(typeof SECTION_IDS)[number], string> = {
  day_master: "日主与性格",
  shi_shen: "十神与六亲",
  wu_xing: "五行喜忌",
  ge_ju: "格局判定",
  da_yun: "当前大运",
  liu_nian: "流年提示",
  advice: "综合建议",
  summary: "总结",
};

const aiSchema = z.object({
  headline: z.string().min(4),
  summary: z.string().min(10),
  sections: z.array(z.object({
    id: z.enum(SECTION_IDS),
    body: z.string().min(20),
  })).length(8),
});

const SYSTEM_PROMPT = `你是专业八字命理分析师,依据 Parashara 式严谨口径的子平八字体系(参考典籍:穷通宝典、三命通会、滴天髓、渊海子平、子平真诠)。
你会收到一份已排好的八字命盘结构(四柱干支、十神、藏干、五行统计、大运、流年)。你的任务是基于这份排盘数据撰写中文个人解读。

规则:
1. 只引用给定排盘数据,禁止重新排盘或编造干支。
2. 白话为主(约70%),术语出现时紧跟一句通俗解释;论断引典籍口径但不堆砌原文。
3. 不做宿命论断言,语气是"倾向/提醒/建议";健康话题只提示作息养生方向,不做疾病诊断。
4. 结构输出 8 个板块:id 依次为 day_master(日主旺衰与性格底色)、shi_shen(十神格局与六亲关系)、wu_xing(五行分布与喜忌用神)、ge_ju(格局判定)、da_yun(当前大运走势)、liu_nian(今年流年提示)、advice(事业/财运/感情/健康方向建议)、summary(300字内总结)。
5. 每板块 body 200-400 字。
输出严格 JSON:{"headline":str,"summary":str,"sections":[{"id":str,"body":str}×8]},不要 markdown 代码块。`;

function chartPrompt(chart: BaziChart, gender: "male" | "female") {
  const pillars = chart.pillars
    .map((p) => `${p.label}${p.ganzhi}(干十神:${p.shiShenGan},藏干:${p.hideGan.join("/")}[${p.hideShiShen.join("/")}],纳音:${p.naYin})`)
    .join("\n");
  const dayun = chart.daYun.steps
    .slice(0, 9)
    .map((s) => `${s.ganzhi}(${s.startYear}-${s.endYear}岁${s.startAge}-${s.endAge}${s.current ? ",当前" : ""})`)
    .join(",");
  return [
    `性别:${gender === "male" ? "男" : "女"}`,
    `出生(北京时间):${chart.trueSolar.birthTime} @${chart.trueSolar.city}`,
    `真太阳时:${chart.trueSolar.adjustedTime}(校正${chart.trueSolar.totalCorrectionMin}分钟)`,
    `四柱:\n${pillars}`,
    `日主:${chart.dayMaster}`,
    `五行统计:${JSON.stringify(chart.wuXing)}`,
    `起运:${chart.daYun.startText}`,
    `大运:${dayun}`,
    `当前流年:${chart.currentYearGanZhi}`,
  ].join("\n");
}

export async function interpretBaziChart(
  chart: BaziChart,
  gender: "male" | "female",
): Promise<{ headline: string; summary: string; sections: BaziSection[]; source: "deepseek" | "template" }> {
  try {
    const generation = await generateReportText(SYSTEM_PROMPT, chartPrompt(chart, gender), { json: true, temperature: 0.6, maxTokens: 4500 });
    const cleaned = generation.content.replace(/^```(?:json)?\n?/u, "").replace(/\n?```$/u, "");
    const parsed = aiSchema.safeParse(JSON.parse(cleaned));
    if (parsed.success) {
      return {
        headline: parsed.data.headline,
        summary: parsed.data.summary,
        sections: parsed.data.sections.map((s) => ({ id: s.id, title: SECTION_TITLES[s.id], body: s.body })),
        source: "deepseek",
      };
    }
    console.error("Bazi AI interpretation schema mismatch", parsed.error.issues.slice(0, 3));
  } catch (error) {
    console.error("Bazi AI interpretation failed", error);
  }
  return { ...templateInterpretation(chart), source: "template" };
}

function templateInterpretation(chart: BaziChart): { headline: string; summary: string; sections: BaziSection[] } {
  const strongest = Object.entries(chart.wuXing).sort((a, b) => b[1] - a[1])[0];
  const weakest = Object.entries(chart.wuXing).sort((a, b) => a[1] - b[1])[0];
  const body = (text: string) => text;
  return {
    headline: `你的日主是${chart.dayMaster},当前行${chart.currentDaYunGanZhi || "—"}大运`,
    summary: `八字五行以${strongest[0]}最旺(${strongest[1]}个)、${weakest[0]}最弱(${weakest[1]}个),当前大运${chart.currentDaYunGanZhi || "待起运"},流年${chart.currentYearGanZhi}。以下为基于排盘事实的简要解读,完整个性化解读暂不可用。`,
    sections: [
      { id: "day_master", title: SECTION_TITLES.day_master, body: body(`日主${chart.dayMaster},日柱${chart.pillars[2].ganzhi},纳音${chart.pillars[2].naYin}。日主是八字的核心,代表你本身的底色与行事风格。`) },
      { id: "shi_shen", title: SECTION_TITLES.shi_shen, body: body(`年柱${chart.pillars[0].ganzhi}对日主为${chart.pillars[0].shiShenGan},月柱为${chart.pillars[1].shiShenGan},时柱为${chart.pillars[3].shiShenGan}。十神反映你与外界资源、关系的互动模式。`) },
      { id: "wu_xing", title: SECTION_TITLES.wu_xing, body: body(`五行分布:${Object.entries(chart.wuXing).map(([k, v]) => `${k}${v}`).join(" ")}。${strongest[0]}旺${weakest[0]}弱,日常可留意补足${weakest[0]}的方向。`) },
      { id: "ge_ju", title: SECTION_TITLES.ge_ju, body: body(`月柱${chart.pillars[1].ganzhi}(藏干${chart.pillars[1].hideGan.join("/")})为格局依据,需结合大运流年综合判断。`) },
      { id: "da_yun", title: SECTION_TITLES.da_yun, body: body(`起运${chart.daYun.startText},当前大运${chart.currentDaYunGanZhi || "尚未起运"}。大运十年一换,主导阶段主题。`) },
      { id: "liu_nian", title: SECTION_TITLES.liu_nian, body: body(`今年流年${chart.currentYearGanZhi},与日主${chart.dayMaster}的关系决定今年的整体节奏。`) },
      { id: "advice", title: SECTION_TITLES.advice, body: body("建议结合五行喜忌安排事业节奏、财务决策与作息,重大决定避开情绪波动期。") },
      { id: "summary", title: SECTION_TITLES.summary, body: body(`本盘日主${chart.dayMaster},当前${chart.currentDaYunGanZhi || "待起运"}大运、${chart.currentYearGanZhi}流年,整体节奏以稳为主,逢${weakest[0]}旺的年份可多主动。`) },
    ],
  };
}
