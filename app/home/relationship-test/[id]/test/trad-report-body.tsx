"use client";

// 明星报告页的繁中包装层:服务端照旧下发简体数据(缓存/SEO 不变),
// 这里按语言做数据级转换——简体直通零开销,繁体经 opencc 字符级转换后渲染。
// 四柱标签走 i18n;运势数据(trend 等展示字符串)与报告正文一起 convertDeep。
import type { StaticReading } from "../../../../myfate-static-reading";
import PillarsCard from "../../../../pillars-card";
import FortuneCurveCard from "../../../../fortune-curve";
import StarReadingReport from "../../../../star-reading-report";
import { useLanguage } from "../../../../language-context";
import { useTradData } from "../../../../trad-convert";

type Fortune = ReturnType<typeof import("../../../../star-fortune-extract").extractFortuneData>;

export default function TradReportBody({ pillars, hourEstimated, fortune, content }: {
  pillars: string[];
  hourEstimated: boolean;
  fortune: Fortune | null;
  content: StaticReading;
}) {
  const { t } = useLanguage();
  const tradContent = useTradData(content);
  const tradFortune = useTradData(fortune);

  return (
    <>
      <PillarsCard
        pillars={pillars}
        hourEstimated={hourEstimated}
        labels={{ aria: t("report.pillars.aria"), title: t("report.pillars.title"), list: ["年柱", "月柱", "日柱", t("report.pillars.hour")], hour: t("report.pillars.hour"), fallback: "柱" }}
      />
      {tradFortune ? (
        <FortuneCurveCard careerLifetime={tradFortune.careerLifetime} wealthLifetime={tradFortune.wealthLifetime} loveMarriage={tradFortune.loveMarriage} currentAge={tradFortune.currentAge} />
      ) : null}
      <StarReadingReport content={tradContent} />
    </>
  );
}
