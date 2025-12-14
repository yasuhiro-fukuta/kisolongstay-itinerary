"use client";

import { useEffect, useRef } from "react";
import { loadGoogleMaps } from "@/lib/googleMapsLoader";

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

function extractQueryToken(raw?: string | null) {
  return String(raw ?? "").split("|||")[0].trim();
}

export default function GoogleMapCanvas({
  selectedItemId,
  onPickPlace,
  focusName,
}: {
  selectedItemId: string | null;
  onPickPlace: (itemId: string | null, p: PickedPlace) => void;
  focusName?: string | null;
}) {
  const divRef = useRef<HTMLDivElement | null>(null);

  const mapRef = useRef<google.maps.Map | null>(null);
  const placesRef = useRef<google.maps.places.PlacesService | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

  // ループ防止：props を ref に閉じ込める
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
        if (mapRef.current) return; // already init

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
                website: p.website ?? undefined,
                mapUrl: p.url ?? undefined,
              });
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

  // ② search → pan/marker + write to list
  useEffect(() => {
    const q = extractQueryToken(focusName);
    if (!q) return;

    const map = mapRef.current;
    const places = placesRef.current;
    if (!map || !places) return;

    places.textSearch({ query: q }, (results, status) => {
      if (!results || status !== "OK" || !results[0]) return;

      const r0 = results[0];
      const loc = r0.geometry?.location;
      if (!loc) return;

      map.panTo(loc);
      map.setZoom(15);

      if (markerRef.current) markerRef.current.setMap(null);
      markerRef.current = new google.maps.Marker({
        map,
        position: loc,
        title: r0.name ?? q,
      });

      onPickPlaceRef.current(selectedIdRef.current, {
        placeId: r0.place_id ?? undefined,
        name: r0.name ?? q,
        mapUrl: (r0 as any).url ?? undefined,
      });
    });
  }, [focusName]);

  return <div ref={divRef} className="absolute inset-0" />;
}
