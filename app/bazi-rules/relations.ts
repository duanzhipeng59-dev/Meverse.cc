// ── 干支关系计算(原局两两 + 岁运与原局交互) ─────────────────────────────
// 全部为表查确定性推导,只输出事实与命理语义标签,不下吉凶结论;
// 三合区分全合/半合(含旺支)/拱合(无旺支,力弱);刑按无序对判定(修复旧实现单向漏判)。

import {
  CHONG, GAN_HE, HAI, LIU_HE, PO, SAN_HE_JU, SAN_HE_WANG, XING_PAIRS, ZHI_WUXING,
  type Element,
} from "./constants";

export type RelationType =
  | "ganhe" | "liuhe" | "chong" | "hai" | "po" | "xing"
  | "sanhe" | "banhe" | "gonghe";

export type RelationHit = {
  type: RelationType;
  /** 涉及双方:柱位标签或"大运"/"流年" + 干/支字 */
  a: { label: string; value: string };
  b: { label: string; value: string };
  /** 三合局的化神五行(仅三合类) */
  element?: Element;
  /** 命理语义(中性描述,供 AI 引用) */
  meaning: string;
};

const MEANING: Record<RelationType, string> = {
  ganhe: "天干相合,两股力量互相牵引、彼此牵制",
  liuhe: "地支六合,相关领域协同度高、容易互相成全",
  chong: "地支相冲,变化与拉扯感强,常成为推动转折的力量",
  hai: "地支相害,容易出现隐性消耗,宜直接沟通",
  po: "地支相破,计划执行容易被细节打断,宜预留弹性",
  xing: "地支相刑,内在要求高、压力需要稳定出口",
  sanhe: "三合局全会,该五行之力成势",
  banhe: "三合半合(含旺支),该五行有会局之意",
  gonghe: "三合拱合(无旺支),该五行会局之意较弱",
};

const sortPair = (x: string, y: string) => (x < y ? x + y : y + x);

/** 一组支内的三合检测:返回全合/半合/拱合命中(每局至多报最高级一条) */
function sanHeWithin(items: Array<{ label: string; value: string }>): RelationHit[] {
  const hits: RelationHit[] = [];
  for (const ju of SAN_HE_JU) {
    const matched = items.filter((item) => ju.branches.includes(item.value));
    if (matched.length >= 3) {
      hits.push({ type: "sanhe", a: matched[0], b: matched[1], element: ju.element, meaning: `${matched.map((m) => m.value).join("")}三合${ju.element}局,${MEANING.sanhe}` });
    } else if (matched.length === 2) {
      const hasWang = matched.some((m) => SAN_HE_WANG.has(m.value));
      hits.push({
        type: hasWang ? "banhe" : "gonghe",
        a: matched[0], b: matched[1], element: ju.element,
        meaning: `${matched[0].value}${matched[1].value}${hasWang ? "半合" : "拱合"}${ju.element}局,${hasWang ? MEANING.banhe : MEANING.gonghe}`,
      });
    }
  }
  return hits;
}

/** 四柱(或任意柱组)内部两两关系扫描:六合/冲/害/破/刑(无序)/三合族 + 天干五合 */
export function scanPillarRelations(pillars: Array<{ label: string; ganzhi: string }>): RelationHit[] {
  const hits: RelationHit[] = [];
  const branches = pillars.map((p) => ({ label: p.label, value: p.ganzhi[1] }));
  const stems = pillars.map((p) => ({ label: p.label, value: p.ganzhi[0] }));
  for (let i = 0; i < pillars.length; i += 1) {
    for (let j = i + 1; j < pillars.length; j += 1) {
      const [bi, bj] = [branches[i], branches[j]];
      if (LIU_HE[bi.value] === bj.value) hits.push({ type: "liuhe", a: bi, b: bj, meaning: MEANING.liuhe });
      if (CHONG[bi.value] === bj.value) hits.push({ type: "chong", a: bi, b: bj, meaning: MEANING.chong });
      if (HAI[bi.value] === bj.value) hits.push({ type: "hai", a: bi, b: bj, meaning: MEANING.hai });
      if (PO[bi.value] === bj.value) hits.push({ type: "po", a: bi, b: bj, meaning: MEANING.po });
      if (bi.value !== bj.value && XING_PAIRS.has(sortPair(bi.value, bj.value))) {
        hits.push({ type: "xing", a: bi, b: bj, meaning: MEANING.xing });
      }
      const [si, sj] = [stems[i], stems[j]];
      if (GAN_HE[si.value] === sj.value) hits.push({ type: "ganhe", a: si, b: sj, meaning: MEANING.ganhe });
    }
  }
  hits.push(...sanHeWithin(branches));
  return hits;
}

