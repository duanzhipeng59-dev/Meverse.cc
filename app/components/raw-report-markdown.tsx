import React from "react";

function inline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => part.startsWith("**") && part.endsWith("**")
    ? <strong key={index}>{part.slice(2, -2)}</strong>
    : part);
}

/** 将模型返回的轻量 Markdown 转成报告排版，并隐藏技术性边界说明。 */
export default function RawReportMarkdown({ content }: { content: string }) {
  const lines = content
    .replace(/\\\s*$/gm, "")
    .split(/\r?\n/)
    .filter((line) => !/^>\s*说明[：:]/.test(line.trim()) && !/^本报告仅依据上述四柱/.test(line.trim()) && !/^---+$/.test(line.trim()));
  const blocks: React.ReactNode[] = [];
  let paragraph: string[] = [];
  const flush = () => {
    if (!paragraph.length) return;
    blocks.push(<p key={`p-${blocks.length}`}>{inline(paragraph.join(" "))}</p>);
    paragraph = [];
  };
  lines.forEach((line, index) => {
    const value = line.trim();
    if (!value) { flush(); return; }
    const heading = /^(#{1,3})\s+(.+)$/.exec(value);
    if (heading) {
      flush();
      const Tag = heading[1].length === 1 ? "h1" : heading[1].length === 2 ? "h2" : "h3";
      blocks.push(<Tag key={`h-${index}`}>{inline(heading[2])}</Tag>);
      return;
    }
    if (/^>\s?/.test(value)) {
      flush();
      blocks.push(<blockquote key={`q-${index}`}>{inline(value.replace(/^>\s?/, ""))}</blockquote>);
      return;
    }
    if (/^[-*]\s+/.test(value)) {
      const items: React.ReactNode[] = [inline(value.replace(/^[-*]\s+/, ""))];
      blocks.push(<ul key={`ul-${index}`}><li>{items[0]}</li></ul>);
      return;
    }
    paragraph.push(value);
  });
  flush();
  return <div className="mf-raw-report-content">{blocks}</div>;
}
