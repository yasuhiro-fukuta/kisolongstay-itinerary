// src/lib/itinerary.ts

export const SLOTS = [
  { key: "breakfast", label: "朝食" },
  { key: "checkout", label: "チェックアウト" },
  { key: "am", label: "午前アクティビティ" },
  { key: "lunch", label: "昼食" },
  { key: "pm", label: "午後アクティビティ" },
  { key: "checkin", label: "チェックイン" },
  { key: "night", label: "夜アクティビティ" },
  { key: "dinner", label: "夕食" },
] as const;

export type DayIndex = 1 | 2 | 3 | 4 | 5;
export type SlotKey = (typeof SLOTS)[number]["key"];
export type RowId = `${DayIndex}:${SlotKey}`;

export type RowValue = {
  name: string;

  // リンク類
  mapUrl: string;      // Google Maps
  hpUrl: string;       // 公式HP
  bookingUrl: string;  // Booking等（汎用）
  airbnbUrl: string;
  rakutenUrl: string;
  viatorUrl: string;

  // その他
  price: string;
  placeId: string;
};

export function makeInitialRows(): Record<RowId, RowValue> {
  const rows = {} as Record<RowId, RowValue>;
  const empty = (): RowValue => ({
    name: "",
    mapUrl: "",
    hpUrl: "",
    bookingUrl: "",
    airbnbUrl: "",
    rakutenUrl: "",
    viatorUrl: "",
    price: "",
    placeId: "",
  });

  for (const day of [1, 2, 3, 4, 5] as const) {
    for (const slot of SLOTS) {
      rows[`${day}:${slot.key}` as RowId] = empty();
    }
  }
  return rows;
}