/** 外部干支(大运/流年)与原局四柱的关系(支对支、干对日干) */
export function scanExternalRelations(
  external: { label: string; ganzhi: string },
  pillars: Array<{ label: string; ganzhi: string }>,
): RelationHit[] {
  const hits: RelationHit[] = [];
  const extBranch = external.ganzhi[1];
  const extStem = external.ganzhi[0];
  const dayStem = pillars[2]?.ganzhi[0];
  for (const pillar of pillars) {
    const branch = pillar.ganzhi[1];
    const a = { label: external.label, value: extBranch };
    const b = { label: pillar.label, value: branch };
    if (LIU_HE[extBranch] === branch) hits.push({ type: "liuhe", a, b, meaning: MEANING.liuhe });
    if (CHONG[extBranch] === branch) hits.push({ type: "chong", a, b, meaning: MEANING.chong });
    if (HAI[extBranch] === branch) hits.push({ type: "hai", a, b, meaning: MEANING.hai });
    if (PO[extBranch] === branch) hits.push({ type: "po", a, b, meaning: MEANING.po });
    if (extBranch !== branch && XING_PAIRS.has(sortPair(extBranch, branch))) hits.push({ type: "xing", a, b, meaning: MEANING.xing });
  }
  // 三合:外部支并入原局支成半合/全合
  const branchPool = pillars.map((p) => ({ label: p.label, value: p.ganzhi[1] }));
  for (const ju of SAN_HE_JU) {
    if (!ju.branches.includes(extBranch)) continue;
    const inChart = branchPool.filter((item) => ju.branches.includes(item.value) && item.value !== extBranch);
    const distinct = new Set(inChart.map((item) => item.value));
    if (distinct.size >= 2) {
      hits.push({ type: "sanhe", a: { label: external.label, value: extBranch }, b: inChart[0], element: ju.element, meaning: `${external.label}${extBranch}与原局会成${ju.branches.join("")}三合${ju.element}局,${MEANING.sanhe}` });
    } else if (distinct.size === 1) {
      const partner = inChart[0];
      const hasWang = SAN_HE_WANG.has(extBranch) || SAN_HE_WANG.has(partner.value);
      hits.push({
        type: hasWang ? "banhe" : "gonghe",
        a: { label: external.label, value: extBranch }, b: partner, element: ju.element,
        meaning: `${external.label}${extBranch}与${partner.label}${partner.value}${hasWang ? "半合" : "拱合"}${ju.element}局,${hasWang ? MEANING.banhe : MEANING.gonghe}`,
      });
    }
  }
  // 天干:外部干与日干相合(其余天干之合影响弱,不列)
  if (dayStem && GAN_HE[extStem] === dayStem) {
    hits.push({ type: "ganhe", a: { label: external.label, value: extStem }, b: { label: "日柱", value: dayStem }, meaning: `${external.label}天干${extStem}与日干${dayStem}相合,${MEANING.ganhe}` });
  }
  return hits;
}

/** 关系命中 → 可读事实行(注入 evidence 与 prompt) */
export function describeRelation(hit: RelationHit): string {
  const where = hit.type === "ganhe"
    ? `${hit.a.label}${hit.a.value}与${hit.b.label}${hit.b.value}`
    : `${hit.a.label}${hit.a.value}与${hit.b.label}${hit.b.value}`;
  const elementNote = hit.element ? `,化神${hit.element}` : "";
  return `${TYPE_NAME[hit.type]}:${where}${elementNote}——${hit.meaning}。`;
}

export const TYPE_NAME: Record<RelationType, string> = {
  ganhe: "天干五合", liuhe: "地支六合", chong: "地支相冲", hai: "地支相害",
  po: "地支相破", xing: "地支相刑", sanhe: "三合全合", banhe: "三合半合", gonghe: "三合拱合",
};

/** 支的五行(供三合化神解释) */
export const zhiElement = (zhi: string) => ZHI_WUXING[zhi];
