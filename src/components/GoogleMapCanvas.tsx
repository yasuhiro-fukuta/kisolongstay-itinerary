"use client";

import { useEffect, useRef } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import type { RowId } from "@/lib/itinerary";

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

export default function GoogleMapCanvas({
  selectedRowId,
  onPickPlace,
  focusName,
}: {
  selectedRowId: RowId | null;
  onPickPlace: (rowId: RowId | null, p: PickedPlace) => void;
  focusName?: string | null;
}) {
  const divRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const selectedRowRef = useRef<RowId | null>(selectedRowId);

  // 現在選択されている行を ref に保持
  useEffect(() => {
    selectedRowRef.current = selectedRowId;
  }, [selectedRowId]);

  // ① マップ初期化 ＋ マップ上のPOIクリック → 行に反映
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey || !divRef.current) return;

    const loader = new Loader({
      apiKey,
      version: "weekly",
      libraries: ["places"],
      language: "ja",
      region: "JP",
    });

    let clickListener: google.maps.MapsEventListener | null = null;

    loader.load().then(() => {
      if (!divRef.current) return;

      const center = { lat: 35.5739, lng: 137.6076 }; // 南木曽あたり
      const map = new google.maps.Map(divRef.current, {
        center,
        zoom: 12,
        clickableIcons: true,
        mapTypeControl: false,
        fullscreenControl: false,
        streetViewControl: false,
      });

      mapRef.current = map;

      clickListener = map.addListener("click", (e: google.maps.MapMouseEvent) => {
        const raw = e as any;
        const placeId = raw.placeId as string | undefined;

        const rowId = selectedRowRef.current;
        if (!rowId) return; // 行未選択
        if (!placeId) return; // 背景クリック

        const service = new google.maps.places.PlacesService(map);
        service.getDetails(
          {
            placeId,
            fields: ["place_id", "name", "website", "url"],
          },
          (place, status) => {
            if (status !== google.maps.places.PlacesServiceStatus.OK || !place) {
              console.error("Places API error:", status);
              onPickPlace(rowId, {
                placeId,
                name: "テストスポット",
              });
              return;
            }

            onPickPlace(rowId, {
              placeId: place.place_id ?? placeId,
              name: place.name ?? "名称未設定スポット",
              website: place.website ?? undefined,
              mapUrl: place.url ?? undefined,
            });
          }
        );
      });
    });

    return () => {
      if (clickListener) clickListener.remove();
    };
  }, [onPickPlace]);

  // ② focusName（検索バー or 左リスト） → その場所にフォーカスしてピンを出す
  useEffect(() => {
    if (!focusName || !mapRef.current) return;

    const map = mapRef.current;
    const service = new google.maps.places.PlacesService(map);

    const request: google.maps.places.FindPlaceFromQueryRequest = {
      query: focusName,
      fields: ["place_id", "name", "geometry"],
    };

    service.findPlaceFromQuery(request, (results, status) => {
      if (
        status !== google.maps.places.PlacesServiceStatus.OK ||
        !results ||
        !results[0]
      ) {
        console.error("findPlaceFromQuery error", status);
        return;
      }

      const place = results[0];
      if (!place.geometry || !place.geometry.location) return;

      map.panTo(place.geometry.location);
      map.setZoom(15);

      if (markerRef.current) {
        markerRef.current.setMap(null);
      }
      markerRef.current = new google.maps.Marker({
        map,
        position: place.geometry.location,
        title: place.name,
      });
    });
  }, [focusName]);

  const hasKey = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);

  return (
    <div className="relative h-full w-full">
      <div ref={divRef} className="absolute inset-0" />
      {!hasKey && (
        <div className="absolute inset-0 grid place-items-center bg-neutral-100">
          <div className="rounded-xl bg-white p-4 shadow">
            <div className="font-semibold">Google Maps APIキーが未設定です</div>
            <div className="text-sm text-neutral-600">
              .env.local に NEXT_PUBLIC_GOOGLE_MAPS_API_KEY を入れてください
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
