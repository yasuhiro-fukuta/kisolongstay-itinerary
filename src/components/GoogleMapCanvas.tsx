// src/components/GoogleMapCanvas.tsx
"use client";

import { useEffect, useMemo, useRef } from "react";
import { loadGoogleMaps } from "@/lib/googleMapsLoader";
import type { ItineraryItem } from "@/lib/itinerary";
import { dayColor } from "@/lib/dayColors";

export type PickedPlace = {
  placeId?: string;
  name?: string;
  mapUrl?: string;
  lat?: number;
  lng?: number;
};

export type MapFocus =
  | { kind: "none" }
  | { kind: "query"; query: string; nonce: string }
  | { kind: "latlng"; lat: number; lng: number; nonce: string };

type LatLng = { lat: number; lng: number };

function decodePolyline(encoded: string): google.maps.LatLngLiteral[] {
  const points: google.maps.LatLngLiteral[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b = 0;
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

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return points;
}

function isFiniteLatLng(lat?: number, lng?: number) {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}

function samePoint(a: LatLng, b: LatLng) {
  return Math.abs(a.lat - b.lat) < 1e-9 && Math.abs(a.lng - b.lng) < 1e-9;
}

/**
 * 連続重複を除去（A,A,B,B,C → A,B,C）
 */
function dedupeConsecutive(points: LatLng[]): LatLng[] {
  const out: LatLng[] = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (!last || !samePoint(last, p)) out.push(p);
  }
  return out;
}

/**
 * intermediates を上限つきに間引く（Routes API の変ルート/失敗率を下げる）
 * - origin と destination は必ず残す
 */
function downsampleWaypoints(points: LatLng[], maxTotal: number): LatLng[] {
  if (points.length <= maxTotal) return points;
  if (maxTotal < 2) return points.slice(0, 2);

  const origin = points[0];
  const dest = points[points.length - 1];

  const keep = maxTotal - 2; // 中間点として残せる数
  if (keep <= 0) return [origin, dest];

  const intermediates = points.slice(1, -1);

  // 等間隔サンプリング
  const outInter: LatLng[] = [];
  for (let i = 0; i < keep; i++) {
    const idx = Math.round((i * (intermediates.length - 1)) / Math.max(1, keep - 1));
    outInter.push(intermediates[idx]);
  }

  return [origin, ...outInter, dest];
}

