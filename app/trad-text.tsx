"use client";

// 单条数据文本的简繁转换(opencc 字符级):用于档案类数据字段——组合名、出生地、
// 人物中文名等。字典翻译(i18n key)覆盖不了这些来自数据库的字符串。
import { useTradData } from "./trad-convert";

export default function TradText({ text }: { text: string }) {
  return <>{useTradData(text)}</>;
}
