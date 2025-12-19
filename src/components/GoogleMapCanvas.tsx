// src/components/GoogleMapCanvas.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

export type AreaFocus =
  | { kind: "none" }
  | { kind: "circle"; lat: number; lng: number; radiusMeters: number; nonce: string };

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

    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
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

export default function GoogleMapCanvas({
  selectedItemId,
  onPickPlace,
  onMapTap,
  focus,
  area,
  items,
}: {
  selectedItemId: string | null;
  onPickPlace: (itemId: string | null, p: PickedPlace) => void;
  onMapTap?: () => void;
  focus: MapFocus;
  area: AreaFocus;
  items: ItineraryItem[];
}) {
  const divRef = useRef<HTMLDivElement | null>(null);

  const mapRef = useRef<google.maps.Map | null>(null);
  const placesRef = useRef<google.maps.places.PlacesService | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

  // day別ルート描画
  const polylinesRef = useRef<Map<number, google.maps.Polyline>>(new Map());
  const abortRef = useRef<Map<number, AbortController>>(new Map());
  const lastKeyRef = useRef<Map<number, string>>(new Map());

  // カテゴリ面ハイライト
  const areaCircleRef = useRef<google.maps.Circle | null>(null);

  // map ready tick（mapRef は state じゃないので、effect 再実行用）
  const [readyTick, setReadyTick] = useState(0);

  // loop防止：props -> ref
  const selectedIdRef = useRef<string | null>(selectedItemId);
  const onPickPlaceRef = useRef(onPickPlace);
  const onMapTapRef = useRef(onMapTap);

  useEffect(() => {
    selectedIdRef.current = selectedItemId;
  }, [selectedItemId]);

  useEffect(() => {
    onPickPlaceRef.current = onPickPlace;
  }, [onPickPlace]);

  useEffect(() => {
    onMapTapRef.current = onMapTap;
  }, [onMapTap]);

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

        setReadyTick((n) => n + 1);

        map.addListener("click", (e: any) => {
          // ★v3: マップをタップしたらメニューを格納（旅程は格納しない）
          onMapTapRef.current?.();

          const places = placesRef.current;
          if (!places) return;

          const placeId = e?.placeId as string | undefined;
          if (!placeId) return;

          places.getDetails({ placeId, fields: ["place_id", "name", "url", "geometry"] }, (p, status) => {
            if (!p || status !== "OK") return;

            const loc = p.geometry?.location;
            const lat = loc?.lat?.();
            const lng = loc?.lng?.();

            onPickPlaceRef.current(selectedIdRef.current, {
              placeId: p.place_id ?? placeId,
              name: p.name ?? "",
              mapUrl: p.url ?? "",
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
          });
        });
      })
      .catch((err) => {
        console.error("Google Maps load error:", err);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // ② カテゴリ押下：面ハイライト
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (area.kind === "none") {
      if (areaCircleRef.current) {
        areaCircleRef.current.setMap(null);
        areaCircleRef.current = null;
      }
      return;
    }

    if (!isFiniteLatLng(area.lat, area.lng)) return;

    if (areaCircleRef.current) {
      areaCircleRef.current.setMap(null);
      areaCircleRef.current = null;
    }

    const circle = new google.maps.Circle({
      map,
      center: { lat: area.lat, lng: area.lng },
      radius: Math.max(200, area.radiusMeters || 4000),
      strokeOpacity: 0.9,
      strokeWeight: 2,
      fillOpacity: 0.12,
      clickable: false,
      zIndex: 50,
    });

    areaCircleRef.current = circle;

    const bounds = circle.getBounds();
    if (bounds) {
      map.fitBounds(bounds, 24);
    } else {
      map.panTo({ lat: area.lat, lng: area.lng });
      map.setZoom(12);
    }
  }, [area, readyTick]);

  // ③ focus: query / latlng
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
      const mapUrl = placeId ? `https://www.google.com/maps/place/?q=place_id:${placeId}` : "";

      onPickPlaceRef.current(selectedIdRef.current, {
        placeId,
        name: r0.name ?? q,
        mapUrl,
        lat,
        lng,
      });
    });
  }, [focus]);

  // ④ routes: day順に描画（day数は可変）
  const routePlans = useMemo(() => {
    const days = Array.from(new Set(items.map((x) => Number(x.day)))).filter((n) => Number.isFinite(n) && n > 0);
    days.sort((a, b) => a - b);

    const byDay = new Map<number, { lat: number; lng: number }[]>();
    for (const d of days) byDay.set(d, []);

    // items配列順を保持
    for (const it of items) {
      if (it.type !== "spot") continue;
      if (!isFiniteLatLng(it.lat, it.lng)) continue;
      const d = Number(it.day);
      if (!byDay.has(d)) byDay.set(d, []);
      byDay.get(d)!.push({ lat: it.lat!, lng: it.lng! });
    }

    const plans: { day: number; waypoints: { lat: number; lng: number }[]; key: string }[] = [];
    let lastKnown: { lat: number; lng: number } | null = null;

    for (const day of days) {
      const pts = byDay.get(day) ?? [];
      let waypoints: { lat: number; lng: number }[] = pts;

      if (pts.length >= 1 && lastKnown) {
        const first = pts[0];
        const same =
          Math.abs(first.lat - lastKnown.lat) < 1e-9 && Math.abs(first.lng - lastKnown.lng) < 1e-9;
        waypoints = same ? pts : [lastKnown, ...pts];
      }

      if (pts.length >= 1) lastKnown = pts[pts.length - 1];

      const key = waypoints.map((p) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`).join("|");
      plans.push({ day, waypoints, key });
    }

    return plans;
  }, [items]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const activeDays = new Set(routePlans.map((p) => p.day));

    // 消えた day の polyline を掃除
    for (const [day, pl] of polylinesRef.current.entries()) {
      if (!activeDays.has(day)) {
        pl.setMap(null);
        polylinesRef.current.delete(day);
      }
    }

    // day ごとに更新
    for (const { day, waypoints, key } of routePlans) {
      const prevKey = lastKeyRef.current.get(day);
      if (prevKey === key) continue;
      lastKeyRef.current.set(day, key);

      abortRef.current.get(day)?.abort();
      const controller = new AbortController();
      abortRef.current.set(day, controller);

      if (waypoints.length < 2) {
        const pl = polylinesRef.current.get(day);
        if (pl) {
          pl.setMap(null);
          polylinesRef.current.delete(day);
        }
        continue;
      }

      fetch("/api/walkroute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ waypoints }),
        signal: controller.signal,
      })
        .then(async (res) => {
          const data = await res.json().catch(() => ({} as any));
          if (!res.ok) throw new Error(data?.error ?? `walkroute HTTP ${res.status}`);
          return data as any;
        })
        .then((data) => {
          if (controller.signal.aborted) return;

          const poly = String(data?.polyline ?? "");
          if (!data?.ok || !poly) {
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
    }
  }, [routePlans]);

  return <div ref={divRef} className="absolute inset-0" />;
}
