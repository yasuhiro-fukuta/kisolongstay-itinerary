// src/components/MapSearchBar.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/lib/googleMapsLoader";
import type { PickedPlace } from "@/components/GoogleMapCanvas";
import { useI18n } from "@/lib/i18n";

type Prediction = google.maps.places.AutocompletePrediction;

export default function MapSearchBar({ onPick }: { onPick: (p: PickedPlace) => void }) {
  const { t } = useI18n();

  const rootRef = useRef<HTMLDivElement | null>(null);

  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [predictions, setPredictions] = useState<Prediction[]>([]);

  const autoRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesRef = useRef<google.maps.places.PlacesService | null>(null);
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
        // PlacesService works without an actual Map instance (div is fine)
        placesRef.current = new google.maps.places.PlacesService(document.createElement("div"));
        tokenRef.current = new google.maps.places.AutocompleteSessionToken();
      })
      .catch((e) => {
        console.error("[MapSearchBar] google maps load failed:", e);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const closeList = () => setOpen(false);

  const openList = () => {
    const q = value.trim();
    if (!q) return;
    setOpen(true);
  };

  const fetchPredictions = (q: string) => {
    const svc = autoRef.current;
    if (!svc) return;

    const myReq = ++reqIdRef.current;

    setLoading(true);
    svc.getPlacePredictions(
      {
        input: q,
        componentRestrictions: { country: "jp" },
        sessionToken: tokenRef.current ?? undefined,
      },
      (res, status) => {
        if (myReq !== reqIdRef.current) return;

        setLoading(false);

        if (status !== "OK" || !res) {
          setPredictions([]);
          return;
        }

        setPredictions(res.slice(0, 5));
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
      setLoading(false);
      setOpen(false);
      return;
    }

    // show suggestions while typing
    setOpen(true);

    debounceRef.current = window.setTimeout(() => {
      fetchPredictions(q);
    }, 180);

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

  const pickPrediction = (pred: Prediction) => {
    const placeId = pred.place_id;
    const places = placesRef.current;

    if (!placeId || !places) return;

    setLoading(true);

    places.getDetails(
      {
        placeId,
        fields: ["place_id", "name", "geometry", "url", "website", "icon", "types"],
        sessionToken: tokenRef.current ?? undefined,
      },
      (p, status) => {
        setLoading(false);

        if (!p || status !== "OK") return;

        const loc = p.geometry?.location;
        const lat = loc?.lat?.();
        const lng = loc?.lng?.();

        const finalPlaceId = p.place_id ?? placeId;
        const mapUrl =
          (p as any).url ||
          (finalPlaceId ? `https://www.google.com/maps/place/?q=place_id:${finalPlaceId}` : "");

        onPick({
          placeId: finalPlaceId,
          name: p.name ?? pred.description,
          mapUrl,
          website: (p as any).website ?? "",
          iconUrl: String((p as any).icon ?? ""),
          types: Array.isArray((p as any).types) ? ((p as any).types as any[]).map(String) : undefined,
          lat: typeof lat === "number" ? lat : undefined,
          lng: typeof lng === "number" ? lng : undefined,
        });

        // UI
        setValue(p.name ?? pred.description);
        setPredictions([]);
        setOpen(false);

        // New session token for the next search
        tokenRef.current = new google.maps.places.AutocompleteSessionToken();
      },
    );
  };

  const onClickSearch = () => {
    // Mimic Google Maps: show suggestions when pressing Search
    const q = value.trim();
    if (!q) return;

    openList();
    fetchPredictions(q);
  };

  const showList = open && (predictions.length > 0 || loading);

  return (
    <div ref={rootRef} className="absolute left-1/2 top-[calc(env(safe-area-inset-top,0px)+28px)] z-[50] -translate-x-1/2 pointer-events-auto md:top-4">
      <div className="relative w-[min(92vw,420px)]">
        {/* search bar */}
        <div className="flex items-center gap-2 rounded-full bg-neutral-950/80 backdrop-blur shadow-lg border border-neutral-800 px-3 py-2">
          <span className="text-neutral-300 text-sm">🔍</span>

          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => {
              if (value.trim()) setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onClickSearch();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                closeList();
              }
            }}
            placeholder={t("search.placeholder")}
            className="flex-1 bg-transparent outline-none text-sm text-neutral-100 placeholder:text-neutral-500"
          />

          {value ? (
            <button
              onClick={() => {
                setValue("");
                setPredictions([]);
                setOpen(false);
              }}
              className="text-neutral-300 text-xs px-2 py-1 rounded-full border border-neutral-800"
              title={t("search.clear")}
              aria-label={t("search.clear")}
            >
              ×
            </button>
          ) : null}

          <button
            onClick={onClickSearch}
            className="px-3 py-1 rounded-full bg-white text-black text-xs font-semibold"
          >
            {t("search.search")}
          </button>
        </div>

        {/* predictions (max 5) */}
        {showList ? (
          <div className="mt-2 rounded-2xl bg-white text-neutral-900 shadow-xl border border-neutral-200 overflow-hidden">
            {loading ? (
              <div className="px-4 py-3 text-sm text-neutral-600">{t("search.loading")}</div>
            ) : null}

            {!loading && predictions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-neutral-600">{t("search.noResults")}</div>
            ) : null}

            {predictions.map((p) => {
              const main = p.structured_formatting?.main_text ?? p.description;
              const secondary = p.structured_formatting?.secondary_text ?? "";

              return (
                <button
                  key={p.place_id + "|" + p.description}
                  // fire before blur (more stable on mobile)
                  onPointerDown={(e) => {
                    e.preventDefault();
                    pickPrediction(p);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-neutral-100 active:bg-neutral-100 border-t border-neutral-100"
                >
                  <div className="text-sm font-medium truncate">{main}</div>
                  {secondary ? <div className="text-xs text-neutral-600 truncate">{secondary}</div> : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}