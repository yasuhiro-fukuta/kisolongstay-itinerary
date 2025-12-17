// src/app/api/walkroute/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LatLng = { lat: number; lng: number };

function toLatLng(v: any): LatLng | null {
  const lat = Number(v?.lat);
  const lng = Number(v?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

export async function POST(req: Request) {
  try {
    const key = process.env.GOOGLE_MAPS_SERVER_API_KEY;
    if (!key) {
      return NextResponse.json(
        { ok: false, error: "Missing env: GOOGLE_MAPS_SERVER_API_KEY" },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({} as any));
    const waypointsRaw = body?.waypoints;

    if (!Array.isArray(waypointsRaw)) {
      return NextResponse.json(
        { ok: false, error: "Invalid request: waypoints must be an array" },
        { status: 400 }
      );
    }

    const waypoints = waypointsRaw.map(toLatLng).filter(Boolean) as LatLng[];

    // Need at least origin + destination
    if (waypoints.length < 2) {
      return NextResponse.json({ ok: true, polyline: "" });
    }

    const origin = waypoints[0];
    const destination = waypoints[waypoints.length - 1];
    const intermediates = waypoints.slice(1, -1);

    const payload = {
      origin: {
        location: { latLng: { latitude: origin.lat, longitude: origin.lng } },
      },
      destination: {
        location: { latLng: { latitude: destination.lat, longitude: destination.lng } },
      },
      intermediates: intermediates.map((p) => ({
        location: { latLng: { latitude: p.lat, longitude: p.lng } },
      })),
      travelMode: "WALK",
      computeAlternativeRoutes: false,
      polylineQuality: "OVERVIEW",
      polylineEncoding: "ENCODED_POLYLINE",
    };

    const r = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "routes.polyline.encodedPolyline",
      },
      body: JSON.stringify(payload),
    });

    const data = await r.json().catch(() => ({} as any));

    if (!r.ok) {
      const msg =
        data?.error?.message ||
        data?.message ||
        `Routes API error: HTTP ${r.status}`;
      return NextResponse.json({ ok: false, error: msg, raw: data }, { status: 400 });
    }

    const polyline = data?.routes?.[0]?.polyline?.encodedPolyline ?? "";
    return NextResponse.json({ ok: true, polyline });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e ?? "unknown error") },
      { status: 500 }
    );
  }
}
