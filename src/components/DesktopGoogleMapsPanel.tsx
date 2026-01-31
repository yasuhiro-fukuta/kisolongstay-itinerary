// src/components/DesktopGoogleMapsPanel.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { loadGoogleMaps } from "@/lib/googleMapsLoader";
import { publicImageUrlFromImgCell, type MenuRow } from "@/lib/menuData";
import { translateSpotTitle, translateTourName, useI18n } from "@/lib/i18n";

type Prediction = google.maps.places.AutocompletePrediction;

export type DesktopSearchChipKey =
  | "all"
  | "restaurant"
  | "hotel"
  | "activity"
  | "transit"
  | "museum"
  | "pharmacy"
  | "atm";

export type PlaceListItem = {
  placeId: string;
  name: string;
  address?: string;
  rating?: number;
  userRatingsTotal?: number;
  photoUrl?: string;
};

export type DesktopPlaceDetails = {
  placeId: string;
  name: string;
  formattedAddress?: string;
  rating?: number;
  userRatingsTotal?: number;
  photoUrl?: string;
  mapUrl?: string;
  website?: string;
  iconUrl?: string;
  types?: string[];
  lat?: number;
  lng?: number;
};

export type DesktopSearchMode = "none" | "results" | "place" | "route" | "activity";

function formatRating(rating?: number, total?: number): string {
  if (typeof rating !== "number" || !Number.isFinite(rating)) return "";
  const r = Math.round(rating * 10) / 10;
  if (typeof total === "number" && Number.isFinite(total) && total > 0) {
    return `${r} (${total})`;
  }
  return String(r);
}

function labelForChip(k: DesktopSearchChipKey, lang: string) {
  const ja = lang === "ja";
  switch (k) {
    case "restaurant":
      return ja ? "飲食" : "Food";
    case "hotel":
      return ja ? "宿" : "Hotel";
    case "activity":
      return ja ? "体験" : "Activity";
    case "transit":
      return ja ? "交通" : "Transit";
    case "museum":
      return ja ? "博物館" : "Museum";
    case "pharmacy":
      return ja ? "薬局" : "Pharmacy";
    case "atm":
      return "ATM";
    case "all":
    default:
      return ja ? "全域" : "All";
  }
}

function emojiForChip(k: DesktopSearchChipKey) {
  switch (k) {
    case "restaurant":
      return "🍽️";
    case "hotel":
      return "🏨";
    case "activity":
      return "🧭";
    case "transit":
      return "🚌";
    case "museum":
      return "🏛️";
    case "pharmacy":
      return "💊";
    case "atm":
      return "🏧";
    case "all":
    default:
      return "🗺️";
  }
}

function emojiForMenuIcon(iconKey: string): string {
  const k = String(iconKey ?? "").toLowerCase().trim();
  if (!k) return "📍";
  if (k.includes("cycle") || k.includes("bike")) return "🚴";
  if (k.includes("taxi")) return "🚕";
  if (k.includes("tour")) return "🧭";
  if (k.includes("restaurant") || k.includes("lunch") || k.includes("dinner")) return "🍽️";
  if (k.includes("hotel") || k.includes("inn")) return "🏨";
  return "📍";
}

