"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Lang = "ja" | "en";

const LANG_STORAGE_KEY = "kiso_lang";
const LANG_COOKIE_KEY = "kiso_lang";

type I18nContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

const messages: Record<Lang, Record<string, string>> = {
  ja: {
    // language
    "lang.switchToJa": "日本語に切り替え",
    "lang.switchToEn": "Englishに切り替え",

    // common
    "common.unset": "（未設定）",
    "common.social": "SNS",
    "common.unknownError": "不明なエラー",
    "common.loading": "読み込み中…",
    "common.close": "閉じる",
    "common.languageSwitch": "言語切替",
    "common.links.map": "Map",
    "common.links.hp": "HP",
    "common.links.ota": "OTA",

    // app / global
    "app.menuButton": "メニュー",
    "app.itineraryButton": "旅程",

    // itinerary
    "itinerary.defaultTitle": "みなみ木曽ロングステイ Itinerary（v3）",
    "itinerary.expandTitle": "広げる（2/3表示）",
    "itinerary.collapseTitle": "縮める（1/3表示）",
    "itinerary.titlePlaceholder": "旅程名（保存/カレンダーのタイトル）",
    "itinerary.titleAria": "旅程名",
    "itinerary.signedIn": "ログイン中：{user}",
    "itinerary.signedOut": "未ログイン（保存時にログインできます）",
    "itinerary.startDate": "出発日",
    "itinerary.totalCost": "合計金額",
    "itinerary.totalCostAria": "合計金額",
    "itinerary.totalCostTitle": "各行の金額メモの合計",
    "itinerary.calendarButton": "カレンダーに反映",
    "itinerary.calendarTitle": "Googleカレンダーに旅程を反映",
    "itinerary.dayRemoveTitle": "このDayを削除",
    "itinerary.dayAddTitle": "次のDayとの間にDayを追加",
    "itinerary.rowPickTitle": "この行に地図/メニューから入力",
    "itinerary.commentLinkTitle": "コメント",
    "itinerary.diaryLinkTitle": "日記",
    "itinerary.commentPlaceholder": "コメントを入力…",
    "itinerary.diaryPlaceholder": "日記を入力…",
    "itinerary.costMemoPlaceholder": "金額をメモ",
    "itinerary.costMemoAria": "金額メモ",
    "itinerary.rowAddTitle": "次の行との間に行を追加",
    "itinerary.rowRemoveTitle": "この行を削除（最後の1行は内容クリア）",
    "itinerary.howTo": "使い方：入力したい行を選択 → 地図クリック or メニュー選択 → 行に反映されます。",

    // save
    "save.saving": "保存中...",
    "save.saved": "保存しました",
    "save.save": "保存",
    "save.signInToSave": "会員登録して保存",

    // menu
    "menu.sampleTours": "サンプルツアー",
    "menu.sampleToursEmpty": "sampletour.csv が空、または読み込み失敗しています。",
    "menu.categories": "カテゴリ",
    "menu.selected": "選択中：{active}",
    "menu.serviceMenu": "サービスメニュー",
    "menu.noSpots": "まだこのカテゴリにスポットがありません",
    "menu.itineraryLoad": "旅程ロード",
    "menu.login": "ログイン",
    "menu.loadButton": "旅程をロードする",
    "menu.loadRequiresLogin": "旅程のロードはログイン後に利用できます。",
    "menu.noSaved": "保存した旅程がまだありません。",
    "menu.expandTitle": "広げる（上2/3表示）",
    "menu.collapseTitle": "縮める（上1/3表示）",

    // search
    "search.placeholder": "場所名・駅名・住所で検索",
    "search.clear": "クリア",
    "search.search": "検索",
    "search.loading": "候補を取得中…",
    "search.noResults": "候補が見つかりません",

    // auth
    "auth.title": "会員登録 / ログイン",
    "auth.signInWithGoogle": "Googleでログイン",
    "auth.errorFallback": "ログインに失敗しました",
    "auth.afterSignInInfo": "ログイン後、この旅程を自分のアカウントに保存できます。",

    // sheet
    "sheet.hide": "収納",
    "sheet.show": "表示",

    // toast
    "toast.saved": "保存しました",
    "toast.saveFailed": "保存に失敗しました\n{message}",
    "gps.on": "GPS ON",
    "gps.off": "GPS OFF",
    "toast.gpsNeedLogin": "GPSを開始するにはログインしてください",
    "toast.gpsNotSupported": "この端末ではGPSが利用できません",
    "toast.gpsAlreadyOn": "GPSはすでにONです",
    "toast.gpsStarting": "GPSトラッキングを開始します…",
    "toast.gpsStarted": "GPSトラッキングを開始しました（1分ごとに記録）",
    "toast.gpsStopped": "GPSトラッキングを停止しました",
    "toast.gpsStoppedTimeout": "GPSトラッキングを停止しました（72時間経過）",
    "toast.gpsErrorPermission": "GPSの利用が許可されていません",
    "toast.gpsErrorTimeout": "GPSの取得がタイムアウトしました",
    "toast.gpsErrorDbPermission": "Firestoreの権限が不足しています（users/{uid}/gps_logs の書き込み許可が必要）",
    "toast.gpsError": "GPS取得に失敗しました",
    "toast.loadedItinerary": "旅程をロードしました",
    "toast.loadFailed": "ロードに失敗しました\n{message}",
    "toast.loadedSampleTour": "サンプルツアーをロードしました\n{tour}",

    // user
    "user.fallback": "ログインユーザー",

    // calendar
    "calendar.fallbackTitle": "みなみ木曽ロングステイ",
    "calendar.noItems": "- （まだ旅程が入力されていません）",
  },
  en: {
    // language
    "lang.switchToJa": "Switch to Japanese",
    "lang.switchToEn": "Switch to English",

    // common
    "common.unset": "(unset)",
    "common.social": "Social",
    "common.unknownError": "Unknown error",
    "common.loading": "Loading…",
    "common.close": "Close",
    "common.languageSwitch": "Language",
    "common.links.map": "Map",
    "common.links.hp": "Web",
    "common.links.ota": "OTA",

    // app / global
    "app.menuButton": "Menu",
    "app.itineraryButton": "Itinerary",

    // itinerary
    "itinerary.defaultTitle": "Minami-Kiso Long Stay Itinerary (v3)",
    "itinerary.expandTitle": "Expand (2/3)",
    "itinerary.collapseTitle": "Collapse (1/3)",
    "itinerary.titlePlaceholder": "Itinerary title (for saving / calendar)",
    "itinerary.titleAria": "Itinerary title",
    "itinerary.signedIn": "Signed in: {user}",
    "itinerary.signedOut": "Not signed in (you can sign in when saving)",
    "itinerary.startDate": "Start date",
    "itinerary.totalCost": "Total",
    "itinerary.totalCostAria": "Total cost",
    "itinerary.totalCostTitle": "Sum of all cost memos",
    "itinerary.calendarButton": "Add to Calendar",
    "itinerary.calendarTitle": "Add itinerary to Google Calendar",
    "itinerary.dayRemoveTitle": "Delete this day",
    "itinerary.dayAddTitle": "Insert a day after this one",
    "itinerary.rowPickTitle": "Fill this row from map/menu",
    "itinerary.commentLinkTitle": "Comment",
    "itinerary.diaryLinkTitle": "Diary",
    "itinerary.commentPlaceholder": "Write a comment...",
    "itinerary.diaryPlaceholder": "Write a diary entry...",
    "itinerary.costMemoPlaceholder": "Cost memo",
    "itinerary.costMemoAria": "Cost memo",
    "itinerary.rowAddTitle": "Insert a row after this one",
    "itinerary.rowRemoveTitle": "Remove this row (last row will be cleared)",
    "itinerary.howTo": "How to: select a row → tap a place on the map or pick from the menu → it will fill the row.",

    // save
    "save.saving": "Saving...",
    "save.saved": "Saved",
    "save.save": "Save",
    "save.signInToSave": "Sign in to save",

    // menu
    "menu.sampleTours": "Sample tours",
    "menu.sampleToursEmpty": "sampletour.csv is empty or failed to load.",
    "menu.categories": "Categories",
    "menu.selected": "Selected: {active}",
    "menu.serviceMenu": "Service menu",
    "menu.noSpots": "No spots in this category yet.",
    "menu.itineraryLoad": "Load itinerary",
    "menu.login": "Sign in",
    "menu.loadButton": "Load an itinerary",
    "menu.loadRequiresLogin": "Please sign in to load your saved itineraries.",
    "menu.noSaved": "You don't have any saved itineraries yet.",
    "menu.expandTitle": "Expand (top 2/3)",
    "menu.collapseTitle": "Collapse (top 1/3)",

    // search
    "search.placeholder": "Search by place, station, or address",
    "search.clear": "Clear",
    "search.search": "Search",
    "search.loading": "Loading suggestions…",
    "search.noResults": "No suggestions found",

    // auth
    "auth.title": "Sign up / Sign in",
    "auth.signInWithGoogle": "Sign in with Google",
    "auth.errorFallback": "Sign-in failed",
    "auth.afterSignInInfo": "After signing in, you can save this itinerary to your account.",

    // sheet
    "sheet.hide": "Hide",
    "sheet.show": "Show",

    // toast
    "toast.saved": "Saved",
    "toast.saveFailed": "Failed to save\n{message}",
    "gps.on": "GPS ON",
    "gps.off": "GPS OFF",
    "toast.gpsNeedLogin": "Please sign in to start GPS tracking.",
    "toast.gpsNotSupported": "GPS is not available on this device.",
    "toast.gpsAlreadyOn": "GPS is already ON.",
    "toast.gpsStarting": "Starting GPS tracking...",
    "toast.gpsStarted": "GPS tracking started (logging every minute).",
    "toast.gpsStopped": "GPS tracking stopped.",
    "toast.gpsStoppedTimeout": "GPS tracking stopped (72 hours elapsed).",
    "toast.gpsErrorPermission": "GPS permission was denied.",
    "toast.gpsErrorTimeout": "GPS request timed out.",
    "toast.gpsErrorDbPermission": "Missing Firestore permission (allow writes to users/{uid}/gps_logs).",
    "toast.gpsError": "Failed to get GPS location.",
    "toast.loadedItinerary": "Itinerary loaded",
    "toast.loadFailed": "Failed to load\n{message}",
    "toast.loadedSampleTour": "Sample tour loaded\n{tour}",

    // user
    "user.fallback": "Signed-in user",

    // calendar
    "calendar.fallbackTitle": "Minami-Kiso Long Stay",
    "calendar.noItems": "- (No itinerary items yet)",
  },
};

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) => {
    const v = vars[k];
    return v === undefined || v === null ? "" : String(v);
  });
}

