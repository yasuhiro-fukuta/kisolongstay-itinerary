// src/app/api/boundary/route.ts
// Category boundary API (offline, deterministic)
// Uses pre-generated GeoJSON files under /public/boundaries.
//
// Expected files (from chizu.zip):
// - tsumago.geojson, araragi.geojson, tadachi.geojson, nagiso.geojson,
//   yogawa.geojson, kakizore.geojson, atera.geojson, nojiri.geojson, suhara.geojson
//
// Query: /api/boundary?q=<category>
// Returns: { ok: true, center: {lat,lng}, paths: Array<Array<{lat,lng}>> }

import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";

type LatLng = { lat: number; lng: number };
type BoundaryResponse =
  | { ok: true; category: string; file: string; center: LatLng; paths: LatLng[][] }
  | { ok: true; category: string; file: null; center: null; paths: [] } // 全域など
  | { ok: false; error: string };

const CATEGORY_TO_FILE: Record<string, string | null> = {
  // User categories (JP) -> GeoJSON filename
  "妻籠": "tsumago.geojson",
  "蘭": "araragi.geojson",
  "田立": "tadachi.geojson",
  "南木曽": "nagiso.geojson",
  "与川": "yogawa.geojson",
  "柿其": "kakizore.geojson",
  "阿寺": "atera.geojson",
  "野尻": "nojiri.geojson",
  "須原": "suhara.geojson",
  "全域": null,
};

function ringToPath(ringCoords: any): LatLng[] {
  if (!Array.isArray(ringCoords)) return [];
  const out: LatLng[] = [];
  for (const p of ringCoords) {
    if (!Array.isArray(p) || p.length < 2) continue;
    const lng = Number(p[0]);
    const lat = Number(p[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    out.push({ lat, lng });
  }
  return out;
}

function geojsonToPaths(geojson: any): LatLng[][] {
  const paths: LatLng[][] = [];

  const pushGeom = (geom: any) => {
    if (!geom) return;

    if (geom.type === "Polygon") {
      // coordinates: [ outerRing, hole1, ... ]
      const outer = geom.coordinates?.[0];
      const ring = ringToPath(outer);
      if (ring.length >= 3) paths.push(ring);
      return;
    }

    if (geom.type === "MultiPolygon") {
      // coordinates: [ [outerRing, holes...], ... ]
      const polys = geom.coordinates;
      if (!Array.isArray(polys)) return;
      for (const poly of polys) {
        const outer = poly?.[0];
        const ring = ringToPath(outer);
        if (ring.length >= 3) paths.push(ring);
      }
      return;
    }

    // ignore other geometry types
  };

  if (!geojson || typeof geojson !== "object") return paths;

  if (geojson.type === "FeatureCollection") {
    const feats = geojson.features;
    if (!Array.isArray(feats)) return paths;
    for (const f of feats) pushGeom(f?.geometry);
    return paths;
  }

  if (geojson.type === "Feature") {
    pushGeom(geojson.geometry);
    return paths;
  }

  // raw geometry
  pushGeom(geojson);
  return paths;
}

function computeCenter(paths: LatLng[][]): LatLng | null {
  // centroid by averaging all points (stable enough for viewport focus)
  let sumLat = 0;
  let sumLng = 0;
  let n = 0;
  for (const ring of paths) {
    for (const p of ring) {
      sumLat += p.lat;
      sumLng += p.lng;
      n++;
    }
  }
  if (!n) return null;
  return { lat: sumLat / n, lng: sumLng / n };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = String(searchParams.get("q") ?? "").trim();

  if (!category) {
    return NextResponse.json<BoundaryResponse>({ ok: false, error: "missing q" }, { status: 400 });
  }

  const file = CATEGORY_TO_FILE[category];
  if (file === undefined) {
    return NextResponse.json<BoundaryResponse>({ ok: false, error: "unknown category" }, { status: 404 });
  }

  if (file === null) {
    return NextResponse.json<BoundaryResponse>(
      { ok: true, category, file: null, center: null, paths: [] },
      { status: 200 }
    );
  }

  try {
    const abs = path.join(process.cwd(), "public", "boundaries", file);
    const raw = await fs.readFile(abs, "utf8");
    const geojson = JSON.parse(raw);

    const paths = geojsonToPaths(geojson);
    const center = computeCenter(paths);

    if (!paths.length || !center) {
      return NextResponse.json<BoundaryResponse>({ ok: false, error: `no polygon in ${file}` }, { status: 200 });
    }

    return NextResponse.json<BoundaryResponse>({ ok: true, category, file, center, paths }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json<BoundaryResponse>(
      { ok: false, error: e?.message ? String(e.message) : "failed to read geojson" },
      { status: 200 }
    );
  }
}
