// src/lib/itineraryStore.ts
import { addDoc, collection, getDoc, getDocs, query, where, doc } from "firebase/firestore";
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

function addLatLngIfValid(obj: Record<string, any>, lat: any, lng: any): Record<string, any> {
  const out: Record<string, any> = { ...obj };

  if (typeof lat === "number" && Number.isFinite(lat) && Math.abs(lat) <= 90) out.lat = lat;
  if (typeof lng === "number" && Number.isFinite(lng) && Math.abs(lng) <= 180) out.lng = lng;

  return out;
}

function numOrUndef(v: any): number | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function normalizeDay(v: unknown): number | null {
  const n = Math.trunc(Number(v));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export async function saveItinerary(uid: string, dates: string[], items: ItineraryItem[]) {
  const now = new Date();
  const title = buildTitle(now);
  const savedAtMs = now.getTime();

  const safeItems = items.map((x) => {
    const base = {
      id: String(x.id),
      day: Number(x.day),
      type: "spot",
      name: String(x.name ?? ""),

      mapUrl: String(x.mapUrl ?? ""),
      hpUrl: String(x.hpUrl ?? ""),
      otaUrl: String(x.otaUrl ?? ""),

      placeId: String(x.placeId ?? ""),
    };

    return addLatLngIfValid(base, x.lat, x.lng);
  });

  const ref = await addDoc(collection(db, "itineraries"), {
    schemaVersion: 4, // v3で増減Day/リンク等があるので更新
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

export async function loadItinerary(uid: string, id: string): Promise<{ dates: string[]; items: ItineraryItem[] }> {
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
          id: String(raw?.id ?? `spot:${Math.random().toString(36).slice(2)}`),
          day,
          type: "spot",
          name: String(raw?.name ?? ""),
          mapUrl: String(raw?.mapUrl ?? ""),
          hpUrl: String(raw?.hpUrl ?? ""),
          otaUrl: String(raw?.otaUrl ?? ""),
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
