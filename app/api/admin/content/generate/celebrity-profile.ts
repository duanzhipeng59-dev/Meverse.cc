import { z } from "zod";
import { birthDateToThreePillars } from "../../../../myfate-deep-analysis";

const shortText = (maximum: number) => z.string().trim().max(maximum).catch("");

export const generatedCelebrityProfileSchema = z.object({
  nameEn: shortText(80),
  nameZh: shortText(80),
  role: shortText(120),
  tagline: shortText(120),
  description: shortText(1200),
  relationshipStyle: shortText(300),
  focus: shortText(300),
  traits: z.array(shortText(20)).max(6).catch([]),
  categories: z.array(shortText(30)).max(5).catch([]),
}).strict();

export type GeneratedCelebrityProfile = z.infer<typeof generatedCelebrityProfileSchema> & {
  threePillars: string;
  reportPrompt: string;
};

type GenerationInput = {
  id: string;
  name: string;
  mbti: string;
  birthDate: string;
  existing?: Record<string, unknown>;
};

export const CELEBRITY_PROFILE_GENERATION_SYSTEM_PROMPT = `你是 Myfate 明星内容工作台的资料编辑。
请根据运营人员提供的基础资料，为明星卡片补写适合产品展示的中文内容。

规则：
1. 输入只有英文 ID、展示名称、MBTI、出生日期，以及可能存在的人工资料。不得虚构私生活、恋爱经历、争议、健康状况或未经输入确认的具体事件。
2. 可以使用对公开人物身份的一般常识写简短身份说明；不能确定时使用中性、概括的表达，不要编造奖项、作品或职位。
3. MBTI 只能作为非绝对的人格倾向参考，使用“更可能、通常、倾向”等表达，不得写成事实诊断。
4. 人物描述、情感人格和关注重点服务于虚拟关系测试的情境设定，不得声称这就是真人真实的恋爱态度。
5. 文案自然、克制、有辨识度，不使用“命中注定、绝配、相克、必然”等宿命或伪科学措辞。
6. traits 输出 3–5 个短标签；categories 输出 1–4 个便于后台筛选的客观大类。
7. nameEn、nameZh 或 role 无法可靠判断时输出空字符串，不得硬猜。
8. 只输出合法 JSON，不要 Markdown、代码块、解释过程或额外字段。

JSON 结构必须严格为：
{
  "nameEn": "英文名或空字符串",
  "nameZh": "常用中文名或空字符串",
  "role": "简短身份说明",
  "tagline": "一句话卡片文案",
  "description": "120至220字人物关系画像",
  "relationshipStyle": "20至50字情感人格概括",
  "focus": "三个关系关注点，使用 · 分隔",
  "traits": ["3至5个短标签"],
  "categories": ["1至4个客观大类"]
}`;

export function buildCelebrityProfileGenerationPrompt(input: GenerationInput) {
  return `请为以下明星卡片生成选填资料。现有人工资料只用于保持一致，不要改写或否定。\n\n${JSON.stringify({
    id: input.id,
    name: input.name,
    mbti: input.mbti,
    birthDate: input.birthDate,
    existingHumanInput: input.existing ?? {},
  }, null, 2)}`;
}

export function buildCelebrityReportPrompt(input: GenerationInput, profile: z.infer<typeof generatedCelebrityProfileSchema>, threePillars: string) {
  const role = String(input.existing?.role ?? "").trim() || profile.role || "公众人物";
  const tagline = String(input.existing?.tagline ?? "").trim() || profile.tagline;
  const description = String(input.existing?.description ?? "").trim() || profile.description;
  const relationshipStyle = String(input.existing?.relationshipStyle ?? "").trim() || profile.relationshipStyle;
  const focus = String(input.existing?.focus ?? "").trim() || profile.focus;
  return `你正在解读的目标人物是 ${input.name}（${role}）。
人物关系画像：${tagline}${description ? `。${description}` : ""}
关系倾向参考：${relationshipStyle || "以题目中呈现的具体行为情境为准"}；重点关注：${focus || "以本次测试回答为准"}。
可参考的后台资料：MBTI 为 ${input.mbti}，出生日期三柱为 ${threePillars || "未提供"}。
请只把以上内容作为设计测试情境时的创作背景。不得把推演写成真人事实，不得虚构私生活或真实恋爱经历，也不得把 MBTI 与三柱写成科学定论或宿命结论。最终报告仍必须依据题目、全部选项和用户实际选择展开。`;
}

export function completeGeneratedCelebrityProfile(input: GenerationInput, generated: z.infer<typeof generatedCelebrityProfileSchema>): GeneratedCelebrityProfile {
  const threePillars = birthDateToThreePillars(input.birthDate) ?? "";
  return {
    ...generated,
    threePillars,
    reportPrompt: buildCelebrityReportPrompt(input, generated, threePillars),
  };
}