export function tFor(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  const table = messages[lang] ?? messages.ja;
  const raw = table[key] ?? messages.ja[key] ?? key;
  return interpolate(raw, vars);
}

export function translateCategory(label: string, lang: Lang): string {
  const s = String(label ?? "");
  if (lang === "ja") return s;

  const map: Record<string, string> = {
    "全域": "All areas",
    "妻籠": "Tsumago",
    "蘭": "Araragi",
    "田立": "Tadachi",
    "南木曽": "Nagiso",
    "与川": "Yogawa",
    "柿其": "Kakizore",
    "阿寺": "Atera",
    "野尻": "Nojiri",
    "須原": "Suhara",
  };

  return map[s] ?? s;
}

export function translateTourName(name: string, lang: Lang): string {
  const s = String(name ?? "");
  if (lang === "ja") return s;

  const map: Record<string, string> = {
    "春の中山道北上ツアー": "Spring Nakasendo Northbound Tour",
    "夏の渓谷ずぶ濡れツアー": "Summer Gorge Splash Tour",
    "秋の中山道南下ツアー": "Autumn Nakasendo Southbound Tour",
    "冬の温泉ぬくぬくツアー": "Winter Onsen Warm-Up Tour",
  };

  return map[s] ?? s;
}

export function translateSpotTitle(title: string, lang: Lang): string {
  const s = String(title ?? "").trim();
  if (lang === "ja") return s;
  if (!s) return s;

  // Spot / place name translations (from left_menu.csv).
  // If a name is not found here, we keep it as-is (best effort).
  const map: Record<string, string> = {
    "19号側道(サイクルコース)": "Route 19 Service Road (Cycling route)",
    "AZUMAYA": "AZUMAYA",
    "Izumiya": "Izumiya",
    "Mountainn": "Mountainn",
    "NLTS(荷物運び)": "NLTS (Luggage transfer)",
    "TAOYA木曽路": "TAOYA Kisoji",
    "WalkLite(荷物運び)": "WalkLite (Luggage transfer)",
    "YAMO": "YAMO",
    "kashiwaya Inn": "kashiwaya Inn",
    "ties": "ties",
    "tsumugi tei": "Tsumugi-tei",

    "あてら荘（ホテル）": "Atera-so (Hotel)",
    "あてら荘（温泉）": "Atera-so (Onsen)",
    "あてら荘（無料Ebikeステーション）": "Atera-so (Free e-bike station)",
    "あららぎ駅（バス）": "Araragi Station (Bus stop)",
    "いなほ": "Inaho",
    "おんたけ交通バス": "Ontake Kotsu Bus",
    "きこりの家": "Kikori no Ie (Woodcutter's House)",
    "どんぐり": "Donguri",
    "ふくすけ": "Fukusuke",
    "ほていや": "Hoteiya",
    "みなみ木曽ロングトレイルレンタルE-bike": "Minami-Kiso Long Trail Rental E-bike",
    "みなみ木曽ロングトレイル（e-bikeレンタル）": "South Kiso Long Trail Services (Rental E-bike)",
    "ニックカール(ツアーガイド)": "Nick Carl (Tour guide)",
    "ピエロ": "Pierrot",
    "マイケルキング(ツアーガイド)": "Michael King (Tour guide)",
    "三留野宿": "Midono-juku (Post town)",
    "与川道": "Yogawa Trail",
    "丘庭": "Okaniwa",
    "中山道(吾妻)": "Nakasendo (Agatsuma)",
    "交叉点": "Kosaten (Crossroads)",
    "北恵那交通バス": "Kitaena Kotsu Bus",
    "南木曽タクシー(タクシー)": "Nagiso Taxi",
    "南木曽岳": "Mt. Nagiso",
    "南木曽駅": "Nagiso Station",
    "好日珈琲": "Kojitsu Coffee",
    "妻籠宿": "Tsumago-juku (Post town)",
    "妻籠駅（バス）": "Tsumago Station (Bus stop)",
    "富貴の森": "Fuki-no-Mori",
    "山の歴史館": "Mountain History Museum",
    "御嶽スキー場 無料シャトルバス": "Ontake Ski Resort Free Shuttle Bus",
    "御食事処 音吉": "Otokichi (Dining)",
    "恋路のつり橋": "Koiji Suspension Bridge",
    "恋路峠 展望台": "Koiji Pass Viewpoint",
    "日星山等覚寺": "Tokaku-ji Temple",
    "木曽広域バス": "Kiso Wide-Area Bus",
    "本陣": "Honjin",
    "柿其黒淵": "Kakizore Kurobuchi",
    "根の上峠": "Nenoue Pass",
    "桃介亭": "Momosuke-tei",
    "桃介橋": "Momosuke Bridge",
    "橋本屋（無料Ebikeステーション）": "Hashimotoya (Free e-bike station)",
    "民宿すはら": "Minshuku Suhara (Guesthouse)",
    "波奈屋": "Hanaya",
    "滝見の家": "Takimi-no-Ie",
    "珈琲 刀": "Coffee Katana",
    "田立駅": "Tadachi Station",
    "結い庵": "Yuian",
    "萬屋（予約制）": "Mannya (Reservation only)",
    "藤乙": "Fujioto",
    "野尻宿": "Nojiri-juku (Post town)",
    "野尻駅": "Nojiri Station",
    "阿寺狸ヶ淵": "Atera Tanukigabuchi",
    "雨 中山道(カフェ)": "Ame Nakasendo (Cafe)",
    "雨 中山道(宿)": "Ame Nakasendo (Lodging)",
    "須原宿": "Suhara-juku (Post town)",
    "須原駅": "Suhara Station",
    "馬籠峠": "Magome Pass",
    "馬頭観音(サイクルコース)": "Bato Kannon (Cycling route)",
    "高橋渓流": "Takahashi Keiryu",
  };

  if (map[s]) return map[s];

  let out = s;

  // Common fallback translations for Japanese tokens.
  // (We keep the original base text and only translate known parts.)
  out = out
    .replace(/（ホテル）/g, " (Hotel)")
    .replace(/（温泉）/g, " (Onsen)")
    .replace(/（宿）/g, " (Lodging)")
    .replace(/（カフェ）/g, " (Cafe)")
    .replace(/（無料Ebikeステーション）/g, " (Free e-bike station)")
    .replace(/（予約制）/g, " (Reservation only)")
    .replace(/（バス）/g, " (Bus stop)")
    .replace(/（タクシー）/g, " (Taxi)");

  out = out
    .replace(/旅館/g, " Ryokan")
    .replace(/民宿/g, " Minshuku")
    .replace(/温泉/g, " Onsen")
    .replace(/のつり橋$/, " Suspension Bridge")
    .replace(/展望台$/, " Viewpoint")
    .replace(/駅$/, " Station")
    .replace(/宿$/, " (Post town)")
    .replace(/橋$/, " Bridge")
    .replace(/峠$/, " Pass")
    .replace(/寺$/, " Temple")
    .replace(/渓流$/, " Keiryu");

  return out;
}

