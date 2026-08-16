"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "./language-context";
import { type Lang, langNames } from "./i18n";

export default function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleClick);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const langs: Lang[] = ["zh", "en"];

  return (
    <div className="language-switcher" ref={ref}>
      <button
        className="language-button"
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {langNames[lang]}
        <span aria-hidden="true">⌄</span>
      </button>
      {open && (
        <ul className="language-dropdown" role="listbox">
          {langs.map((l) => (
            <li
              key={l}
              role="option"
              aria-selected={lang === l}
              className={lang === l ? "active" : ""}
              onClick={() => {
                setLang(l);
                setOpen(false);
              }}
            >
              {langNames[l]}
              {lang === l && <span aria-hidden="true"> ✓</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
