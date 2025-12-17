// src/app/api/resolve-map/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseLatLngFromUrl(rawUrl: string): { lat: number; lng: number } | null {
  const s = decodeURIComponent(String(rawUrl ?? ""));

  // 1) .../@35.123,137.456,...
  {
    const m = s.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
    if (m) {
      const lat = Number(m[1]);
      const lng = Number(m[2]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    }
  }

  // 2) query params: q=loc:lat,lng / q=lat,lng / query=lat,lng / ll=lat,lng
  try {
    const u = new URL(rawUrl);
    const q =
      u.searchParams.get("q") ??
      u.searchParams.get("query") ??
      u.searchParams.get("ll") ??
      "";

    const cleaned = q.replace(/^loc:/, "");
    const m = cleaned.match(/(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
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

function parsePlaceIdFromUrl(rawUrl: string): string | null {
  const s = decodeURIComponent(String(rawUrl ?? ""));

  // e.g. ...place_id:ChIJ...
  const m1 = s.match(/place_id:([A-Za-z0-9_-]+)/);
  if (m1?.[1]) return m1[1];

  try {
    const u = new URL(rawUrl);
    const p =
      u.searchParams.get("place_id") ??
      u.searchParams.get("query_place_id") ??
      null;
    if (p) return p;
  } catch {
    // ignore
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const url = String(body?.url ?? "").trim();

    if (!url) {
      return NextResponse.json(
        { ok: false, error: "Invalid request: url is required" },
        { status: 400 }
      );
    }

    // maps.app.goo.gl 等を辿る（サーバー側fetchなのでCORS関係なし）
    const res = await fetch(url, {
      redirect: "follow",
      cache: "no-store",
      headers: {
        // これが無いと弾かれるケースがある
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari",
        "accept-language": "ja,en-US;q=0.9,en;q=0.8",
      },
    });

    const finalUrl = String(res.url ?? url);
    const latLng = parseLatLngFromUrl(finalUrl);
    const placeId = parsePlaceIdFromUrl(finalUrl);

    return NextResponse.json({
      ok: true,
      inputUrl: url,
      finalUrl,
      lat: latLng?.lat ?? null,
      lng: latLng?.lng ?? null,
      placeId: placeId ?? null,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e ?? "unknown error") },
      { status: 500 }
    );
  }
}
