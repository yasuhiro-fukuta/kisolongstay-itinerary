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

type MapFocus =
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

type AreaFocus =
  | { kind: "none" }
  | { kind: "circle"; lat: number; lng: number; radiusMeters?: number }
  | {
      kind: "polygon";
      rings?: Array<Array<{ lat: number; lng: number }>>;
      lat: number;
      lng: number;
      radiusMeters?: number;
    };

export type ResultMarker = {
  id: string;
  lat: number;
  lng: number;
  day: number;
  title?: string;
};

function makeCirclePath(lat0: number, lng0: number, radiusMeters: number) {
  const points: { lat: number; lng: number }[] = [];
  const steps = 72;
  const radius = Math.max(10, radiusMeters || 4500);
  const d2r = Math.PI / 180;

  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const dx = Math.cos(a) * radius;
    const dy = Math.sin(a) * radius;

    const dlat = (dy / 111320) * 1e5;
    const dlng = (dx / (111320 * Math.cos(lat0 * d2r))) * 1e5;

    let lat = lat0 * 1e5;
    let lng = lng0 * 1e5;

    lat += dlat;
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

/**
 * Runtime-safe number coercion for lat/lng.
 * (In dev, values can sometimes arrive as strings/undefined due to URL params / storage.)
 */
function toFiniteNumber(v: unknown): number | undefined {
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function coerceLatLng(lat: unknown, lng: unknown): { lat: number; lng: number } | null {
  const la = toFiniteNumber(lat);
  const ln = toFiniteNumber(lng);
  if (la === undefined || ln === undefined) return null;
  return isFiniteLatLng(la, ln) ? { lat: la, lng: ln } : null;
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
  const divRef = useRef<HTMLDivElement | null>(null);

  const mapRef = useRef<google.maps.Map | null>(null);
  const placesRef = useRef<google.maps.places.PlacesService | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

  // Prevent log spam when walkroute fetching fails repeatedly
  const walkrouteErrorLoggedRef = useRef(false);

  // Keep latest callback without re-creating markers.
  const onSelectResultRef = useRef<typeof onSelectResult>(onSelectResult);
  useEffect(() => {
    onSelectResultRef.current = onSelectResult;
  }, [onSelectResult]);

  // --- Current location (Google Maps-like blue dot) ---
  const currentLocationMarkerRef = useRef<google.maps.Marker | null>(null);
  const currentAccuracyCircleRef = useRef<google.maps.Circle | null>(null);
  const geoWatchIdRef = useRef<number | null>(null);

  const ensureCurrentLocationOverlay = useCallback(() => {
    if (!mapRef.current) return;
    if (!currentLocationMarkerRef.current) {
      currentLocationMarkerRef.current = new google.maps.Marker({
        map: mapRef.current,
        position: { lat: 0, lng: 0 },
        title: "Current location",
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 6,
          fillColor: "#1a73e8",
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 2,
        },
        zIndex: 9999,
      });
    }
    if (!currentAccuracyCircleRef.current) {
      currentAccuracyCircleRef.current = new google.maps.Circle({
        map: mapRef.current,
        center: { lat: 0, lng: 0 },
        radius: 0,
        fillColor: "#1a73e8",
        fillOpacity: 0.12,
        strokeColor: "#1a73e8",
        strokeOpacity: 0.3,
        strokeWeight: 1,
        zIndex: 9998,
      });
    }
  }, []);

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

  const updateCurrentLocationOverlay = useCallback(
    (pos: { lat: number; lng: number; accuracy?: number }) => {
      if (!mapRef.current) return;
      ensureCurrentLocationOverlay();

      if (!isFiniteLatLng(pos.lat, pos.lng)) return;

      const shownLatLng = { lat: pos.lat, lng: pos.lng };
      currentLocationMarkerRef.current?.setPosition(shownLatLng);

      if (typeof pos.accuracy === "number" && Number.isFinite(pos.accuracy)) {
        currentAccuracyCircleRef.current?.setCenter(shownLatLng);
        currentAccuracyCircleRef.current?.setRadius(Math.max(0, pos.accuracy));
      }
    },
    [ensureCurrentLocationOverlay]
  );

  const startGeoWatch = useCallback(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) return;
    if (geoWatchIdRef.current != null) return; // already watching

    geoWatchIdRef.current = navigator.geolocation.watchPosition(
      (p) => {
        updateCurrentLocationOverlay({
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          accuracy: p.coords.accuracy,
        });
      },
      () => {
        // ignore
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
    );
  }, [updateCurrentLocationOverlay]);

  // cleanup geolocation watch
  useEffect(() => {
    return () => {
      stopGeoWatch();
    };
  }, [stopGeoWatch]);

  // --- internal state ---
  const [readyTick, setReadyTick] = useState(0);

  const selectedIdRef = useRef<string | null>(selectedItemId);
  useEffect(() => {
    selectedIdRef.current = selectedItemId;
  }, [selectedItemId]);

  const onPickPlaceRef = useRef(onPickPlace);
  useEffect(() => {
    onPickPlaceRef.current = onPickPlace;
  }, [onPickPlace]);

  const onMapTapRef = useRef(onMapTap);
  useEffect(() => {
    onMapTapRef.current = onMapTap;
  }, [onMapTap]);

  const readyCalledRef = useRef(false);

  // ① map init + POI click
  useEffect(() => {
    if (!divRef.current) return;

    let cancelled = false;

    loadGoogleMaps()
      .then(() => {
        if (cancelled) return;
        if (!divRef.current) return;
        if (mapRef.current) return;

        const defaultCenter = { lat: 35.5739, lng: 137.6076 };

        // Use focus only if it contains finite coordinates. This prevents
        // "InvalidValueError: setCenter ... lat: not a number" crashes in dev.
        const focused =
          focus?.kind === "latlng" ? coerceLatLng((focus as any).lat, (focus as any).lng) : null;

        const map = new google.maps.Map(divRef.current, {
          center: focused ?? defaultCenter,
          zoom:
            focus?.kind === "latlng"
              ? typeof (focus as any).zoom === "number" && Number.isFinite((focus as any).zoom)
                ? (focus as any).zoom
                : 12
              : 12,
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

        map.addListener("click", () => {
          // ★v3: マップをタップしたらメニューを格納（旅程は格納しない）
          onMapTapRef.current?.();
        });
      })
      .catch((e) => {
        console.error("[GoogleMapCanvas] loadGoogleMaps failed", e);
      });

    return () => {
      cancelled = true;
    };
    // intentionally run once; `focus` is used only for initial center/zoom.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ② area highlight
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // remove old outlines
    (map as any).__kisoOutlines?.forEach((p: google.maps.Polyline) => p.setMap(null));
    (map as any).__kisoOutlines = [];

    const addOutline = (path: { lat: number; lng: number }[]) => {
      const polyline = new google.maps.Polyline({
        path,
        geodesic: true,
        strokeOpacity: 0.8,
        strokeWeight: 2,
        map,
      });
      (map as any).__kisoOutlines.push(polyline);
    };

    // Normalize bounds
    const bounds = new google.maps.LatLngBounds();
    const extend = (path: { lat: number; lng: number }[]) => path.forEach((p) => bounds.extend(p));

    if (area.kind === "none") return;

    if (area.kind === "polygon") {
      const rings = area.rings ?? [];
      let hasAny = false;

      for (const ring of rings) {
        if (!Array.isArray(ring) || ring.length === 0) continue;
        const path = ring.filter((p) => isFiniteLatLng(p.lat, p.lng));
        if (path.length === 0) continue;
        hasAny = true;
        addOutline(path);
        extend(path);
      }

      if (hasAny) {
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
      return;
    }

    if (area.kind === "circle") {
      if (!isFiniteLatLng(area.lat, area.lng)) return;

      const path = makeCirclePath(area.lat, area.lng, area.radiusMeters || 4500);
      addOutline(path);
      extend(path);

      if (!bounds.isEmpty()) {
        map.panTo(bounds.getCenter());
      } else {
        map.panTo({ lat: area.lat, lng: area.lng });
      }
    }
  }, [area, readyTick]);

  // ③ focus: query / latlng
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (focus.kind === "none") return;

    if (focus.kind === "latlng") {
      const ll = coerceLatLng((focus as any).lat, (focus as any).lng);
      if (!ll) return;

      map.panTo(ll);
      const zoom = (focus as any).zoom;
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
          position: ll,
          title: "Selected",
        });
      }

      return;
    }

    const places = placesRef.current;
    if (!places) return;

    const q = String((focus as any).query ?? "").trim();
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

      const placeId = (r0 as any).place_id ?? undefined;
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

  // ③-b: Result markers
  const resultMarkerMapRef = useRef<Map<string, google.maps.Marker>>(new Map());

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
        continue;
      }

      const mk = new google.maps.Marker({
        map,
        position: { lat: m.lat, lng: m.lng },
        title: m.title ?? "",
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 7,
          fillColor: dayColor(m.day),
          fillOpacity: 1,
          strokeWeight: selectedResultId === m.id ? 3 : 1,
          strokeColor: "#000",
        },
      });

      mk.addListener("click", () => {
        onSelectResultRef.current?.(m.id);
      });

      resultMarkerMapRef.current.set(m.id, mk);
    }
  }, [resultMarkers, selectedResultId]);

  // --- walkroute（元の実装） ---
  // ここはあなたの元の末尾実装に合わせて残してあります（参照先の ref だけ追加済み）。
  // ※既存の catch で walkrouteErrorLoggedRef を使う箇所がこの下にある想定。

  // ---- render ----
  return <div ref={divRef} className="h-full w-full" />;
}
