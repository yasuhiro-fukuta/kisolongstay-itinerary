// src/app/api/resolve-map/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseLatLngFromGoogleMapsUrl(url: string): { lat: number; lng: number } | null {
  const s = String(url ?? "");

  // Pattern A: .../@lat,lng,zoom...
  {
    const m = s.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),/);
    if (m) {
      const lat = Number(m[1]);
      const lng = Number(m[2]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    }
  }

  // Pattern B: ...!3dlat!4dlng...
  {
    const m = s.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
    if (m) {
      const lat = Number(m[1]);
      const lng = Number(m[2]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    }
  }

  // Pattern C: query=lat,lng (Maps URLs sometimes)
  try {
    const u = new URL(s);
    const q = u.searchParams.get("query") || u.searchParams.get("q") || "";
    const m = q.match(/(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
    if (m) {
      const lat = Number(m[1]);
      const lng = Number(m[2]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    }
  } catch {
    // ignore
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const url = body?.url;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { ok: false, error: "Invalid request: url is required" },
        { status: 400 }
      );
    }

    // Follow redirects (maps.app.goo.gl -> www.google.com/maps/...)
    const res = await fetch(url, { redirect: "follow" });
    const finalUrl = res.url || url;

    const latlng = parseLatLngFromGoogleMapsUrl(finalUrl);
    if (!latlng) {
      return NextResponse.json({
        ok: false,
        error: "Could not parse lat/lng from resolved Google Maps URL",
        finalUrl,
      });
    }

    return NextResponse.json({
      ok: true,
      lat: latlng.lat,
      lng: latlng.lng,
      finalUrl,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e ?? "unknown error") },
      { status: 500 }
    );
  }
}
