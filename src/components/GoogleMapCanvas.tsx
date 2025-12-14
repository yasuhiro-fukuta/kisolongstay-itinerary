"use client";

import { useEffect, useRef } from "react";
<<<<<<< HEAD
import { Loader } from "@googlemaps/js-api-loader";
=======
import { loadGoogleMaps } from "@/lib/googleMapsLoader";
>>>>>>> df076ec (stabilized version secrets removed)

export type PickedPlace = {
  placeId?: string;
  name?: string;
  website?: string;
  mapUrl?: string;
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

<<<<<<< HEAD
  // 現在選択されている itemId を ref に保持
  const selectedIdRef = useRef<string | null>(selectedItemId);
=======
  const selectedIdRef = useRef<string | null>(selectedItemId);
  const onPickPlaceRef = useRef(onPickPlace);

>>>>>>> df076ec (stabilized version secrets removed)
  useEffect(() => {
    selectedIdRef.current = selectedItemId;
  }, [selectedItemId]);

  useEffect(() => {
    onPickPlaceRef.current = onPickPlace;
  }, [onPickPlace]);

  // 初期化
  useEffect(() => {
    if (!divRef.current) return;

    loadGoogleMaps().then(() => {
      if (mapRef.current) return;

      const map = new google.maps.Map(divRef.current!, {
        center: { lat: 35.5739, lng: 137.6076 },
        zoom: 12,
        mapTypeId: "hybrid",
        clickableIcons: true,
        mapTypeControl: false,
        fullscreenControl: false,
        streetViewControl: false,

        // 航空写真 + ラベル
        mapTypeId: google.maps.MapTypeId.HYBRID,
      });

      mapRef.current = map;
      placesRef.current = new google.maps.places.PlacesService(map);

      // ★ POIクリック（InfoWindowは殺さない）
      map.addListener("click", (e: any) => {
        if (!e.placeId || !placesRef.current) return;

<<<<<<< HEAD
        const itemId = selectedIdRef.current;
        if (!itemId) return; // 行未選択
        if (!placeId) return; // 背景クリック

        const service = new google.maps.places.PlacesService(map);
        service.getDetails(
=======
        placesRef.current.getDetails(
>>>>>>> df076ec (stabilized version secrets removed)
          {
            placeId: e.placeId,
            fields: ["place_id", "name", "website", "url"],
          },
<<<<<<< HEAD
          (place, status) => {
            if (status !== google.maps.places.PlacesServiceStatus.OK || !place) {
              console.error("Places API error:", status);
              onPickPlace(itemId, {
                placeId,
                name: "名称未取得スポット",
              });
              return;
            }

            onPickPlace(itemId, {
              placeId: place.place_id ?? placeId,
              name: place.name ?? "名称未設定スポット",
              website: place.website ?? undefined,
              mapUrl: place.url ?? undefined,
=======
          (p, status) => {
            if (!p || status !== "OK") return;

            onPickPlaceRef.current(selectedIdRef.current, {
              placeId: p.place_id ?? undefined,
              name: p.name ?? "",
              website: p.website ?? undefined,
              mapUrl: p.url ?? undefined,
>>>>>>> df076ec (stabilized version secrets removed)
            });
          }
        );
      });
    });
  }, []);

  // 検索
  useEffect(() => {
    const q = extractQueryToken(focusName);
    if (!q || !placesRef.current || !mapRef.current) return;

    placesRef.current.textSearch({ query: q }, (results, status) => {
      if (!results || status !== "OK") return;
      const r = results[0];
      if (!r.geometry?.location) return;

      mapRef.current!.panTo(r.geometry.location);
      mapRef.current!.setZoom(15);

      if (markerRef.current) markerRef.current.setMap(null);
      markerRef.current = new google.maps.Marker({
        map: mapRef.current!,
        position: r.geometry.location,
      });

      onPickPlaceRef.current(selectedIdRef.current, {
        placeId: r.place_id ?? undefined,
        name: r.name ?? q,
        mapUrl: (r as any).url ?? undefined,
      });
    });
  }, [focusName]);

  return <div ref={divRef} className="absolute inset-0" />;
}
