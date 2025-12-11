// src/lib/itinerary.ts

export const ENTRY_TYPES = [
  { key: "spot", label: "スポット" },
  { key: "food", label: "食事" },
  { key: "activity", label: "アクティビティ" },
  { key: "move", label: "移動" },
  { key: "checkin", label: "チェックイン" },
] as const;

export type EntryType = (typeof ENTRY_TYPES)[number]["key"];
export type DayIndex = 1 | 2 | 3 | 4 | 5;

export type ItemId = string;

export type ItineraryItem = {
  id: ItemId;
  day: DayIndex;
  type: EntryType;

  // 3列だけ
  name: string;
  detail: string;
  price: string;

  // 地図連携（UIではリンクとして表示する程度）
  placeId?: string;
  mapUrl?: string;
};

export function makeInitialItems(): ItineraryItem[] {
  const items: ItineraryItem[] = [];
  for (const day of [1, 2, 3, 4, 5] as const) {
    for (const t of ENTRY_TYPES) {
      items.push({
        id: `${day}:${t.key}:0`,
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
  return items;
}

export function labelForType(type: EntryType): string {
  return ENTRY_TYPES.find((x) => x.key === type)?.label ?? type;
}
