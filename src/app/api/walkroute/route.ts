// src/app/api/walkroute/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LatLng = { lat: number; lng: number };

function isLatLng(v: any): v is LatLng {
  return (
    v &&
    typeof v.lat === "number" &&
    typeof v.lng === "number" &&
    Number.isFinite(v.lat) &&
    Number.isFinite(v.lng)
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const stops = Array.isArray(body?.stops) ? body.stops : null;

    if (!stops || stops.length < 2) {
      return NextResponse.json(
        { ok: false, error: "Invalid request: stops must be array (len>=2)" },
        { status: 400 }
      );
    }

    const points: LatLng[] = stops.filter(isLatLng);
    if (points.length < 2) {
      return NextResponse.json(
        { ok: false, error: "Invalid request: stops elements must be {lat,lng}" },
        { status: 400 }
      );
    }

    const key = process.env.GOOGLE_MAPS_SERVER_API_KEY;
    if (!key) {
      return NextResponse.json(
        { ok: false, error: "Missing env: GOOGLE_MAPS_SERVER_API_KEY" },
        { status: 500 }
      );
    }

    const origin = points[0];
    const destination = points[points.length - 1];
    const intermediates = points.slice(1, -1);

    const payload = {
      origin: {
        location: {
          latLng: { latitude: origin.lat, longitude: origin.lng },
        },
      },
      destination: {
        location: {
          latLng: { latitude: destination.lat, longitude: destination.lng },
        },
      },
      intermediates: intermediates.map((p) => ({
        location: { latLng: { latitude: p.lat, longitude: p.lng } },
      })),
      travelMode: "WALK",
      polylineQuality: "HIGH_QUALITY",
      polylineEncoding: "ENCODED_POLYLINE",
    };

    const r = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": key,
        // polylineだけ取る（軽量化）
        "x-goog-fieldmask": "routes.polyline.encodedPolyline",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const json = await r.json().catch(() => ({} as any));

    if (!r.ok) {
      return NextResponse.json(
        {
          ok: false,
          error:
            `Routes API error: HTTP ${r.status}` +
            (json?.error?.message ? `: ${json.error.message}` : ""),
          raw: json,
        },
        { status: 400 }
      );
    }

    const encoded = json?.routes?.[0]?.polyline?.encodedPolyline;
    if (!encoded) {
      return NextResponse.json(
        { ok: false, error: "Routes API returned no polyline", raw: json },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, encodedPolyline: encoded });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e ?? "unknown error") },
      { status: 500 }
    );
  }
}
