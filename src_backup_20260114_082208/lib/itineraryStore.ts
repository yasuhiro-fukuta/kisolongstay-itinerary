// src/lib/itineraryStore.ts
import { addDoc, collection, getDoc, getDocs, query, where, doc } from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
import { makeInitialItems, type DayNote, type ItineraryItem } from "@/lib/itinerary";

export type SavedItineraryMeta = {
  id: string;
  title: string;
  savedAtMs: number;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function buildFallbackTitle(date: Date) {
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

export async function saveItinerary({
  uid,
  dates,
  items,
  dayNotes,
  title,
}: {
  uid: string;
  dates: string[];
  items: ItineraryItem[];
  dayNotes?: DayNote[];
  title?: string;
}) {
  const now = new Date();
  const finalTitle = String(title ?? "").trim() || buildFallbackTitle(now);
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

      costMemo: String(x.costMemo ?? ""),

      // UIメタ（空でも保存してOK）
      thumbUrl: String((x as any).thumbUrl ?? ""),
      iconKey: String((x as any).iconKey ?? ""),
      iconUrl: String((x as any).iconUrl ?? ""),

      socialLinks: Array.isArray(x.socialLinks)
        ? x.socialLinks
            .map((s) => ({ platform: String((s as any)?.platform ?? ""), url: String((s as any)?.url ?? "") }))
            .filter((s) => s.platform && s.url)
        : [],

      placeId: String(x.placeId ?? ""),
    };

    return addLatLngIfValid(base, x.lat, x.lng);
  });

  const safeDayNotes: DayNote[] = Array.isArray(dayNotes)
    ? dayNotes.map((n) => ({
        comment: String((n as any)?.comment ?? ""),
        diary: String((n as any)?.diary ?? ""),
      }))
    : [];

  const ref = await addDoc(collection(db, "itineraries"), {
    schemaVersion: 8, // v8: Dayノート（comment/diary）
    uid,
    title: finalTitle,
    savedAtMs,
    dates: Array.isArray(dates) ? dates.map((d) => String(d ?? "")) : [],
    items: safeItems,
    dayNotes: safeDayNotes,
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
  uidOrArgs: string | { uid: string; id: string },
  idMaybe?: string
): Promise<{ title: string; dates: string[]; items: ItineraryItem[]; dayNotes?: DayNote[] }> {
  const uid = typeof uidOrArgs === "string" ? uidOrArgs : uidOrArgs.uid;
  const id = typeof uidOrArgs === "string" ? String(idMaybe ?? "") : uidOrArgs.id;

  if (!uid || !id) throw new Error("ロード情報が不正です");

  const ref = doc(db, "itineraries", id);
  const snap = await getDoc(ref);

  if (!snap.exists()) throw new Error("旅程が存在しません");
  const data: any = snap.data();
  if (data.uid !== uid) throw new Error("権限がありません");

  const title = String(data?.title ?? "").trim() || "保存済み旅程";

  const dates = Array.isArray(data?.dates) ? data.dates.map((v: any) => String(v ?? "")) : [];

  const dayNotes: DayNote[] | undefined = Array.isArray(data?.dayNotes)
    ? data.dayNotes.map((n: any) => ({
        comment: String(n?.comment ?? ""),
        diary: String(n?.diary ?? ""),
      }))
    : undefined;

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
          costMemo: String(raw?.costMemo ?? ""),
          thumbUrl: String(raw?.thumbUrl ?? ""),
          iconKey: String(raw?.iconKey ?? ""),
          iconUrl: String(raw?.iconUrl ?? ""),
          socialLinks: Array.isArray(raw?.socialLinks)
            ? raw.socialLinks
                .map((s: any) => ({ platform: String(s?.platform ?? ""), url: String(s?.url ?? "") }))
                .filter((s: any) => s.platform && s.url)
            : [],
          placeId: String(raw?.placeId ?? ""),
          lat: numOrUndef(raw?.lat),
          lng: numOrUndef(raw?.lng),
        } satisfies ItineraryItem;
      })
      .filter(Boolean) as ItineraryItem[];

    return { title, dates, items: parsed.length ? parsed : makeInitialItems(), dayNotes };
  }

  return { title, dates, items: makeInitialItems(), dayNotes };
}
