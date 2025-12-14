// src/lib/googleMapsLoader.ts
import { Loader } from "@googlemaps/js-api-loader";

let loadPromise: Promise<typeof google> | null = null;

export function loadGoogleMaps(): Promise<typeof google> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return Promise.reject(
      new Error("Missing env: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY")
    );
  }

  if (loadPromise) return loadPromise;

  const loader = new Loader({
    apiKey,
    version: "weekly",
    id: "__googleMapsScriptId",
    // ★ここをプロジェクト全体で固定（差分があるとLoaderが死ぬ）
    libraries: ["places"],
    language: "ja",
    region: "JP",
  });

  loadPromise = loader.load();
  return loadPromise;
}
