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

export type DesktopSearchMode = "none" | "place" | "category" | "activity";

function emojiForChip(key: DesktopSearchChipKey): string {
  switch (key) {
    case "all":
      return "🌐";
    case "restaurant":
      return "🍽️";
    case "hotel":
      return "🏨";
    case "activity":
      return "🧭";
    case "transit":
      return "🚉";
    case "museum":
      return "🏛️";
    case "pharmacy":
      return "💊";
    case "atm":
      return "🏧";
  }
}

function labelForChip(key: DesktopSearchChipKey, lang: "ja" | "en"): string {
  const ja: Record<DesktopSearchChipKey, string> = {
    all: "全域",
    restaurant: "レストラン",
    hotel: "ホテル",
    activity: "アクティビティ",
    transit: "交通機関",
    museum: "美術館・博物館",
    pharmacy: "薬局",
    atm: "ATM",
  };
  const en: Record<DesktopSearchChipKey, string> = {
    all: "All area",
    restaurant: "Restaurants",
    hotel: "Hotels",
    activity: "Activities",
    transit: "Transit",
    museum: "Museums",
    pharmacy: "Pharmacies",
    atm: "ATM",
  };
  return lang === "ja" ? ja[key] : en[key];
}

function formatRating(rating?: number, total?: number): string {
  if (typeof rating !== "number" || !Number.isFinite(rating)) return "";
  const r = Math.round(rating * 10) / 10;
  if (typeof total === "number" && Number.isFinite(total) && total > 0) {
    return `${r} (${total})`;
  }
  return String(r);
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
  /** Display label for the current results (e.g., the submitted query). */
  queryLabel: string;
  results: PlaceListItem[];
  selectedPlaceId: string | null;
  selectedPlaceDetails: DesktopPlaceDetails | null;
  activityResults: MenuRow[];

  onSubmitQuery: (query: string) => void;
  onSelectChip: (key: DesktopSearchChipKey) => void;
  onSelectPlace: (placeId: string) => void;
  onSelectActivity: (row: MenuRow) => void;
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
    loadGoogleMaps()
      .then(() => {
        if (cancelled) return;
        autoRef.current = new google.maps.places.AutocompleteService();
        tokenRef.current = new google.maps.places.AutocompleteSessionToken();
      })
      .catch((e) => {
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
      (res, status) => {
        if (myReq !== reqIdRef.current) return;
        setPredLoading(false);

        if (status !== "OK" || !res) {
          setPredictions([]);
          return;
        }

        setPredictions(res.slice(0, 6));
      },
    );
  };

  // Update predictions on input (light debounce)
  useEffect(() => {
    const q = value.trim();
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    if (!q) {
      setPredictions([]);
      setPredLoading(false);
      setOpen(false);
      return;
    }

    setOpen(true);
    debounceRef.current = window.setTimeout(() => fetchPredictions(q), 160);

    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [value]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;

    const onDocDown = (e: MouseEvent | TouchEvent) => {
      const el = rootRef.current;
      if (!el) return;
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
    // Close prediction dropdown so it won't linger when switching into results mode.
    setOpen(false);
    setPredictions([]);
    setPredLoading(false);
    // Cancel any in-flight/queued prediction request.
    reqIdRef.current += 1;
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    inputRef.current?.blur();
    tokenRef.current = new google.maps.places.AutocompleteSessionToken();
  };

  const chips: DesktopSearchChipKey[] = useMemo(
    () => ["restaurant", "hotel", "activity", "transit", "museum", "pharmacy", "atm"],
    [],
  );

	// Once the results panel is shown, behave like Google Maps: stop showing autocomplete.
	const showResults = mode !== "none";
  const showSidePanel = showResults || loading || Boolean(selectedPlaceId) || Boolean(selectedPlaceDetails);

  
const showPredList = open && !showSidePanel && (predLoading || predictions.length > 0);
  // When we enter the results panel, the autocomplete dropdown should not linger
  // (Google Maps behavior). Also cancel any pending prediction work.
  useEffect(() => {
    if (!showSidePanel) return;
    setOpen(false);
    setPredictions([]);
    setPredLoading(false);
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    reqIdRef.current += 1;
  }, [showSidePanel]);

  const allAreaLabel = lang === "en" ? "All area" : "全域";
  const defaultTourNames = useMemo(
    () => [
      "春の中山道北上ツアー",
      "夏の渓谷ずぶ濡れツアー",
      "秋の中山道南下ツアー",
      "冬の温泉ぬくぬくツアー",
    ],
    [],
  );
  const tourNames = useMemo(() => {
    const fromProps = sampleTours && sampleTours.length > 0 ? sampleTours : defaultTourNames;
    const set = new Set(fromProps);
    const ordered = defaultTourNames.filter((n) => set.has(n));
    for (const n of fromProps) {
      if (!ordered.includes(n)) ordered.push(n);
    }
    return ordered;
  }, [sampleTours, defaultTourNames]);

  // Details card (desktop): try to show at least list-level info immediately,
  // and upgrade to full place details once they are loaded.
  const selectedListItem = selectedPlaceId
    ? results.find((r) => r.placeId === selectedPlaceId)
    : undefined;

  const detailsReady = Boolean(
    selectedPlaceId && selectedPlaceDetails?.placeId === selectedPlaceId,
  );

  const detailName =
    (detailsReady ? selectedPlaceDetails?.name : selectedListItem?.name) ?? "";
  const detailAddress =
    (detailsReady
      ? selectedPlaceDetails?.formattedAddress
      : selectedListItem?.address) ?? "";
  const detailRating = detailsReady
    ? selectedPlaceDetails?.rating
    : selectedListItem?.rating;
  const detailUserRatingsTotal = detailsReady
    ? selectedPlaceDetails?.userRatingsTotal
    : selectedListItem?.userRatingsTotal;
  const detailPhotoUrl =
    (detailsReady ? selectedPlaceDetails?.photoUrl : selectedListItem?.photoUrl) ??
    "";

  const detailMapUrl = detailsReady ? selectedPlaceDetails?.mapUrl ?? "" : "";
  const detailWebsite = detailsReady ? selectedPlaceDetails?.website ?? "" : "";

  const addLabel = lang === "en" ? "Add to itinerary" : "旅程に追加";
  const openMapLabel = lang === "en" ? "Open in Google Maps" : "GoogleMapで開く";
  const openWebsiteLabel = lang === "en" ? "Website" : "公式サイト";

  return (
    <div
      ref={rootRef}
      className={
        !showSidePanel
          ? "fixed left-1/2 top-4 z-[70] w-[720px] max-w-[92vw] -translate-x-1/2 p-3 pointer-events-none"
          : "absolute left-0 top-0 bottom-0 z-[70] w-[380px] max-w-[92vw] bg-white text-neutral-900 shadow-2xl border-r border-neutral-200 pointer-events-auto flex flex-col"
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
								// Before running a search we allow focusing the bar to reopen suggestions.
								// Once the results panel is open, don't auto-open suggestions just because a value exists.
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

              {predictions.map((p) => {
                const main = p.structured_formatting?.main_text ?? p.description;
                const secondary = p.structured_formatting?.secondary_text ?? "";
                return (
                  <button
                    key={p.place_id + "|" + p.description}
                    onPointerDown={(e) => {
                      // fire before blur
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
          {chips.map((k) => {
            const label = labelForChip(k, lang);
            const emoji = emojiForChip(k);
            return (
              <button
                key={k}
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

      {/* Results */}
      {showSidePanel ? (
        <div className="h-full overflow-auto">
        {showResults ? (
          <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-neutral-200 px-4 py-3 flex items-center justify-between">
            <div className="text-sm font-semibold truncate">
              {queryLabel ? queryLabel : lang === "ja" ? "結果" : "Results"}
            </div>
            <button
              onClick={() => onClearResults()}
              className="text-sm px-3 py-1 rounded-full border border-neutral-300 hover:bg-neutral-50"
              type="button"
            >
              {lang === "ja" ? "クリア" : "Clear"}
            </button>
          </div>
        ) : (
          <div className="px-4 py-4 text-sm text-neutral-600">
            {lang === "ja" ? "検索またはカテゴリを選んでください" : "Search or choose a category"}
          </div>
        )}

        {/* Selected place details */}
        {showResults && mode !== "activity" && selectedPlaceId ? (
          <div className="border-b border-neutral-200 bg-white px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-neutral-900 truncate">
                  {detailName || (lang === "ja" ? "選択中" : "Selected")}
                </div>
                {detailAddress ? (
                  <div className="mt-0.5 text-xs text-neutral-600 line-clamp-2">
                    {detailAddress}
                  </div>
                ) : null}
                {typeof detailRating === "number" ? (
                  <div className="mt-1 text-xs text-neutral-700">
                    ★ {detailRating.toFixed(1)}
                    {typeof detailUserRatingsTotal === "number"
                      ? ` (${detailUserRatingsTotal})`
                      : ""}
                  </div>
                ) : null}
                {!detailsReady ? (
                  <div className="mt-1 text-xs text-neutral-500">
                    {lang === "ja" ? "詳細を読み込み中..." : "Loading details..."}
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                onClick={onCloseSelectedPlace}
                className="rounded-full p-2 hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900"
                aria-label={lang === "ja" ? "閉じる" : "Close"}
              >
                <span className="text-lg leading-none">×</span>
              </button>
            </div>

            {detailPhotoUrl ? (
              <div className="mt-3">
                <img
                  src={detailPhotoUrl}
                  alt={detailName}
                  className="h-40 w-full object-cover rounded-xl border border-neutral-200"
                />
              </div>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onAddSelectedPlaceToItinerary}
                disabled={!detailsReady}
                className="inline-flex items-center justify-center rounded-full bg-emerald-600 text-white px-4 py-2 text-xs font-semibold shadow-sm hover:bg-emerald-700 disabled:bg-neutral-300 disabled:text-neutral-600 disabled:cursor-not-allowed"
              >
                {lang === "ja" ? "旅程に追加" : "Add to itinerary"}
              </button>

              {detailsReady && detailMapUrl ? (
                <a
                  href={detailMapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-medium text-neutral-800 hover:bg-neutral-50"
                >
                  {lang === "ja" ? "GoogleMapで開く" : "Open in Google Maps"}
                </a>
              ) : null}

              {detailsReady && detailWebsite ? (
                <a
                  href={detailWebsite}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-medium text-neutral-800 hover:bg-neutral-50"
                >
                  {lang === "ja" ? "公式サイト" : "Website"}
                </a>
              ) : null}
            </div>
          </div>
        ) : null}

        {showResults ? (
          <div className="px-2 py-2">
            {loading ? (
              <div className="px-2 py-3 text-sm text-neutral-600">{t("common.loading")}</div>
            ) : null}

            {!loading && mode !== "activity" && results.length === 0 ? (
              <div className="px-2 py-3 text-sm text-neutral-600">
                {lang === "ja" ? "結果が見つかりません" : "No results"}
              </div>
            ) : null}

            {!loading && mode === "activity" && activityResults.length === 0 ? (
              <div className="px-2 py-3 text-sm text-neutral-600">
                {lang === "ja" ? "リストが空です" : "No items"}
              </div>
            ) : null}

            {/* Place results */}
            {mode !== "activity"
              ? results.map((r) => {
                  const ratingText = formatRating(r.rating, r.userRatingsTotal);
                  const selected = selectedPlaceId && r.placeId === selectedPlaceId;

                  return (
                    <button
                      key={r.placeId}
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
              ? activityResults.map((p) => {
                  const titleLabel = translateSpotTitle(p.title, lang);
                  const imgSrc = publicImageUrlFromImgCell(p.img);
                  const emoji = emojiForMenuIcon(p.icon);

                  return (
                    <div
                      key={p.menuid}
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
                            <div className="text-[11px] text-neutral-500 truncate">{p.icon ? p.icon : "spot"}</div>
                            <div className="text-sm font-semibold truncate flex items-center gap-2">
                              <span className="shrink-0">{emoji}</span>
                              <span className="truncate">{titleLabel}</span>
                            </div>
                          </div>
                        </div>
                      </button>

                      <div className="mt-2 flex flex-wrap justify-end gap-3 text-xs text-neutral-700">
                        {p.mapUrl ? (
                          <a
                            href={p.mapUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:underline"
                          >
                            Map
                          </a>
                        ) : null}
                        {p.hpUrl ? (
                          <a
                            href={p.hpUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:underline"
                          >
                            HP
                          </a>
                        ) : null}
                        {p.otaUrl ? (
                          <a
                            href={p.otaUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:underline"
                          >
                            OTA
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
      ) : null}
    </div>
  );
}
