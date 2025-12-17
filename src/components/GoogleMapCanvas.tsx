// src/components/GoogleMapCanvas.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { loadGoogleMaps } from "@/lib/googleMapsLoader";
import type { ItineraryItem, DayIndex } from "@/lib/itinerary";

export type PickedPlace = {
  placeId?: string;
  name?: string;
  website?: string;
  mapUrl?: string;

  bookingUrl?: string;
  airbnbUrl?: string;
  rakutenUrl?: string;
  viatorUrl?: string;
};

type FocusParsed =
  | { type: "text"; query: string }
  | { type: "url"; url: string; nameHint?: string };

type LatLng = google.maps.LatLngLiteral;

type StopResolved = {
  key: string;
  latLng: LatLng;
  placeId?: string;
  name?: string;
  mapUrl?: string;
};

function parseFocusToken(raw?: string | null): FocusParsed | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;

  const parts = s.split("|||").map((x) => x.trim()).filter(Boolean);
  const head = parts[0] ?? "";

  const nameHint =
    parts.find((p) => p.startsWith("name:"))?.slice("name:".length).trim() ||
    undefined;

  if (head.startsWith("url:")) return { type: "url", url: head.slice(4).trim(), nameHint };
  if (head.startsWith("text:")) return { type: "text", query: head.slice(5).trim() };

  return { type: "text", query: head };
}

async function resolveMapUrl(url: string): Promise<{
  ok: boolean;
  finalUrl?: string;
  lat?: number | null;
  lng?: number | null;
  placeId?: string | null;
  error?: string;
}> {
  try {
    const res = await fetch("/api/resolve-map", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const data = await res.json().catch(() => ({} as any));
    if (!res.ok || !data?.ok) {
      return { ok: false, error: String(data?.error ?? `HTTP ${res.status}`) };
    }
    return data;
  } catch (e: any) {
    return { ok: false, error: String(e?.message ?? e ?? "network error") };
  }
}

async function fetchWalkRoute(stops: LatLng[], signal?: AbortSignal): Promise<string | null> {
  try {
    const res = await fetch("/api/walkroute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stops }),
      signal,
    });
    const data = await res.json().catch(() => ({} as any));
    if (!res.ok || !data?.ok) {
      console.warn("[walkroute] API failed:", data?.error ?? `HTTP ${res.status}`);
      return null;
    }
    return String(data?.encodedPolyline ?? "") || null;
  } catch (e: any) {
    if (String(e?.name ?? "") === "AbortError") return null;
    console.warn("[walkroute] fetch error:", e);
    return null;
  }
}

// Google encoded polyline decode (1e5)
function decodePolyline(encoded: string): LatLng[] {
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;
  const path: LatLng[] = [];

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlat = (result & 1) ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlng = (result & 1) ? ~(result >> 1) : result >> 1;
    lng += dlng;

    path.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return path;
}

function colorForDay(day: DayIndex): string {
  const cycle = ["#2563eb", "#22c55e", "#eab308", "#ef4444"]; // 青,緑,黄,赤
  return cycle[(day - 1) % cycle.length];
}

function sameStop(a: StopResolved, b: StopResolved): boolean {
  if (a.placeId && b.placeId && a.placeId === b.placeId) return true;
  const dx = Math.abs(a.latLng.lat - b.latLng.lat);
  const dy = Math.abs(a.latLng.lng - b.latLng.lng);
  return dx < 1e-6 && dy < 1e-6;
}

