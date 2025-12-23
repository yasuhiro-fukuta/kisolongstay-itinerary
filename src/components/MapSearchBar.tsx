// src/components/MapSearchBar.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/lib/googleMapsLoader";
import type { PickedPlace } from "@/components/GoogleMapCanvas";

type Prediction = google.maps.places.AutocompletePrediction;

export default function MapSearchBar({
  onPick,
}: {
  // 予測候補を選んだ時に、ピン＋旅程反映する
  onPick: (p: PickedPlace) => void;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [predictions, setPredictions] = useState<Prediction[]>([]);

  const autoRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesRef = useRef<google.maps.places.PlacesService | null>(null);
  const tokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(
    null
  );

  const debounceRef = useRef<number | null>(null);
  const reqIdRef = useRef(0);

  // Google Maps（places）を確実に読み込み
  useEffect(() => {
    let cancelled = false;

    loadGoogleMaps()
      .then(() => {
        if (cancelled) return;

        autoRef.current = new google.maps.places.AutocompleteService();
        // PlacesService は Map が無くても div で動く
        placesRef.current = new google.maps.places.PlacesService(
          document.createElement("div")
        );
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
        // 日本国内に寄せる（GoogleMapの挙動に近い）
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
      }
    );
  };

  // 入力のたびに候補を更新（軽いデバウンス）
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

    // 入力中は候補を出す
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

  // 外クリックで候補を閉じる
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
        fields: ["place_id", "name", "geometry", "url"],
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
          (finalPlaceId
            ? `https://www.google.com/maps/place/?q=place_id:${finalPlaceId}`
            : "");

        // 旅程へ反映
        onPick({
          placeId: finalPlaceId,
          name: p.name ?? pred.description,
          mapUrl,
          lat: typeof lat === "number" ? lat : undefined,
          lng: typeof lng === "number" ? lng : undefined,
        });

        // UI
        setValue(p.name ?? pred.description);
        setPredictions([]);
        setOpen(false);

        // 次の検索は新しいセッション扱い
        tokenRef.current = new google.maps.places.AutocompleteSessionToken();
      }
    );
  };

  const onClickSearch = () => {
    // GoogleMapっぽく：検索を押したら「候補を出す」
    const q = value.trim();
    if (!q) return;

    openList();
    fetchPredictions(q);
  };

  const showList = open && (predictions.length > 0 || loading);

  return (
    <div
      ref={rootRef}
      className="absolute left-1/2 top-4 z-[50] -translate-x-1/2 pointer-events-auto"
    >
      <div className="relative w-[min(92vw,420px)]">
        {/* 検索バー */}
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
            placeholder="場所名・駅名・住所で検索"
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
              title="クリア"
            >
              ×
            </button>
          ) : null}

          <button
            onClick={onClickSearch}
            className="px-3 py-1 rounded-full bg-white text-black text-xs font-semibold"
          >
            検索
          </button>
        </div>

        {/* 予測候補（最大5件） */}
        {showList ? (
          <div className="mt-2 rounded-2xl bg-white text-neutral-900 shadow-xl border border-neutral-200 overflow-hidden">
            {loading ? (
              <div className="px-4 py-3 text-sm text-neutral-600">
                候補を取得中…
              </div>
            ) : null}

            {!loading && predictions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-neutral-600">
                候補が見つかりません
              </div>
            ) : null}

            {predictions.map((p) => {
              const main = p.structured_formatting?.main_text ?? p.description;
              const secondary = p.structured_formatting?.secondary_text ?? "";

              return (
                <button
                  key={p.place_id + "|" + p.description}
                  // blurより先に発火させる（モバイルで安定）
                  onPointerDown={(e) => {
                    e.preventDefault();
                    pickPrediction(p);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-neutral-100 active:bg-neutral-100 border-t border-neutral-100"
                >
                  <div className="text-sm font-medium truncate">{main}</div>
                  {secondary ? (
                    <div className="text-xs text-neutral-600 truncate">
                      {secondary}
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