export default function DesktopGoogleMapsPanel({
  mode,
  loading,
  queryLabel,
  results,
  selectedPlaceId,
  selectedPlaceDetails,
  activityResults,
  onSubmitQuery,
  onSelectChip,
  onSelectPlace,
  onSelectActivity,
  onClearResults,
  onCloseSelectedPlace,
  onAddSelectedPlaceToItinerary,
  sampleTours,
  onLoadSampleTour,
}: {
  mode: DesktopSearchMode;
  loading: boolean;
  queryLabel: string;
  results: PlaceListItem[];
  selectedPlaceId: string | null;
  selectedPlaceDetails: DesktopPlaceDetails | null;
  activityResults: MenuRow[];
  onSubmitQuery: (q: string) => void;
  onSelectChip: (chip: DesktopSearchChipKey) => void;
  onSelectPlace: (placeId: string) => void;
  onSelectActivity: (menu: MenuRow) => void;
  onClearResults: () => void;
  onCloseSelectedPlace: () => void;
  onAddSelectedPlaceToItinerary: () => void;

  /** Optional: sample tour quick-load buttons (desktop). */
  sampleTours?: string[];
  onLoadSampleTour?: (tourName: string) => void;
}) {
  const { lang, t } = useI18n();

  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [predLoading, setPredLoading] = useState(false);
  const [predictions, setPredictions] = useState<Prediction[]>([]);

  const autoRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const tokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const debounceRef = useRef<number | null>(null);
  const reqIdRef = useRef(0);

  // Ensure Google Maps (places) is loaded
  useEffect(() => {
    let cancelled = false;

    const initAutocomplete = async () => {
      await loadGoogleMaps();

      const g = (globalThis as any).google as typeof google | undefined;
      if (!g?.maps) {
        throw new Error("google.maps is not available after loadGoogleMaps()");
      }

      // importLibrary('places') (new API) if available
      const importLibrary = (g.maps as any).importLibrary as undefined | ((name: string) => Promise<unknown>);
      if (!g.maps.places && typeof importLibrary === "function") {
        try {
          await importLibrary("places");
        } catch {
          // ignore
        }
      }

      // Wait briefly for places namespace to become available (covers race conditions)
      for (let i = 0; i < 60; i++) {
        if (cancelled) return;

        const placesNs = (globalThis as any).google?.maps?.places as typeof google.maps.places | undefined;
        const AutoSvc = placesNs?.AutocompleteService as any;
        const TokenCtor = placesNs?.AutocompleteSessionToken as any;

        if (typeof AutoSvc === "function" && typeof TokenCtor === "function") {
          autoRef.current = new AutoSvc();
          tokenRef.current = new TokenCtor();
          return;
        }

        await new Promise<void>((r) => requestAnimationFrame(() => r()));
      }

      console.error(
        "[DesktopGoogleMapsPanel] Places library is not available (google.maps.places). " +
          "Google Maps JS API must be loaded with the Places library (libraries=places) " +
          "or support importLibrary('places')."
      );
    };

    initAutocomplete().catch((e) => {
      console.error("[DesktopGoogleMapsPanel] google maps load failed:", e);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const closeList = () => setOpen(false);

  const fetchPredictions = (q: string) => {
    const svc = autoRef.current;
    if (!svc) return;

    const myReq = ++reqIdRef.current;
    setPredLoading(true);

    svc.getPlacePredictions(
      {
        input: q,
        componentRestrictions: { country: "jp" },
        sessionToken: tokenRef.current ?? undefined,
      },
      (preds, status) => {
        if (myReq !== reqIdRef.current) return;
        setPredLoading(false);
        if (status !== "OK" || !preds) {
          setPredictions([]);
          return;
        }
        setPredictions(preds);
      }
    );
  };

  // Debounce prediction fetch
  useEffect(() => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    const q = value.trim();
    if (!q) {
      setPredictions([]);
      setPredLoading(false);
      return;
    }

    debounceRef.current = window.setTimeout(() => {
      fetchPredictions(q);
    }, 200);

    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return;
    const el = rootRef.current;
    if (!el) return;

    const onDocDown = (e: MouseEvent | TouchEvent) => {
      if (e.target instanceof Node && el.contains(e.target)) return;
      closeList();
    };

    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("touchstart", onDocDown);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("touchstart", onDocDown);
    };
  }, [open]);

  const submit = (q: string) => {
    const query = String(q ?? "").trim();
    if (!query) return;

    onSubmitQuery(query);

    setOpen(false);
    setPredictions([]);
    setPredLoading(false);

    reqIdRef.current += 1;
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    inputRef.current?.blur();

    const TokenCtor = (globalThis as any).google?.maps?.places?.AutocompleteSessionToken as any;
    tokenRef.current = typeof TokenCtor === "function" ? new TokenCtor() : null;
  };

  const chips: DesktopSearchChipKey[] = useMemo(
    () => ["restaurant", "hotel", "activity", "transit", "museum", "pharmacy", "atm"],
    []
  );

  // Once the results panel is shown, behave like Google Maps: stop showing autocomplete.
  const showResults = mode !== "none";
  const showSidePanel = showResults || loading || Boolean(selectedPlaceId) || Boolean(selectedPlaceDetails);

  const showPredList = open && !showSidePanel && (predLoading || predictions.length > 0);

  // When we enter the results panel, the autocomplete dropdown should not linger
  useEffect(() => {
    if (!showSidePanel) return;
    setOpen(false);
    setPredictions([]);
    setPredLoading(false);
    reqIdRef.current += 1;
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, [showSidePanel]);

  // When user starts typing and we are not in results panel, open dropdown
  useEffect(() => {
    if (!showSidePanel && value.trim()) setOpen(true);
  }, [showSidePanel, value]);

  const allAreaLabel = labelForChip("all", lang);

  const defaultTourNames = useMemo(
    () => ["春の中山道北上ツアー", "夏の渓谷ずぶ濡れツアー", "秋の中山道南下ツアー", "冬の温泉ぬくぬくツアー"],
    []
  );

  const tourNames = useMemo(() => {
    const fromProps = sampleTours && sampleTours.length > 0 ? sampleTours : defaultTourNames;
    const set = new Set(fromProps);
    const ordered = defaultTourNames.filter((n) => set.has(n));
    for (const n of fromProps) if (!ordered.includes(n)) ordered.push(n);
    return ordered;
  }, [sampleTours, defaultTourNames]);

  const websiteLabel = lang === "en" ? "Website" : "公式サイト";

  return (
    <div
      ref={rootRef}
      className={
        !showSidePanel
          ? "fixed left-1/2 top-4 z-[94] w-[720px] max-w-[92vw] -translate-x-1/2 p-3 pointer-events-none"
          : "absolute left-0 top-0 bottom-0 z-[94] w-[380px] max-w-[92vw] bg-white text-neutral-900 shadow-2xl border-r border-neutral-200 pointer-events-auto flex flex-col"
      }
    >
      {/* Top: search bar + chips */}
      <div
        className={
          !showSidePanel
            ? "pointer-events-auto p-2" // transparent like Google Maps (search UI only)
            : "p-3 border-b border-neutral-200"
        }
      >
        <div className="relative">
          <div className="flex items-center gap-2 rounded-full bg-white shadow-md border border-neutral-300 px-3 py-2">
            <span className="text-neutral-600 text-sm">🔍</span>

            <input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onFocus={() => {
                if (!showSidePanel && value.trim()) setOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit(value);
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  closeList();
                }
              }}
              placeholder={t("search.placeholder")}
              className="flex-1 bg-transparent outline-none text-sm text-neutral-900 placeholder:text-neutral-500"
            />

            {value ? (
              <button
                onClick={() => {
                  setValue("");
                  setPredictions([]);
                  setOpen(false);
                }}
                className="text-neutral-700 text-xs px-2 py-1 rounded-full border border-neutral-300 hover:bg-neutral-50"
                title={t("search.clear")}
                aria-label={t("search.clear")}
                type="button"
              >
                ×
              </button>
            ) : null}

            <button
              onClick={() => submit(value)}
              className="px-3 py-1 rounded-full bg-neutral-900 text-white text-xs font-semibold"
              type="button"
            >
              {t("search.search")}
            </button>
          </div>

          {/* predictions */}
          {showPredList ? (
            <div className="absolute left-0 right-0 mt-2 rounded-2xl bg-white shadow-xl border border-neutral-200 overflow-hidden">
              {predLoading ? (
                <div className="px-4 py-3 text-sm text-neutral-600">{t("search.loading")}</div>
              ) : null}

              {!predLoading && predictions.length === 0 ? (
                <div className="px-4 py-3 text-sm text-neutral-600">{t("search.noResults")}</div>
              ) : null}

              {predictions.map((p, idx) => {
                const main = p.structured_formatting?.main_text ?? p.description;
                const secondary = p.structured_formatting?.secondary_text ?? "";
                return (
                  <button
                    key={(p.place_id ?? "nopid") + "|" + p.description + "|" + idx}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      setValue(p.description);
                      submit(p.description);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-neutral-100 active:bg-neutral-100 border-t border-neutral-100"
                    type="button"
                  >
                    <div className="text-sm font-medium truncate">{main}</div>
                    {secondary ? <div className="text-xs text-neutral-600 truncate">{secondary}</div> : null}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        {/* Chips */}
        <div className="mt-3 flex gap-2 overflow-x-hidden">
          {chips.map((k, idx) => {
            const label = labelForChip(k, lang);
            const emoji = emojiForChip(k);
            return (
              <button
                key={`${k}-${idx}`}
                onClick={() => {
                  setValue(label);
                  onSelectChip(k);
                  setOpen(false);
                  setPredictions([]);
                }}
                className="shrink-0 flex items-center gap-1 rounded-full border border-neutral-300 bg-white px-3 py-1 text-sm shadow-sm hover:bg-neutral-50"
                type="button"
              >
                <span>{emoji}</span>
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Extra rows (PC): 全域 + サンプルツアー */}
        <div className="mt-3 flex gap-2 overflow-x-hidden">
          <button
            onClick={() => {
              setValue(allAreaLabel);
              onSelectChip("all");
              setOpen(false);
              setPredictions([]);
            }}
            className="shrink-0 flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1 text-sm shadow-sm hover:bg-emerald-200"
            type="button"
          >
            <span>{allAreaLabel}</span>
          </button>
        </div>

        {onLoadSampleTour ? (
          <div className="mt-2 flex gap-2 overflow-x-hidden">
            {tourNames.map((tourName, idx) => (
              <button
                // Ensure a stable unique key even if tour names repeat
                key={`${tourName}-${idx}`}
                onClick={() => {
                  setValue("");
                  setOpen(false);
                  setPredictions([]);
                  onClearResults();
                  onCloseSelectedPlace();
                  onLoadSampleTour(tourName);
                }}
                className="shrink-0 rounded-full border border-amber-200 bg-amber-100 px-3 py-1 text-sm shadow-sm hover:bg-amber-200"
                type="button"
              >
                {translateTourName(tourName, lang)}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* Side panel body (only when shown) */}
      {showSidePanel ? (
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="px-2 py-3 text-sm text-neutral-600">{t("common.loading")}</div>
          ) : null}

          {!loading && mode !== "activity" && results.length === 0 ? (
            <div className="px-2 py-3 text-sm text-neutral-600">
              {lang === "ja" ? "結果が見つかりません" : "No results"}
            </div>
          ) : null}

          {!loading && mode === "activity" && activityResults.length === 0 ? (
            <div className="px-2 py-3 text-sm text-neutral-600">{lang === "ja" ? "リストが空です" : "No items"}</div>
          ) : null}

          {/* Place results */}
          {mode !== "activity"
            ? results.map((r, idx) => {
                const ratingText = formatRating(r.rating, r.userRatingsTotal);
                const selected = selectedPlaceId && r.placeId === selectedPlaceId;

                return (
                  <button
                    key={`${r.placeId}-${idx}`}
                    onClick={() => onSelectPlace(r.placeId)}
                    className={[
                      "w-full text-left rounded-xl px-3 py-3 hover:bg-neutral-100 border border-transparent",
                      selected ? "bg-neutral-100" : "bg-white",
                    ].join(" ")}
                    type="button"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-14 w-14 shrink-0 rounded-lg overflow-hidden bg-neutral-100 border border-neutral-200">
                        {r.photoUrl ? (
                          <img
                            src={r.photoUrl}
                            alt={r.name}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="h-full w-full grid place-items-center text-neutral-500">📍</div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold truncate">{r.name}</div>
                        {ratingText ? <div className="text-xs text-neutral-600">{ratingText}</div> : null}
                        {r.address ? <div className="text-xs text-neutral-600 truncate">{r.address}</div> : null}
                      </div>
                    </div>
                  </button>
                );
              })
            : null}

          {/* Activity (curated) results */}
          {mode === "activity"
            ? activityResults.map((p, idx) => {
                const titleLabel = translateSpotTitle(p.title, lang);
                const imgSrc = publicImageUrlFromImgCell(p.img);
                const emoji = emojiForMenuIcon(p.icon);

                const otaLabel = lang === "en" ? "Book" : "予約";
                const mapLabel = lang === "en" ? "Map" : "地図";

                return (
                  <div
                    key={`${p.menuid}-${idx}`}
                    className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-3 hover:bg-neutral-50"
                  >
                    <button
                      onClick={() => onSelectActivity(p)}
                      className="w-full text-left"
                      type="button"
                      title={titleLabel}
                    >
                      <div className="flex gap-3 items-start">
                        <div className="h-14 w-14 rounded-lg overflow-hidden border border-neutral-200 bg-neutral-100 shrink-0">
                          {imgSrc ? (
                            <img
                              src={imgSrc}
                              alt={titleLabel}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="h-full w-full grid place-items-center text-neutral-500">{emoji}</div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold truncate">{titleLabel}</div>
                          {p.subtitle ? <div className="text-xs text-neutral-600">{p.subtitle}</div> : null}
                          <div className="mt-1 flex flex-wrap gap-2 text-xs text-neutral-600">
                            {p.time ? <span>{p.time}</span> : null}
                            {p.area ? <span>• {p.area}</span> : null}
                            {p.price ? <span>• {p.price}</span> : null}
                          </div>
                        </div>
                      </div>
                    </button>

                    <div className="mt-2 flex gap-4 text-xs">
                      {p.url ? (
                        <a href={p.url} target="_blank" rel="noreferrer" className="hover:underline">
                          {websiteLabel}
                        </a>
                      ) : null}
                      {p.ota ? (
                        <a href={p.ota} target="_blank" rel="noreferrer" className="hover:underline">
                          {otaLabel}
                        </a>
                      ) : null}
                      {p.map ? (
                        <a href={p.map} target="_blank" rel="noreferrer" className="hover:underline">
                          {mapLabel}
                        </a>
                      ) : null}
                    </div>
                  </div>
                );
              })
            : null}
        </div>
      ) : null}
    </div>
  );
}