export default function GoogleMapCanvas({
  items,
  selectedItemId,
  onPickPlace,
  focusName,
}: {
  items: ItineraryItem[];
  selectedItemId: string | null;
  onPickPlace: (itemId: string | null, p: PickedPlace) => void;
  focusName?: string | null;
}) {
  const divRef = useRef<HTMLDivElement | null>(null);

  const mapRef = useRef<google.maps.Map | null>(null);
  const placesRef = useRef<google.maps.places.PlacesService | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

  const [ready, setReady] = useState(false);

  // ループ防止：props を ref に閉じ込める
  const selectedIdRef = useRef<string | null>(selectedItemId);
  const onPickPlaceRef = useRef(onPickPlace);

  useEffect(() => {
    selectedIdRef.current = selectedItemId;
  }, [selectedItemId]);

  useEffect(() => {
    onPickPlaceRef.current = onPickPlace;
  }, [onPickPlace]);

  // --------- map init ----------
  useEffect(() => {
    if (!divRef.current) return;

    let cancelled = false;

    loadGoogleMaps()
      .then(() => {
        if (cancelled) return;
        if (!divRef.current) return;
        if (mapRef.current) return;

        const map = new google.maps.Map(divRef.current, {
          center: { lat: 35.5739, lng: 137.6076 },
          zoom: 12,
          mapTypeId: "hybrid",
          clickableIcons: true,
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
        });

        mapRef.current = map;
        placesRef.current = new google.maps.places.PlacesService(map);

        setReady(true);

        // POI click → getDetails → write to list
        map.addListener("click", (e: any) => {
          const places = placesRef.current;
          if (!places) return;

          const placeId = e?.placeId as string | undefined;
          if (!placeId) return;

          places.getDetails(
            { placeId, fields: ["place_id", "name", "website", "url"] },
            (p, status) => {
              if (!p || status !== "OK") return;

              onPickPlaceRef.current(selectedIdRef.current, {
                placeId: p.place_id ?? placeId,
                name: p.name ?? "",
                website: (p as any).website ?? undefined,
                mapUrl: (p as any).url ?? undefined,
              });
            }
          );
        });
      })
      .catch((err) => console.error("Google Maps load error:", err));

    return () => {
      cancelled = true;
    };
  }, []);

  // --------- focus (text/url) -> pan + marker + set item ----------
  useEffect(() => {
    const parsed = parseFocusToken(focusName);
    if (!parsed) return;
    if (!ready) return;

    const map = mapRef.current;
    const places = placesRef.current;
    if (!map || !places) return;

    const setMarker = (pos: google.maps.LatLng | LatLng, title: string) => {
      if (markerRef.current) markerRef.current.setMap(null);
      markerRef.current = new google.maps.Marker({
        map,
        position: pos,
        title,
      });
    };

    if (parsed.type === "text") {
      const q = parsed.query.trim();
      if (!q) return;

      places.textSearch({ query: q }, (results, status) => {
        if (!results || status !== "OK" || !results[0]) return;

        const r0 = results[0];
        const loc = r0.geometry?.location;
        if (!loc) return;

        map.panTo(loc);
        map.setZoom(15);
        setMarker(loc, r0.name ?? q);

        onPickPlaceRef.current(selectedIdRef.current, {
          placeId: r0.place_id ?? undefined,
          name: r0.name ?? q,
          mapUrl: (r0 as any).url ?? undefined,
        });
      });

      return;
    }

    if (parsed.type === "url") {
      const url = parsed.url.trim();
      if (!url) return;

      let aborted = false;

      (async () => {
        const r = await resolveMapUrl(url);
        if (aborted) return;

        if (!r.ok) {
          console.warn("[resolve-map] failed:", r.error);
          if (parsed.nameHint) {
            onPickPlaceRef.current(selectedIdRef.current, {
              name: parsed.nameHint,
              mapUrl: url,
            });
          }
          return;
        }

        const lat = typeof r.lat === "number" ? r.lat : null;
        const lng = typeof r.lng === "number" ? r.lng : null;
        const finalUrl = String(r.finalUrl ?? url);
        const placeIdFromUrl = r.placeId ? String(r.placeId) : null;

        if (lat != null && lng != null) {
          const center = { lat, lng };
          map.panTo(center);
          map.setZoom(16);
          setMarker(center, parsed.nameHint ?? "selected");

          // まずURL起点で反映
          onPickPlaceRef.current(selectedIdRef.current, {
            placeId: placeIdFromUrl ?? undefined,
            name: parsed.nameHint ?? undefined,
            mapUrl: finalUrl || url,
          });

          // placeIdが無い時は、座標近傍で nameHint から placeId を補完
          const hint = (parsed.nameHint ?? "").trim();
          if (!hint) return;

          const biasCircle = new google.maps.Circle({ center, radius: 250 });

          places.findPlaceFromQuery(
            {
              query: hint,
              fields: ["place_id", "name"],
              locationBias: biasCircle as any,
            },
            (cands, st) => {
              if (!cands || st !== "OK" || !cands[0]) return;
              const pid = cands[0].place_id;
              if (!pid) return;

              places.getDetails(
                { placeId: pid, fields: ["place_id", "name", "website", "url"] },
                (p, st2) => {
                  if (!p || st2 !== "OK") return;
                  onPickPlaceRef.current(selectedIdRef.current, {
                    placeId: p.place_id ?? pid,
                    name: p.name ?? hint,
                    website: (p as any).website ?? undefined,
                    // mapUrl は既存を優先（上書きしない）
                  });
                }
              );
            }
          );
        }
      })();

      return () => {
        aborted = true;
      };
    }
  }, [focusName, ready]);

  // --------- ROUTE DRAW (all days, keep) ----------
  const routeKey = useMemo(() => {
    // ★price変更などでは再計算しないため、場所系のみでキー化
    return items
      .filter((it) => it.type === "spot")
      .map((it) => {
        const pid = String(it.placeId ?? "").trim();
        const url = String(it.mapUrl ?? "").trim();
        const nm = pid || url ? "" : String(it.name ?? "").trim(); // placeId/URLがあるなら名前変更は無視
        return `${it.day}|${pid}|${url}|${nm}`;
      })
      .join("||");
  }, [items]);

  const polylinesRef = useRef<Map<DayIndex, google.maps.Polyline>>(new Map());
  const placeIdCacheRef = useRef<Map<string, StopResolved>>(new Map());
  const mapUrlCacheRef = useRef<Map<string, StopResolved>>(new Map());
  const queryCacheRef = useRef<Map<string, StopResolved>>(new Map());
  const routeSeqRef = useRef(0);

  useEffect(() => {
    if (!ready) return;

    const map = mapRef.current;
    const places = placesRef.current;
    if (!map || !places) return;

    const seq = ++routeSeqRef.current;
    const ac = new AbortController();

    const days: DayIndex[] = [1, 2, 3, 4, 5];

    const setOrUpdatePolyline = (day: DayIndex, path: LatLng[]) => {
      const color = colorForDay(day);
      const existing = polylinesRef.current.get(day);
      if (existing) {
        existing.setOptions({
          strokeColor: color,
          strokeOpacity: 0.9,
          strokeWeight: 6,
          zIndex: 200 + day,
        });
        existing.setPath(path);
        if (!existing.getMap()) existing.setMap(map);
        return;
      }

      const pl = new google.maps.Polyline({
        map,
        path,
        strokeColor: color,
        strokeOpacity: 0.9,
        strokeWeight: 6,
        zIndex: 200 + day,
        clickable: false,
      });
      polylinesRef.current.set(day, pl);
    };

    const clearPolyline = (day: DayIndex) => {
      const pl = polylinesRef.current.get(day);
      if (!pl) return;
      pl.setMap(null);
      polylinesRef.current.delete(day);
    };

    const getDetailsLatLng = (placeId: string): Promise<StopResolved | null> => {
      const cached = placeIdCacheRef.current.get(placeId);
      if (cached) return Promise.resolve(cached);

      return new Promise((resolve) => {
        places.getDetails(
          { placeId, fields: ["place_id", "name", "geometry", "url"] },
          (p, status) => {
            if (!p || status !== "OK") return resolve(null);
            const loc = p.geometry?.location;
            if (!loc) return resolve(null);
            const v: StopResolved = {
              key: `pid:${placeId}`,
              latLng: { lat: loc.lat(), lng: loc.lng() },
              placeId: p.place_id ?? placeId,
              name: p.name ?? undefined,
              mapUrl: (p as any).url ?? undefined,
            };
            placeIdCacheRef.current.set(placeId, v);
            resolve(v);
          }
        );
      });
    };

    const textSearchLatLng = (query: string): Promise<StopResolved | null> => {
      const q = query.trim();
      if (!q) return Promise.resolve(null);
      const cached = queryCacheRef.current.get(q);
      if (cached) return Promise.resolve(cached);

      return new Promise((resolve) => {
        places.textSearch({ query: q }, (results, status) => {
          if (!results || status !== "OK" || !results[0]) return resolve(null);
          const r0 = results[0];
          const loc = r0.geometry?.location;
          if (!loc) return resolve(null);

          const v: StopResolved = {
            key: `q:${q}`,
            latLng: { lat: loc.lat(), lng: loc.lng() },
            placeId: r0.place_id ?? undefined,
            name: r0.name ?? q,
            mapUrl: (r0 as any).url ?? undefined,
          };
          queryCacheRef.current.set(q, v);
          resolve(v);
        });
      });
    };

    const mapUrlLatLng = async (url: string): Promise<StopResolved | null> => {
      const u = url.trim();
      if (!u) return null;
      const cached = mapUrlCacheRef.current.get(u);
      if (cached) return cached;

      const r = await resolveMapUrl(u);
      if (!r.ok) return null;

      const lat = typeof r.lat === "number" ? r.lat : null;
      const lng = typeof r.lng === "number" ? r.lng : null;
      if (lat == null || lng == null) return null;

      const v: StopResolved = {
        key: `url:${u}`,
        latLng: { lat, lng },
        placeId: r.placeId ? String(r.placeId) : undefined,
        mapUrl: String(r.finalUrl ?? u),
      };
      mapUrlCacheRef.current.set(u, v);
      return v;
    };

    const resolveStopFromItem = async (it: ItineraryItem): Promise<StopResolved | null> => {
      const pid = String(it.placeId ?? "").trim();
      if (pid) return await getDetailsLatLng(pid);

      const url = String(it.mapUrl ?? "").trim();
      if (url) {
        const v = await mapUrlLatLng(url);
        if (v) return v;
      }

      const nm = String(it.name ?? "").trim();
      if (nm) return await textSearchLatLng(nm);

      return null;
    };

    const timer = setTimeout(() => {
      (async () => {
        let lastStop: StopResolved | null = null;

        for (const day of days) {
          if (seq !== routeSeqRef.current) return;

          const dayItems = items.filter((x) => x.type === "spot" && x.day === day);
          const candidates = dayItems.filter((x) => {
            const pid = String(x.placeId ?? "").trim();
            const url = String(x.mapUrl ?? "").trim();
            const nm = String(x.name ?? "").trim();
            return !!(pid || url || nm);
          });

          // Dayに何もなければ、そのDayの線は消す（他Dayは維持）
          if (candidates.length === 0) {
            clearPolyline(day);
            // lastStopは維持（次Dayのブリッジ用に「直近の値あり」を保持）
            continue;
          }

          // 値あり行を順に解決
          const ownStops: StopResolved[] = [];
          for (const it of candidates) {
            if (seq !== routeSeqRef.current) return;
            const s = await resolveStopFromItem(it);
            if (s) ownStops.push(s);
          }

          // 解決が弱いとき：既存ルートを消さない（“消えたり出たり”を抑制）
          if (ownStops.length === 0) {
            console.warn("[walkroute] no resolved stops for day", day);
            continue;
          }

          // ブリッジ：DayNの最初の値あり行は、直近(lastStop)から繋ぐ（色はDayN）
          const routeStops = [...ownStops];
          if (lastStop && !sameStop(lastStop, routeStops[0])) {
            routeStops.unshift(lastStop);
          }

          // lastStop更新（Dayが空でも保持、Dayがあるなら末尾に更新）
          lastStop = ownStops[ownStops.length - 1];

          if (routeStops.length < 2) {
            // 1点しか無いなら線は消す（ただし他Dayは維持）
            clearPolyline(day);
            continue;
          }

          // stops -> polyline
          const latLngs = routeStops.map((s) => s.latLng);

          console.log("[walkroute] day", day, "stops:", latLngs);

          const encoded = await fetchWalkRoute(latLngs, ac.signal);
          if (seq !== routeSeqRef.current) return;

          if (!encoded) {
            console.warn("[walkroute] no polyline returned for day", day);
            // 失敗時は既存ルートを保持（消さない）
            continue;
          }

          const path = decodePolyline(encoded);
          if (!path.length) continue;

          setOrUpdatePolyline(day, path);
        }
      })();
    }, 450); // ★少し待ってから計算（入力中の揺れを抑える）

    return () => {
      clearTimeout(timer);
      ac.abort();
    };
  }, [ready, routeKey, items]);

  // unmount cleanup: remove polylines
  useEffect(() => {
    return () => {
      for (const pl of polylinesRef.current.values()) pl.setMap(null);
      polylinesRef.current.clear();
    };
  }, []);

  return <div ref={divRef} className="absolute inset-0" />;
}