export function translateErrorMessage(message: string, lang: Lang): string {
  const s = String(message ?? "").trim();
  if (!s) return tFor(lang, "common.unknownError");
  if (lang === "ja") return s;

  // Best-effort mapping for known app errors.
  const mappings: Array<{ jp: string; en: string }> = [
    { jp: "ロード情報が不正です", en: "Invalid itinerary ID." },
    { jp: "旅程が存在しません", en: "Itinerary not found." },
    { jp: "権限がありません", en: "You don't have permission." },
  ];

  for (const m of mappings) {
    if (s.includes(m.jp)) return m.en;
  }

  // Fallback: keep original (could be Firebase/Google errors already in English)
  return s;
}

export function I18nProvider({
  initialLang,
  children,
}: {
  initialLang?: Lang;
  children: React.ReactNode;
}) {
  const [lang, setLangState] = useState<Lang>(initialLang ?? "ja");

  // On mount, allow localStorage to override (if present)
  useEffect(() => {
    try {
      const v = window.localStorage.getItem(LANG_STORAGE_KEY);
      if (v === "ja" || v === "en") setLangState(v);
    } catch {
      // ignore
    }
  }, []);

  // Sync to <html lang>, cookie, localStorage
  useEffect(() => {
    try {
      document.documentElement.lang = lang;
    } catch {
      // ignore
    }

    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      // ignore
    }

    try {
      const maxAge = 60 * 60 * 24 * 365; // 1 year
      document.cookie = `${LANG_COOKIE_KEY}=${lang}; path=/; max-age=${maxAge}`;
    } catch {
      // ignore
    }
  }, [lang]);

  const t = useMemo(() => {
    return (key: string, vars?: Record<string, string | number>) => tFor(lang, key, vars);
  }, [lang]);

  const setLang = (next: Lang) => {
    setLangState(next);
  };

  const value = useMemo<I18nContextValue>(() => ({ lang, setLang, t }), [lang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Fail-safe: do not crash hard in production. Still throw for visibility.
    throw new Error("useI18n must be used within <I18nProvider>");
  }
  return ctx;
}