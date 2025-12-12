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
import {
  ENTRY_TYPES,
  makeInitialItems,
  type DayIndex,
  type EntryType,
  type ItineraryItem,
} from "@/lib/itinerary";

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

const typeOrder = new Map<EntryType, number>(ENTRY_TYPES.map((t, i) => [t.key, i]));

// ★ここが重要：Set<EntryType> に型を固定する
const entryTypeSet: Set<EntryType> = new Set(ENTRY_TYPES.map((t) => t.key as EntryType));

function isEntryType(v: unknown): v is EntryType {
  return typeof v === "string" && entryTypeSet.has(v as EntryType);
}

function slotToType(slot: string): EntryType {
  if (slot === "checkin") return "checkin";
  if (slot === "checkout") return "move";
  if (slot === "breakfast" || slot === "lunch" || slot === "dinner") return "food";
  if (slot === "am" || slot === "pm" || slot === "night") return "activity";
  return "spot";
}

function normalizeDay(v: unknown): DayIndex | null {
  const n = Number(v);
  if (n === 1 || n === 2 || n === 3 || n === 4 || n === 5) return n;
  return null;
}

export async function saveItinerary(
  uid: string,
  dates: string[],
  items: ItineraryItem[]
) {
  const now = new Date();
  const title = buildTitle(now);
  const savedAtMs = now.getTime();

  const safeItems = items.map((x) => ({
    id: String(x.id),
    day: x.day,
    type: x.type,
    name: String(x.name ?? ""),
    detail: String(x.detail ?? ""),
    price: String(x.price ?? ""),
    placeId: String(x.placeId ?? ""),
    mapUrl: String(x.mapUrl ?? ""),
  }));

  const ref = await addDoc(collection(db, "itineraries"), {
    schemaVersion: 2,
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

  // ===== v2: items =====
  if (Array.isArray(data?.items)) {
    const parsed: ItineraryItem[] = data.items
      .map((raw: any) => {
        const day = normalizeDay(raw?.day);
        const type = raw?.type;

        if (!day || !isEntryType(type)) return null;

        return {
          id: String(raw?.id ?? `${day}:${type}:${Math.random().toString(36).slice(2)}`),
          day,
          type,
          name: String(raw?.name ?? ""),
          detail: String(raw?.detail ?? ""),
          price: String(raw?.price ?? ""),
          placeId: String(raw?.placeId ?? ""),
          mapUrl: String(raw?.mapUrl ?? ""),
        } satisfies ItineraryItem;
      })
      .filter(Boolean) as ItineraryItem[];

    return { dates, items: parsed.length ? parsed : makeInitialItems() };
  }

  // ===== v1 fallback: rows -> items（ざっくり変換）=====
  if (Array.isArray(data?.rows)) {
    const counters: Record<string, number> = {};
    const items: ItineraryItem[] = [];

    for (const r of data.rows ?? []) {
      const rowId = String(r?.id ?? "");
      const [dayStr, slot] = rowId.split(":");
      const day = normalizeDay(dayStr);
      if (!day) continue;

      const type = slotToType(String(slot ?? ""));
      const key = `${day}:${type}`;
      const idx = counters[key] ?? 0;
      counters[key] = idx + 1;

      const links = [
        r?.hpUrl,
        r?.bookingUrl,
        r?.airbnbUrl,
        r?.rakutenUrl,
        r?.viatorUrl,
        r?.mapUrl,
      ]
        .map((x: any) => String(x ?? "").trim())
        .filter(Boolean);

      items.push({
        id: `${key}:${idx}`,
        day,
        type,
        name: String(r?.name ?? ""),
        detail: links.join("\n"),
        price: String(r?.price ?? ""),
        placeId: String(r?.placeId ?? ""),
        mapUrl: String(r?.mapUrl ?? ""),
      });
    }

    // 各Day×各カテゴリに最低1行は確保
    for (const day of [1, 2, 3, 4, 5] as const) {
      for (const t of ENTRY_TYPES) {
        if (!items.some((x) => x.day === day && x.type === t.key)) {
          const key = `${day}:${t.key}`;
          const idx = counters[key] ?? 0;
          counters[key] = idx + 1;
          items.push({
            id: `${key}:${idx}`,
            day,
            type: t.key,
            name: "",
            detail: "",
            price: "",
            placeId: "",
            mapUrl: "",
          });
        }
      }
    }

    items.sort((a, b) => {
      const d = a.day - b.day;
      if (d) return d;
      const ta = typeOrder.get(a.type) ?? 999;
      const tb = typeOrder.get(b.type) ?? 999;
      if (ta !== tb) return ta - tb;
      return a.id.localeCompare(b.id);
    });

    return { dates, items };
  }

  return { dates, items: makeInitialItems() };
}
