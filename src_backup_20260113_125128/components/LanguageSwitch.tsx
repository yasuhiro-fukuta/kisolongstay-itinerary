"use client";

import { useI18n, type Lang } from "@/lib/i18n";

const LANG_STORAGE_KEY = "kiso_lang";
const LANG_COOKIE_KEY = "kiso_lang";

function persistLang(lang: Lang) {
  // Keep cookie/localStorage in sync so that:
  // - server-rendered <html lang> can match on next load
  // - Google Maps JS API can be loaded in the right language
  try {
    window.localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    // ignore
  }

  try {
    document.documentElement.lang = lang;
  } catch {
    // ignore
  }

  try {
    // 1 year
    document.cookie = `${LANG_COOKIE_KEY}=${lang}; path=/; max-age=31536000`;
  } catch {
    // ignore
  }
}

export default function LanguageSwitch({ className = "" }: { className?: string }) {
  const { lang, setLang, t } = useI18n();

  const applyLang = (next: Lang) => {
    if (next === lang) return;

    // Update React state
    setLang(next);

    // Persist immediately (before reload)
    persistLang(next);

    // IMPORTANT:
    // Google Maps JavaScript API language is fixed when the script loads.
    // Reload to ensure map tiles / UI are in the selected language.
    try {
      window.location.reload();
    } catch {
      // ignore
    }
  };

  return (
    <div
      className={[
        "pointer-events-auto",
        "rounded-full border border-neutral-800 bg-neutral-950/80 backdrop-blur shadow-lg",
        "flex items-center overflow-hidden",
        className,
      ].join(" ")}
      aria-label={t("common.languageSwitch")}
    >
      <button
        type="button"
        onClick={() => applyLang("ja")}
        title={t("lang.switchToJa")}
        className={[
          "px-3 py-1.5 text-xs font-semibold",
          lang === "ja" ? "bg-neutral-100 text-neutral-900" : "text-neutral-200 hover:bg-neutral-900/60",
        ].join(" ")}
        aria-pressed={lang === "ja"}
      >
        JP
      </button>
      <button
        type="button"
        onClick={() => applyLang("en")}
        title={t("lang.switchToEn")}
        className={[
          "px-3 py-1.5 text-xs font-semibold",
          lang === "en" ? "bg-neutral-100 text-neutral-900" : "text-neutral-200 hover:bg-neutral-900/60",
        ].join(" ")}
        aria-pressed={lang === "en"}
      >
        EN
      </button>
    </div>
  );
}