export default function GoogleMapCanvas({
  selectedItemId,
  onPickPlace,
  focus,
  items,
}: {
  selectedItemId: string | null;
  onPickPlace: (itemId: string | null, p: PickedPlace) => void;
  focus: MapFocus;
  items: ItineraryItem[];
}) {
  const divRef = useRef<HTMLDivElement | null>(null);

  const mapRef = useRef<google.maps.Map | null>(null);
  const placesRef = useRef<google.maps.places.PlacesService | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

  const polylinesRef = useRef<Map<number, google.maps.Polyline>>(new Map());
  const abortRef = useRef<Map<number, AbortController>>(new Map());
  const lastKeyRef = useRef<Map<number, string>>(new Map());

  // debounce timers per day
  const debounceRef = useRef<Map<number, any>>(new Map());

  // props -> ref
  const selectedIdRef = useRef<string | null>(selectedItemId);
  const onPickPlaceRef = useRef(onPickPlace);

  useEffect(() => {
    selectedIdRef.current = selectedItemId;
  }, [selectedItemId]);

  useEffect(() => {
    onPickPlaceRef.current = onPickPlace;
  }, [onPickPlace]);

  // ① map init + POI click
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

        map.addListener("click", (e: any) => {
          const places = placesRef.current;
          if (!places) return;

          const placeId = e?.placeId as string | undefined;
          if (!placeId) return;

          places.getDetails(
            { placeId, fields: ["place_id", "name", "url", "geometry"] },
            (p, status) => {
              if (!p || status !== "OK") return;

              const loc = p.geometry?.location;
              const lat = loc?.lat?.();
              const lng = loc?.lng?.();

              onPickPlaceRef.current(selectedIdRef.current, {
                placeId: p.place_id ?? placeId,
                name: p.name ?? "",
                mapUrl: p.url ?? undefined,
                lat: typeof lat === "number" ? lat : undefined,
                lng: typeof lng === "number" ? lng : undefined,
              });

              if (mapRef.current && typeof lat === "number" && typeof lng === "number") {
                if (markerRef.current) markerRef.current.setMap(null);
                markerRef.current = new google.maps.Marker({
                  map: mapRef.current,
                  position: { lat, lng },
                  title: p.name ?? "",
                });
              }
            }
          );
        });
      })
      .catch((err) => {
        console.error("Google Maps load error:", err);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // ② focus: query / latlng
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (focus.kind === "none") return;

    if (focus.kind === "latlng") {
      const { lat, lng } = focus;
      if (!isFiniteLatLng(lat, lng)) return;

      map.panTo({ lat, lng });
      map.setZoom(15);

      if (markerRef.current) markerRef.current.setMap(null);
      markerRef.current = new google.maps.Marker({
        map,
        position: { lat, lng },
        title: "Selected",
      });
      return;
    }

    const places = placesRef.current;
    if (!places) return;

    const q = String(focus.query ?? "").trim();
    if (!q) return;

    places.textSearch({ query: q }, (results, status) => {
      if (!results || status !== "OK" || !results[0]) return;

      const r0 = results[0];
      const loc = r0.geometry?.location;
      if (!loc) return;

      const lat = loc.lat();
      const lng = loc.lng();

      map.panTo(loc);
      map.setZoom(15);

      if (markerRef.current) markerRef.current.setMap(null);
      markerRef.current = new google.maps.Marker({
        map,
        position: loc,
        title: r0.name ?? q,
      });

      const placeId = r0.place_id ?? undefined;
      const mapUrl = placeId
        ? `https://www.google.com/maps/place/?q=place_id:${placeId}`
        : undefined;

      onPickPlaceRef.current(selectedIdRef.current, {
        placeId,
        name: r0.name ?? q,
        mapUrl,
        lat,
        lng,
      });
    });
  }, [focus]);

  // ③ route plans (dayごと)
  const routePlans = useMemo(() => {
    const byDay = new Map<number, LatLng[]>();
    for (const day of [1, 2, 3, 4, 5]) byDay.set(day, []);

    for (const it of items) {
      if (it.type !== "spot") continue;
      if (!isFiniteLatLng(it.lat, it.lng)) continue;
      byDay.get(it.day)?.push({ lat: it.lat!, lng: it.lng! });
    }

    const plans: { day: number; waypoints: LatLng[]; key: string }[] = [];
    let lastKnown: LatLng | null = null;

    for (const day of [1, 2, 3, 4, 5]) {
      const pts = byDay.get(day) ?? [];

      // prev-day 終点 → 当日先頭へ接続
      let waypoints: LatLng[] = pts;
      if (pts.length >= 1 && lastKnown) {
        const first = pts[0];
        waypoints = samePoint(first, lastKnown) ? pts : [lastKnown, ...pts];
      }

      // 連続重複除去
      waypoints = dedupeConsecutive(waypoints);

      // たくさんある時は間引く（徒歩ルートの変さ/失敗率軽減）
      // maxTotal は好みで調整（例：12〜20くらい）
      waypoints = downsampleWaypoints(waypoints, 14);

      if (pts.length >= 1) lastKnown = pts[pts.length - 1];

      const key = waypoints.map((p) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`).join("|");
      plans.push({ day, waypoints, key });
    }

    return plans;
  }, [items]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    for (const { day, waypoints, key } of routePlans) {
      const prevKey = lastKeyRef.current.get(day);
      if (prevKey === key) continue;
      lastKeyRef.current.set(day, key);

      // waypoints が2未満なら線を消して終了（fetchしない）
      if (waypoints.length < 2) {
        abortRef.current.get(day)?.abort();
        const pl = polylinesRef.current.get(day);
        if (pl) {
          pl.setMap(null);
          polylinesRef.current.delete(day);
        }
        continue;
      }

      // debounce（連続更新のまとめ）
      const oldTimer = debounceRef.current.get(day);
      if (oldTimer) clearTimeout(oldTimer);

      const timer = setTimeout(() => {
        // cancel previous fetch for this day
        abortRef.current.get(day)?.abort();
        const controller = new AbortController();
        abortRef.current.set(day, controller);

        fetch("/api/walkroute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ waypoints }),
          signal: controller.signal,
        })
          .then(async (res) => {
            const data = await res.json().catch(() => ({} as any));
            if (!res.ok) {
              throw new Error(data?.error ?? `walkroute HTTP ${res.status}`);
            }
            return data as any;
          })
          .then((data) => {
            if (controller.signal.aborted) return;

            const poly = String(data?.polyline ?? "");
            if (!data?.ok || !poly) {
              // polyline が空なら消す（ここは好み）
              const pl = polylinesRef.current.get(day);
              if (pl) {
                pl.setMap(null);
                polylinesRef.current.delete(day);
              }
              return;
            }

            const path = decodePolyline(poly);
            const color = dayColor(day);

            let pl = polylinesRef.current.get(day);
            if (!pl) {
              pl = new google.maps.Polyline({
                map,
                path,
                strokeColor: color,
                strokeOpacity: 0.95,
                strokeWeight: 5,
                geodesic: true,
                zIndex: 100 + day,
              });
              polylinesRef.current.set(day, pl);
            } else {
              pl.setOptions({ strokeColor: color, zIndex: 100 + day });
              pl.setPath(path);
              pl.setMap(map);
            }
          })
          .catch((err) => {
            if (err?.name === "AbortError") return;
            console.error("[walkroute] failed day", day, err);
          });
      }, 300);

      debounceRef.current.set(day, timer);
    }

    return () => {
      // cleanup timers on unmount
      for (const t of debounceRef.current.values()) clearTimeout(t);
      debounceRef.current.clear();
      // abort in-flight
      for (const c of abortRef.current.values()) c.abort();
      abortRef.current.clear();
    };
  }, [routePlans]);

  return <div ref={divRef} className="absolute inset-0" />;
}
