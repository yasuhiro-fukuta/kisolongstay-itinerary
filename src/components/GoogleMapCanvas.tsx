// src/components/GoogleMapCanvas.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadGoogleMaps } from "@/lib/googleMapsLoader";
import type { ItineraryItem } from "@/lib/itinerary";
import { dayColor } from "@/lib/dayColors";

export type PickedPlace = {
  placeId?: string;
  name?: string;
  mapUrl?: string;
  website?: string;
  lat?: number;
  lng?: number;

  // ★UI用（地図由来のアイコン/カテゴリ）
  iconUrl?: string;
  types?: string[];
};

export type MapFocus =
  | { kind: "none" }
  | { kind: "query"; query: string; nonce: string; zoom?: number }
  | {
      kind: "latlng";
      lat: number;
      lng: number;
      nonce: string;
      zoom?: number;
      /**
       * If false, we only pan/zoom without placing a marker.
       * (Used by the desktop Google Maps-like UI when we want to show an area
       * without dropping a pin.)
       */
      marker?: boolean;
    };

export type ResultMarker = {
  id: string;
  lat: number;
  lng: number;
  title?: string;
};

export type AreaFocus =
  | { kind: "none" }
  | { kind: "circle"; lat: number; lng: number; radiusMeters: number; nonce: string }
  | { kind: "polygon"; paths: google.maps.LatLngLiteral[][]; nonce: string };

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
  resultMarkers,
  selectedResultId,
  onSelectResult,
  onMapReady,
}: {
  selectedItemId: string | null;
  onPickPlace: (itemId: string | null, p: PickedPlace) => void;
  onMapTap?: () => void;
  focus: MapFocus;
  area: AreaFocus;
  items: ItineraryItem[];
  /** Markers for search results (e.g., nearby restaurants). */
  resultMarkers?: ResultMarker[];
  /** Optional: highlight/bounce this marker id when it changes. */
  selectedResultId?: string | null;
  /** Optional: select a search result when its marker is clicked. */
  onSelectResult?: (placeId: string) => void;
  /** Optional callback when the underlying map + PlacesService is ready. */
  onMapReady?: (ctx: { map: google.maps.Map; places: google.maps.places.PlacesService }) => void;
}) {
  
  // Log walkroute fetch failures only once (avoid noisy console)
  const walkrouteErrorLoggedRef = useRef(false);
const divRef = useRef<HTMLDivElement | null>(null);

  const mapRef = useRef<google.maps.Map | null>(null);
  const placesRef = useRef<google.maps.places.PlacesService | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

  // Keep latest callback without re-creating markers.
  const onSelectResultRef = useRef<typeof onSelectResult>(onSelectResult);
  useEffect(() => {
    onSelectResultRef.current = onSelectResult;
  }, [onSelectResult]);

  // --- Current location (Google Maps-like blue dot) ---
  const currentLocationMarkerRef = useRef<google.maps.Marker | null>(null);
  const currentAccuracyCircleRef = useRef<google.maps.Circle | null>(null);
  const geoWatchIdRef = useRef<number | null>(null);

  const clearCurrentLocationOverlay = useCallback(() => {
    if (currentLocationMarkerRef.current) {
      currentLocationMarkerRef.current.setMap(null);
      currentLocationMarkerRef.current = null;
    }
    if (currentAccuracyCircleRef.current) {
      currentAccuracyCircleRef.current.setMap(null);
      currentAccuracyCircleRef.current = null;
    }
  }, []);

  const stopGeoWatch = useCallback(() => {
    if (geoWatchIdRef.current != null && typeof navigator !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.clearWatch(geoWatchIdRef.current);
    }
    geoWatchIdRef.current = null;
    clearCurrentLocationOverlay();
  }, [clearCurrentLocationOverlay]);

  const ensureCurrentLocationOverlay = useCallback((map: google.maps.Map) => {
    if (!currentAccuracyCircleRef.current) {
      currentAccuracyCircleRef.current = new google.maps.Circle({
        map,
        clickable: false,
        strokeColor: "#4285F4",
        strokeOpacity: 0.25,
        strokeWeight: 1,
        fillColor: "#4285F4",
        fillOpacity: 0.15,
        zIndex: 10,
      });
    }

    if (!currentLocationMarkerRef.current) {
      currentLocationMarkerRef.current = new google.maps.Marker({
        map,
        clickable: false,
        optimized: true,
        zIndex: 11,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: "#4285F4",
          fillOpacity: 1,
          strokeColor: "#FFFFFF",
          strokeOpacity: 1,
          strokeWeight: 2,
          scale: 6,
        },
      });
    }
  }, []);

  const updateCurrentLocationOverlay = useCallback(
    (pos: { lat: number; lng: number; accuracy?: number }) => {
      const map = mapRef.current;
      if (!map) return;

      ensureCurrentLocationOverlay(map);

      const shownLatLng = new google.maps.LatLng(pos.lat, pos.lng);
      currentLocationMarkerRef.current?.setPosition(shownLatLng);

      if (typeof pos.accuracy === "number" && Number.isFinite(pos.accuracy)) {
        currentAccuracyCircleRef.current?.setCenter(shownLatLng);
        currentAccuracyCircleRef.current?.setRadius(Math.max(0, pos.accuracy));
      }
    },
    [ensureCurrentLocationOverlay]
  );

  const startGeoWatch = useCallback(() => {
    if (geoWatchIdRef.current != null) return;
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) return;

    geoWatchIdRef.current = navigator.geolocation.watchPosition(
      (p) => {
        const lat = p.coords.latitude;
        const lng = p.coords.longitude;
        const accuracy = p.coords.accuracy;
        updateCurrentLocationOverlay({ lat, lng, accuracy });
      },
      (err) => {
        // Permission denied or unavailable — just don't show the dot.
        console.warn("[geo] watchPosition error", err);
        // If user denied, stop watching to avoid noisy retries.
        if (err && "code" in err && (err as GeolocationPositionError).code === 1) {
          stopGeoWatch();
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10_000,
        timeout: 20_000,
      }
    );
  }, [stopGeoWatch, updateCurrentLocationOverlay]);

  // Search-result markers (multiple)
  const resultMarkerMapRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const bounceTimerRef = useRef<number | null>(null);
  const readyCalledRef = useRef(false);

  // day別ルート描画
  const polylinesRef = useRef<Map<number, google.maps.Polyline>>(new Map());
  const abortRef = useRef<Map<number, AbortController>>(new Map());
  const lastKeyRef = useRef<Map<number, string>>(new Map());

  // カテゴリ面ハイライト（複数リング対応）
  const areaOutlinesRef = useRef<google.maps.Polyline[]>([]);

  const makeCirclePath = (lat: number, lng: number, radiusMeters: number, steps = 128): google.maps.LatLngLiteral[] => {
    // 近似：小さな円なら十分（本アプリはローカルエリア想定）
    const r = Math.max(200, radiusMeters || 4000);
    const latRad = (lat * Math.PI) / 180;
    const dLat = r / 111_320; // meters -> deg
    const dLng = r / (111_320 * Math.cos(latRad));

    const pts: google.maps.LatLngLiteral[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * Math.PI * 2;
      pts.push({ lat: lat + Math.sin(t) * dLat, lng: lng + Math.cos(t) * dLng });
    }
    return pts;
  };

  const boundsFromPath = (path: google.maps.LatLngLiteral[]): google.maps.LatLngBounds | null => {
    if (!path.length) return null;
    const b = new google.maps.LatLngBounds();
    for (const p of path) b.extend(p);
    return b;
  };

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

        // Expose map/places for parent-driven searching (desktop Google Maps-like UI)
        if (!readyCalledRef.current) {
          readyCalledRef.current = true;
          onMapReady?.({ map, places: placesRef.current });
        }

        setReadyTick((n) => n + 1);

        // Google Maps-like: show current location (blue dot) when permission is granted.
        startGeoWatch();

        map.addListener("click", (e: any) => {
          // ★v3: マップをタップしたらメニューを格納（旅程は格納しない）
          onMapTapRef.current?.();

          const places = placesRef.current;
          if (!places) return;

          const placeId = e?.placeId as string | undefined;
          if (!placeId) return;

          places.getDetails(
            { placeId, fields: ["place_id", "name", "url", "website", "geometry", "icon", "types"] },
            (p, status) => {
            if (!p || status !== "OK") return;

            const loc = p.geometry?.location;
            const lat = loc?.lat?.();
            const lng = loc?.lng?.();

            onPickPlaceRef.current(selectedIdRef.current, {
              placeId: p.place_id ?? placeId,
              name: p.name ?? "",
              mapUrl: p.url ?? "",
              website: (p as any).website ?? "",
              iconUrl: String((p as any).icon ?? ""),
              types: Array.isArray((p as any).types) ? ((p as any).types as any[]).map(String) : undefined,
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
      stopGeoWatch();
    };
  }, [startGeoWatch, stopGeoWatch]);

  // ② カテゴリ押下：面ハイライト
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // 既存のアウトラインをクリア
    for (const pl of areaOutlinesRef.current) pl.setMap(null);
    areaOutlinesRef.current = [];

    if (area.kind === "none") return;

    // ★仕様：カテゴリ選択時は「赤点線で囲む」表示（GoogleMapの赤点線に寄せる）
    const dotSymbol: google.maps.Symbol = {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 2.2,
      fillOpacity: 1,
      fillColor: "#ef4444", // tailwind red-500
      strokeOpacity: 1,
      strokeColor: "#ef4444",
      strokeWeight: 1,
    };

    const addOutline = (path: google.maps.LatLngLiteral[]) => {
      const outline = new google.maps.Polyline({
        map,
        path,
        strokeOpacity: 0,
        clickable: false,
        zIndex: 200,
        icons: [
          {
            icon: dotSymbol,
            offset: "0",
            repeat: "12px",
          },
        ],
      });
      areaOutlinesRef.current.push(outline);
    };

    const bounds = new google.maps.LatLngBounds();
    const extend = (path: google.maps.LatLngLiteral[]) => {
      for (const p of path) bounds.extend(p);
    };

    if (area.kind === "polygon") {
      const rings = Array.isArray(area.paths) ? area.paths : [];
      for (const ring of rings) {
        if (!Array.isArray(ring) || ring.length < 3) continue;
        addOutline(ring);
        extend(ring);
      }

      if (!bounds.isEmpty()) {
        // Pan only (do not change zoom). This matches the desired behaviour on category selection.
        map.panTo(bounds.getCenter());
      }
      return;
    }

    // polygon が取れない場合は円でフォールバック
    if (!isFiniteLatLng(area.lat, area.lng)) return;
    const path = makeCirclePath(area.lat, area.lng, area.radiusMeters || 4500);
    addOutline(path);
    extend(path);

    if (!bounds.isEmpty()) {
      map.panTo(bounds.getCenter());
    } else {
      map.panTo({ lat: area.lat, lng: area.lng });
    }
  }, [area, readyTick]);

  // ③ focus: query / latlng
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (focus.kind === "none") return;

    if (focus.kind === "latlng") {
      const { lat, lng, zoom } = focus;
      if (!isFiniteLatLng(lat, lng)) return;

      map.panTo({ lat, lng });
      if (typeof zoom === "number" && Number.isFinite(zoom)) {
        map.setZoom(zoom);
      }

      // Optionally suppress marker (used for "Activity" mode)
      if (focus.marker === false) {
        if (markerRef.current) {
          markerRef.current.setMap(null);
          markerRef.current = null;
        }
      } else {
        if (markerRef.current) markerRef.current.setMap(null);
        markerRef.current = new google.maps.Marker({
          map,
          position: { lat, lng },
          title: "Selected",
        });
      }

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
      const z = typeof (focus as any)?.zoom === "number" ? (focus as any).zoom : 15;
      map.setZoom(z);

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
        iconUrl: String((r0 as any)?.icon ?? ""),
        types: Array.isArray((r0 as any)?.types) ? ((r0 as any).types as any[]).map(String) : undefined,
        lat,
        lng,
      });
    });
  }, [focus]);

  // ③-b: Result markers (nearby search etc.)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const next = Array.isArray(resultMarkers) ? resultMarkers : [];
    const nextIds = new Set(next.map((m) => m.id));

    // Remove markers no longer present
    for (const [id, mk] of resultMarkerMapRef.current.entries()) {
      if (!nextIds.has(id)) {
        mk.setMap(null);
        resultMarkerMapRef.current.delete(id);
      }
    }

    // Add/update
    for (const m of next) {
      if (!isFiniteLatLng(m.lat, m.lng)) continue;
      const existing = resultMarkerMapRef.current.get(m.id);
      if (existing) {
        existing.setPosition({ lat: m.lat, lng: m.lng });
        existing.setTitle(m.title ?? "");
        existing.setMap(map);
        continue;
      }
      const mk = new google.maps.Marker({
        map,
        position: { lat: m.lat, lng: m.lng },
        title: m.title ?? "",
        clickable: true,
        zIndex: 120,
      });

      // Clicking a search-result pin should select it (like Google Maps).
      mk.addListener("click", () => {
        onSelectResultRef.current?.(m.id);
      });
      resultMarkerMapRef.current.set(m.id, mk);
    }

    // Cleanup on unmount
    return () => {
      // no-op here (we clean via diffing). Intentionally not clearing all,
      // because the effect re-runs frequently and clearing causes flicker.
    };
  }, [resultMarkers, readyTick]);

  // ③-c: Highlight selected result marker (bounce briefly)
  useEffect(() => {
    if (!selectedResultId) return;
    const mk = resultMarkerMapRef.current.get(selectedResultId);
    if (!mk) return;

    // Stop any previous bounce timer
    if (bounceTimerRef.current != null) {
      window.clearTimeout(bounceTimerRef.current);
      bounceTimerRef.current = null;
    }

    try {
      mk.setAnimation(google.maps.Animation.BOUNCE);
      bounceTimerRef.current = window.setTimeout(() => {
        mk.setAnimation(null);
        bounceTimerRef.current = null;
      }, 700);
    } catch {
      // ignore (Animation may be unavailable in rare cases)
    }

    return () => {
      if (bounceTimerRef.current != null) {
        window.clearTimeout(bounceTimerRef.current);
        bounceTimerRef.current = null;
      }
      try {
        mk.setAnimation(null);
      } catch {
        // ignore
      }
    };
  }, [selectedResultId]);

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
          if (!walkrouteErrorLoggedRef.current) {
            walkrouteErrorLoggedRef.current = true;
            console.error("[walkroute] failed day", day, err);
          }

        });
    }
  }, [routePlans]);

  return <div ref={divRef} className="absolute inset-0" />;
}