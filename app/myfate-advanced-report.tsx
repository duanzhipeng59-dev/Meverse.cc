import type { ReactNode } from "react";
import type { StarProfile } from "./myfate-data";

type ReportSection = {
  number: string;
  title: string;
  body: string;
};

type ReportSubsection = {
  title: string;
  body: string;
};

const fallbackSubtitles: Record<string, string[]> = {
  "01": ["你的自然模式", "你们形成的关系氛围", "需要留意的落差"],
  "02": ["TA 最需要的感受", "TA 期待的回应", "关系里的隐藏需求"],
  "03": ["情绪共鸣", "日常相处", "关系修复"],
  "04": ["自然优势", "滋养方式", "仍需观察"],
  "05": ["防御反应", "承接状态", "潜在张力"],
  "06": ["长期消耗", "现实负担", "情绪余波"],
  "07": ["核心风险", "触发循环", "调整动作"],
  "08": ["健康支持", "非健康滑坡", "判断边界"],
  "09": ["规则名称", "触发条件", "执行步骤", "结束确认"],
};

function cleanHeading(value: string) {
  return value.replace(/^[#*\s]+|[#*\s]+$/gu, "").trim();
}

function splitReport(reportText: string) {
  const lines = reportText.replace(/\r\n?/gu, "\n").split("\n");
  const intro: string[] = [];
  const sections: ReportSection[] = [];
  let current: ReportSection | null = null;

  for (const line of lines) {
    const heading = line.trim().match(/^(\d{1,2})[.．、]\s*(.+)$/u);
    const headingNumber = heading ? Number(heading[1]) : 0;
    const expectedHeadingNumber = current ? Number(current.number) + 1 : 1;
    if (heading && headingNumber === expectedHeadingNumber && headingNumber <= 9) {
      if (current) sections.push({ ...current, body: current.body.trim() });
      current = { number: heading[1].padStart(2, "0"), title: cleanHeading(heading[2]), body: "" };
      continue;
    }
    if (current) current.body += `${line}\n`;
    else intro.push(line);
  }
  if (current) sections.push({ ...current, body: current.body.trim() });

  const introLines = intro.map((line) => cleanHeading(line)).filter(Boolean);
  const title = introLines[0] || "目标人物亲密关系匹配与深度磨合分析报告";
  const meta = new Map<string, string>();
  const leadLines: string[] = [];
  for (const line of introLines.slice(1)) {
    const item = line.match(/^(关系主标题|关系导语|关系类型|关系节奏|核心张力|关系关键词)[｜|：:]\s*(.+)$/u);
    if (item) meta.set(item[1], item[2].trim());
    else leadLines.push(line);
  }
  const reportedCoreTension = meta.get("核心张力");
  const coreTension = reportedCoreTension || "心动很自然，理解仍需要被具体确认";
  return {
    title,
    relationshipType: meta.get("关系类型") || "深度磨合型",
    relationshipRhythm: meta.get("关系节奏") || "在靠近与留白之间寻找共同节奏",
    coreTension,
    keywords: (meta.get("关系关键词") || "真实回应 / 边界感 / 长期确认")
      .split(/\s*[\/／|｜、]\s*/u)
      .map((keyword) => keyword.trim())
      .filter(Boolean)
      .slice(0, 4),
    lead: leadLines.join("\n"),
    sections: sections.length ? sections : [{ number: "01", title: "关系解读", body: reportText.trim() }],
  };
}

function splitSubsections(section: ReportSection): ReportSubsection[] {
  const blocks = section.body
    .split(/\n\s*\n+|\n(?=[•·]\s*)|\n(?=【[^】]+】)/gu)
    .map((block) => block.trim())
    .filter(Boolean);
  const fallbacks = fallbackSubtitles[section.number] ?? ["关系解读"];

  return blocks.map((block, index) => {
    const bracketHeading = block.match(/^【([^】]{1,48})】[：:]?\s*\n?([\s\S]*)$/u);
    if (bracketHeading) {
      return { title: cleanHeading(bracketHeading[1]), body: bracketHeading[2].trim() };
    }
    const inlineHeading = block.match(/^[•·-]?\s*([^：:\n]{2,36})[：:]\s*([\s\S]+)$/u);
    if (inlineHeading) {
      return { title: cleanHeading(inlineHeading[1]), body: inlineHeading[2].trim() };
    }
    return { title: fallbacks[Math.min(index, fallbacks.length - 1)], body: block };
  });
}

export default function MyfateAdvancedReport({
  star,
  reportText,
  questionCount,
  actions,
}: {
  star: StarProfile;
  reportText: string;
  questionCount?: number;
  actions?: ReactNode;
}) {
  const report = splitReport(reportText);

  return (
    <div className="mf-final-result mf-model-only-report">
      <section className="mf-model-report-paper">
        <header className="mf-model-report-cover">
          <div className="mf-model-report-cover-topline">
            <span>MYFATE · RELATIONSHIP TYPE</span>
            <small>{report.title}</small>
          </div>
          <div className="mf-model-report-visual">
            <div className="mf-model-report-type">
              <span>你们更像</span>
              <h2>{report.relationshipType}</h2>
              <p>{report.relationshipRhythm}</p>
            </div>
            <div className="mf-relationship-orbit" aria-label={`你与 ${star.name} 的关系连接示意`}>
              <div className="mf-relationship-node mf-is-user"><span>你</span></div>
              <i><b>✦</b></i>
              <div className="mf-relationship-node mf-is-star" style={{ backgroundImage: `url("${star.portraitSrc}")` }}><span>{star.name}</span></div>
            </div>
          </div>
          <div className="mf-model-report-facts">
            <div><strong>{questionCount === undefined ? "—" : String(questionCount).padStart(2, "0")}</strong><span>本次情境选择</span></div>
            <div><strong>09</strong><span>深度解读板块</span></div>
            <div className="mf-is-tension"><small>核心张力</small><p>{report.coreTension}</p></div>
          </div>
          <div className="mf-model-report-keywords">
            {report.keywords.map((keyword) => <span key={keyword}>{keyword}</span>)}
          </div>
          {report.lead ? <p className="mf-model-report-lead">{report.lead}</p> : null}
        </header>
        <div className="mf-model-report-sections">
          {report.sections.map((section, index) => {
            const headingId = `mf-report-section-${index + 1}`;
            const subsections = splitSubsections(section);
            return (
              <article className="mf-model-report-section" aria-labelledby={headingId} key={`${section.number}-${section.title}`}>
                <div className="mf-model-report-section-heading">
                  <span>{section.number}</span>
                  <h2 id={headingId}>{section.title}</h2>
                </div>
                <div className="mf-model-report-section-copy">
                  {subsections.map((subsection, subsectionIndex) => (
                    <section className="mf-model-report-subsection" key={`${subsection.title}-${subsectionIndex}`}>
                      <h3>{subsection.title}</h3>
                      {subsection.body ? <p>{subsection.body}</p> : null}
                    </section>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>
      {actions ? <div className="mf-result-actions">{actions}</div> : null}
    </div>
  );
}
