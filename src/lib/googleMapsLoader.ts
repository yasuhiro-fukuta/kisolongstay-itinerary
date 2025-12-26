// src/lib/googleMapsLoader.ts
import { Loader } from "@googlemaps/js-api-loader";

let loadPromise: Promise<typeof google> | null = null;
let loadedLang: "ja" | "en" | null = null;

function preferredLangFromHtml(): "ja" | "en" {
  // We use <html lang="..."> as the single source of truth.
  // RootLayout sets it from the cookie, and I18nProvider keeps it in sync.
  try {
    if (typeof document === "undefined") return "ja";
    const v = String(document.documentElement?.lang ?? "").toLowerCase();
    if (v.startsWith("en")) return "en";
  } catch {
    // ignore
  }
  return "ja";
}

export function loadGoogleMaps(): Promise<typeof google> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return Promise.reject(new Error("Missing env: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"));
  }

  const lang = preferredLangFromHtml();

  // NOTE:
  // Google Maps JavaScript API language is fixed at load time.
  // If you need to change language, reload the page after updating <html lang>.
  if (loadPromise) {
    if (loadedLang && loadedLang !== lang) {
      // Best effort warning (we still return the already-loaded instance).
      console.warn(
        `[googleMapsLoader] Google Maps already loaded with language=\"${loadedLang}\". ` +
          `To apply language=\"${lang}\", reload the page.`,
      );
    }
    return loadPromise;
  }

  loadedLang = lang;

  const loader = new Loader({
    apiKey,
    version: "weekly",
    id: "__googleMapsScriptId",
    // ★ここをプロジェクト全体で固定（差分があるとLoaderが死ぬ）
    libraries: ["places"],
    language: lang,
    region: "JP",
  });

  loadPromise = loader.load();
  return loadPromise;
}
