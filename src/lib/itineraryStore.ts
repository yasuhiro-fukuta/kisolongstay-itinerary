// src/lib/itineraryStore.ts

import { addDoc, collection, getDoc, getDocs, query, where, doc } from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
import type { RowId, RowValue } from "@/lib/itinerary";

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

export async function saveItinerary(
  uid: string,
  dates: string[],
  rows: Record<RowId, RowValue>
) {
  const now = new Date();
  const title = buildTitle(now);
  const savedAtMs = now.getTime();

  const rowsArray = Object.entries(rows).map(([id, val]) => ({
    id,
    ...val,
  }));

  const ref = await addDoc(collection(db, "itineraries"), {
    uid,
    title,
    savedAtMs,
    dates,
    rows: rowsArray,
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

  // 最新順に並べる
  list.sort((a, b) => b.savedAtMs - a.savedAtMs);
  return list;
}

export async function loadItinerary(uid: string, id: string) {
  const ref = doc(db, "itineraries", id);
  const snap = await getDoc(ref);

  if (!snap.exists()) throw new Error("旅程が存在しません");
  const data: any = snap.data();

  if (data.uid !== uid) throw new Error("権限がありません");

  const dates = Array.isArray(data?.dates) ? data.dates.map(String) : [];

  // rows を RowId:RowValue の形に戻す
  const rows: Record<RowId, RowValue> = {} as any;

  for (const item of data.rows ?? []) {
    const { id: rowId, ...rest } = item;
    rows[rowId as RowId] = rest as RowValue;
  }

  return { dates, rows };
}
