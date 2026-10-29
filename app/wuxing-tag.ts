// 日主标签底色按五行取象(低透明度):木绿/火红/土黄/金白/水蓝;预览页与发现页卡片共用
export const WUXING_TAG_BG: Record<string, string> = {
  木: "rgb(120 185 149 / 16%)",
  火: "rgb(224 109 124 / 16%)",
  土: "rgb(210 163 92 / 17%)",
  金: "rgb(201 199 214 / 16%)",
  水: "rgb(116 158 224 / 16%)",
};

// 日主如「戊土」,取第二字的五行底色
export function wuxingTagStyle(dayMaster: string): { background: string } | undefined {
  const bg = WUXING_TAG_BG[dayMaster[1]];
  return bg ? { background: bg } : undefined;
}
