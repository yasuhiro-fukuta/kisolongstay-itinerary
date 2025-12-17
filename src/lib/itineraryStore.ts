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
import { makeInitialItems, type DayIndex, type ItineraryItem } from "@/lib/itinerary";

export type SavedItineraryMeta = {
  id: string;
  title: string;
  savedAtMs: number;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function buildTitle(date: Date) {
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(
    date.getDate()
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function normalizeDay(v: unknown): DayIndex | null {
  const n = Number(v);
  if (n === 1 || n === 2 || n === 3 || n === 4 || n === 5) return n;
  return null;
}

export async function saveItinerary(uid: string, dates: string[], items: ItineraryItem[]) {
  const now = new Date();
  const title = buildTitle(now);
  const savedAtMs = now.getTime();

  const safeItems = items.map((x) => ({
    id: String(x.id),
    day: x.day,
    type: "spot",
    name: String(x.name ?? ""),
    price: String(x.price ?? ""),
    placeId: String(x.placeId ?? ""),
    mapUrl: String(x.mapUrl ?? ""),
    detail: String((x as any).detail ?? ""),
  }));

  const ref = await addDoc(collection(db, "itineraries"), {
    schemaVersion: 3,
    uid,
    title,
    savedAtMs,
    dates,
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

  const dates = Array.isArray(data?.dates) ? data.dates.map(String) : [];

  // v3/v2: items
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
          price: String(raw?.price ?? raw?.priceText ?? ""),
          placeId: String(raw?.placeId ?? ""),
          mapUrl: String(raw?.mapUrl ?? ""),
          detail: String(raw?.detail ?? ""),
        } satisfies ItineraryItem;
      })
      .filter(Boolean) as ItineraryItem[];

    // 各Dayに最低1行は確保
    const ensured = [...parsed];
    for (const day of [1, 2, 3, 4, 5] as const) {
      if (!ensured.some((x) => x.day === day)) {
        ensured.push({
          id: `${day}:spot:0`,
          day,
          type: "spot",
          name: "",
          price: "",
          placeId: "",
          mapUrl: "",
          detail: "",
        });
      }
    }

    ensured.sort((a, b) => {
      const d = a.day - b.day;
      if (d) return d;
      return a.id.localeCompare(b.id);
    });

    return { dates, items: ensured.length ? ensured : makeInitialItems() };
  }

  // v1 fallback: rows -> items（ざっくりspot化）
  if (Array.isArray(data?.rows)) {
    const counters: Record<string, number> = {};
    const items: ItineraryItem[] = [];

    for (const r of data.rows ?? []) {
      const rowId = String(r?.id ?? "");
      const [dayStr] = rowId.split(":");
      const day = normalizeDay(dayStr);
      if (!day) continue;

      const key = `${day}:spot`;
      const idx = counters[key] ?? 0;
      counters[key] = idx + 1;

      items.push({
        id: `${key}:${idx}`,
        day,
        type: "spot",
        name: String(r?.name ?? ""),
        price: String(r?.price ?? ""),
        placeId: String(r?.placeId ?? ""),
        mapUrl: String(r?.mapUrl ?? ""),
        detail: "",
      });
    }

    for (const day of [1, 2, 3, 4, 5] as const) {
      if (!items.some((x) => x.day === day)) {
        items.push({
          id: `${day}:spot:0`,
          day,
          type: "spot",
          name: "",
          price: "",
          placeId: "",
          mapUrl: "",
          detail: "",
        });
      }
    }

    items.sort((a, b) => {
      const d = a.day - b.day;
      if (d) return d;
      return a.id.localeCompare(b.id);
    });

    return { dates, items };
  }

  return { dates, items: makeInitialItems() };
}
