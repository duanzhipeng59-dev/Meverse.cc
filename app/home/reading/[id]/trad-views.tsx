"use client";

// 自填报告展示层简繁转换(与明星页同款 opencc 数据级方案):
// 服务端照旧下发简体 JSON,这里按界面语言转换后交给原有渲染组件——
// 简体直通零开销,繁体即时转换,切回简体无损;生成链路保持纯简体。
import type { StaticReading } from "../../../myfate-static-reading";
import type { Fortune } from "./trad-fortune-type";
import FortuneCurveCard from "../../../fortune-curve";
import StaticReadingReport from "./static-reading-report";
import DualReadingReport from "./dual-reading-report";
import RawReportMarkdown from "../../../components/raw-report-markdown";
import { useTradData } from "../../../trad-convert";
import type { DualReading } from "../../../myfate-dual-reading";

// 单人报告:四柱之外的运势数据(trend 等展示串)与九章正文一起转换
export function TradSingleReport({ content, fortune }: { content: StaticReading; fortune: Fortune | null }) {
  const tradContent = useTradData(content);
  const tradFortune = useTradData(fortune);
  return (
    <>
      {tradFortune ? (
        <FortuneCurveCard careerLifetime={tradFortune.careerLifetime} wealthLifetime={tradFortune.wealthLifetime} loveMarriage={tradFortune.loveMarriage} currentAge={tradFortune.currentAge} />
      ) : null}
      <StaticReadingReport content={tradContent} showAdvice={false} />
    </>
  );
}

// 双人合盘(蒸馏管线 dual-reading-v1 契约)
export function TradDualReport({ content }: { content: DualReading }) {
  const tradContent = useTradData(content);
  return <DualReadingReport content={tradContent} />;
}

// 原始字符串报告(旧链路)
export function TradRawReport({ content }: { content: string }) {
  const tradContent = useTradData(content);
  return <article className="mf-zr-card mf-rr-card mf-raw-report"><RawReportMarkdown content={tradContent} /></article>;
}
