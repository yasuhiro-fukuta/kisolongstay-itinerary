// src/lib/itineraryStore.ts

import {
  addDoc,
  collection,
  getDoc,
  getDocs,
  query,
  where,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
import { makeInitialItems, type ItineraryItem } from "@/lib/itinerary";

export type SavedItineraryMeta = {
  id: string;
  title: string;
  savedAtMs: number;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function buildTitle(date: Date) {
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

/**
 * Firestore は undefined を保存できないので、
 * 数値として正しいときだけフィールドを付与する。
 */
function addLatLngIfValid(
  obj: Record<string, any>,
  lat: any,
  lng: any
): Record<string, any> {
  const out: Record<string, any> = { ...obj };

  if (typeof lat === "number" && Number.isFinite(lat) && Math.abs(lat) <= 90) {
    out.lat = lat;
  }
  if (typeof lng === "number" && Number.isFinite(lng) && Math.abs(lng) <= 180) {
    out.lng = lng;
  }

  return out;
}

/**
 * 読み込み時：null/undefined/空文字は undefined 扱いにする（0 に化けさせない）
 */
function numOrUndef(v: any): number | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function normalizeDay(v: unknown): 1 | 2 | 3 | 4 | 5 | null {
  const n = Number(v);
  if (n === 1 || n === 2 || n === 3 || n === 4 || n === 5) return n;
  return null;
}

export async function saveItinerary(uid: string, dates: string[], items: ItineraryItem[]) {
  const now = new Date();
  const title = buildTitle(now);
  const savedAtMs = now.getTime();

  const safeItems = items.map((x) => {
    // まず undefined を絶対に含まない形でベースを作る
    const base = {
      id: String(x.id),
      day: Number(x.day),
      type: "spot",
      name: String(x.name ?? ""),
      price: String(x.price ?? ""),
      mapUrl: String(x.mapUrl ?? ""),
      placeId: String(x.placeId ?? ""),
    };

    // lat/lng は「数値として妥当なときだけ」付与（undefined は絶対入れない）
    return addLatLngIfValid(base, x.lat, x.lng);
  });

  const ref = await addDoc(collection(db, "itineraries"), {
    schemaVersion: 3,
    uid,
    title,
    savedAtMs,
    dates: Array.isArray(dates) ? dates.map((d) => String(d ?? "")) : [],
    items: safeItems,
  });

  return ref.id;
}

export async function listItineraries(uid: string): Promise<SavedItineraryMeta[]> {
  const q = query(collection(db, "itineraries"), where("uid", "==", uid));
  const snap = await getDocs(q);

  const list = snap.docs.map((d) => {
    const data: any = d.data();
    return {
      id: d.id,
      title: data?.title ?? "保存済み旅程",
      savedAtMs: data?.savedAtMs ?? 0,
    };
  });

  list.sort((a, b) => b.savedAtMs - a.savedAtMs);
  return list;
}

export async function loadItinerary(
  uid: string,
  id: string
): Promise<{ dates: string[]; items: ItineraryItem[] }> {
  const ref = doc(db, "itineraries", id);
  const snap = await getDoc(ref);

  if (!snap.exists()) throw new Error("旅程が存在しません");
  const data: any = snap.data();

  if (data.uid !== uid) throw new Error("権限がありません");

  const dates = Array.isArray(data?.dates) ? data.dates.map((v: any) => String(v ?? "")) : [];

  if (Array.isArray(data?.items)) {
    const parsed: ItineraryItem[] = data.items
      .map((raw: any) => {
        const day = normalizeDay(raw?.day);
        if (!day) return null;

        return {
          id: String(raw?.id ?? `${day}:spot:${Math.random().toString(36).slice(2)}`),
          day,
          type: "spot",
          name: String(raw?.name ?? ""),
          price: String(raw?.price ?? ""),
          mapUrl: String(raw?.mapUrl ?? ""),
          placeId: String(raw?.placeId ?? ""),
          lat: numOrUndef(raw?.lat),
          lng: numOrUndef(raw?.lng),
        } satisfies ItineraryItem;
      })
      .filter(Boolean) as ItineraryItem[];

    return { dates, items: parsed.length ? parsed : makeInitialItems() };
  }

  return { dates, items: makeInitialItems() };
}
