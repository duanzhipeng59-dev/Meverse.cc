// ── 按章并行生成管线 · 通用编排内核 ────────────────────────────────────
// 从单人 V3 管线抽出:按章并行 → 失败章定向重试 → 组装 → 一致性校验 →
// 违规章节定向重生成(不重写整篇)。单人(35字段)与双人(23字段)共用同一内核,
// 各自提供章节键/prompt/组装/校验的实现。
// 预算:总守卫默认 240s(Vercel 300s 函数上限内留 failed+退款余量),修复默认 2 轮。

export type SectionPipelineViolation<K extends string> = {
  section?: K;
  field?: string;
  rule: string;
  detail: string;
};

export type SectionPipelineConfig<K extends string, R> = {
  sectionKeys: readonly K[];
  /** 生成/重生成单章;抛错即本轮失败(下一轮带重试提示再来) */
  generate: (key: K, retryNote: string | undefined) => Promise<unknown>;
  /** 组装并整体校验(章节缺失/结构不符时抛错) */
  assemble: (sections: Partial<Record<K, unknown>>) => R;
  /** 组装后的一致性校验,返回违规(空数组=通过) */
  check: (report: R) => SectionPipelineViolation<K>[];
  /** 修复耗尽仍存在即判失败的硬性规则名 */
  fatalRules: ReadonlySet<string>;
  totalBudgetMs?: number;
  repairRounds?: number;
};

/** 单章调用超时包装(成功后清定时器,防进程滞留) */
export async function withSectionTimeout<T>(label: string, timeoutMs: number, call: () => Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label}超时`)), timeoutMs);
  });
  try {
    return await Promise.race([call(), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

export const SECTION_CALL_TIMEOUT_MS = 150_000;
export const TOTAL_BUDGET_MS = 240_000;
export const MAX_REPAIR_ROUNDS = 2;

export async function runSectionPipeline<K extends string, R>(config: SectionPipelineConfig<K, R>): Promise<R> {
  const { sectionKeys, generate, assemble, check, fatalRules } = config;
  const totalBudgetMs = config.totalBudgetMs ?? TOTAL_BUDGET_MS;
  const repairRounds = config.repairRounds ?? MAX_REPAIR_ROUNDS;
  const startedAt = Date.now();
  const withinBudget = () => Date.now() - startedAt < totalBudgetMs;

  // notes 非空 = 待(重新)生成;INITIAL 哨兵表示首轮待生成(不作为重试提示注入 prompt)
  const INITIAL = "pending";
  const sections: Partial<Record<K, unknown>> = {};
  const notes: Partial<Record<K, string>> = {};
  sectionKeys.forEach((key) => { notes[key] = INITIAL; });
  const retryNoteOf = (key: K) => {
    if (!notes[key] || notes[key] === INITIAL) return undefined;
    return notes[key];
  };

  const callBatch = async (keys: K[]) =>
    Promise.allSettled(keys.map(async (key) =>
      withSectionTimeout(`章节 ${key}`, SECTION_CALL_TIMEOUT_MS, () => generate(key, retryNoteOf(key)))));

  for (let round = 0; round <= repairRounds; round += 1) {
    // 1. 生成本轮需要处理的章节
    const pending = sectionKeys.filter((key) => Boolean(notes[key]));
    if (pending.length) {
      const settled = await callBatch(pending);
      pending.forEach((key, index) => {
        const result = settled[index];
        if (result.status === "fulfilled" && result.value !== undefined) {
          sections[key] = result.value;
          notes[key] = "";
        } else {
          const reason = result.status === "rejected"
            ? (result.reason instanceof Error ? result.reason.message : String(result.reason))
            : "模型返回空结果";
          notes[key] = `上次输出未通过校验:${reason}`;
        }
      });
    }

    // 2. 仍有缺失章:最后一轮或超预算即失败
    const missing = sectionKeys.filter((key) => sections[key] === undefined);
    if (missing.length) {
      if (round === repairRounds || !withinBudget()) {
        throw new Error(`章节生成失败:${missing.map((key) => `${key}(${notes[key] || "未生成"})`).join(";").slice(0, 200)}`);
      }
      continue;
    }

    // 3. 组装 + 一致性校验
    const report = assemble(sections);
    const violations = check(report);
    if (!violations.length) return report;

    const isLastChance = round === repairRounds || !withinBudget();
    if (isLastChance) {
      const fatal = violations.filter((violation) => violation.section && fatalRules.has(violation.rule));
      if (fatal.length) {
        throw new Error(`一致性校验未通过:${fatal.slice(0, 3).map((v) => `[${v.section ?? ""}${v.field ? ":" + v.field : ""}]${v.rule}`).join(";").slice(0, 200)}`);
      }
      return report; // 表达类违规已修复多轮,容忍放行
    }

    // 4. 违规章节排入下轮定向重生成(违规行追加进重试提示,控制在 500 字内)
    for (const violation of violations) {
      if (!violation.section) continue;
      const existing = notes[violation.section];
      const line = `- [${violation.field ?? ""}]${violation.rule}:${violation.detail}`;
      notes[violation.section] = existing && existing !== INITIAL ? `${existing}\n${line}`.slice(0, 500) : line;
      delete sections[violation.section];
    }
  }
  throw new Error("SECTION_PIPELINE_EXHAUSTED");
}
