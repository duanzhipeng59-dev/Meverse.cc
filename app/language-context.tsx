"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { type Lang, translations, t } from "./i18n";

const STORAGE_KEY = "myfate-lang";

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const LANGUAGE_CHANGE_EVENT = "myfate-language-change";

function getLanguageSnapshot(): Lang {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "zh-TW" || stored === "zh") return stored;
  // en 为休眠语言(字典未跟全),英语浏览器也回退简中;
  // 繁中浏览器(zh-TW/zh-HK)自动给繁中介面
  const nav = window.navigator.language ?? "";
  if (nav === "zh-TW" || nav === "zh-HK" || nav.startsWith("zh-Hant")) return "zh-TW";
  return "zh";
}

function subscribeToLanguage(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(LANGUAGE_CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(LANGUAGE_CHANGE_EVENT, onStoreChange);
  };
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const lang = useSyncExternalStore<Lang>(
    subscribeToLanguage,
    getLanguageSnapshot,
    (): Lang => "zh",
  );

  useEffect(() => {
    document.documentElement.lang = lang === "zh-TW" ? "zh-TW" : "zh-CN";
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    window.localStorage.setItem(STORAGE_KEY, next);
    window.dispatchEvent(new Event(LANGUAGE_CHANGE_EVENT));
  }, []);

  // 简繁互切(en 无界面入口,不会路过)
  const toggleLang = useCallback(() => {
    setLang(lang === "zh" ? "zh-TW" : "zh");
  }, [lang, setLang]);

  const translate = useCallback(
    (key: string, params?: Record<string, string | number>) =>
      t(translations[lang], key, params),
    [lang],
  );

  return (
    <LanguageContext.Provider
      value={{ lang, setLang, toggleLang, t: translate }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
