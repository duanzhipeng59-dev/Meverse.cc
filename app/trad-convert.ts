"use client";

// 报告内容(服务端存储的简体 JSON)客户端简→繁转换:
// - opencc-js 动态导入:词典体积可观,非繁中用户永远不下载这块代码
// - s2tw 字符级而非 s2twp 词汇级——命理正文是书面语,逐字映射即正确,
//   词汇级会把「信息」错转成台湾资讯用语「資訊」
// - 转换发生在数据层(渲染前),不碰 DOM:React 状态一致性天然成立,切回简体零损耗
import { useEffect, useState } from "react";
import { useLanguage } from "./language-context";

type TradJson = string | number | boolean | null | undefined | TradJson[] | { [key: string]: TradJson };

let converterPromise: Promise<(text: string) => string> | null = null;

function getConverter(): Promise<(text: string) => string> {
  if (!converterPromise) {
    converterPromise = import("opencc-js").then((OpenCC) => OpenCC.Converter({ from: "cn", to: "tw" }));
  }
  return converterPromise;
}

// 深拷贝并转换所有字符串字段;数字/布尔/空值直通
export async function convertDeep<T extends TradJson>(value: T): Promise<T> {
  const convert = await getConverter();
  const walk = (v: TradJson): TradJson => {
    if (typeof v === "string") return convert(v);
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") {
      const out: { [key: string]: TradJson } = {};
      for (const [key, item] of Object.entries(v)) out[key] = walk(item);
      return out;
    }
    return v;
  };
  return walk(value) as T;
}

// 数据级简繁切换 hook:简体直通原对象(零开销、引用稳定),繁体在词典就绪后整体替换
export function useTradData<T extends TradJson>(data: T): T {
  const { lang } = useLanguage();
  const [converted, setConverted] = useState<T>(data);
  useEffect(() => {
    if (lang !== "zh-TW") {
      setConverted(data);
      return;
    }
    let cancelled = false;
    void convertDeep(data).then((result) => {
      if (!cancelled) setConverted(result);
    });
    return () => {
      cancelled = true;
    };
  }, [lang, data]);
  return converted;
}
