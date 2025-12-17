// src/lib/itinerary.ts

export type DayIndex = 1 | 2 | 3 | 4 | 5;
export type EntryType = "spot";

export type ItemId = string;

export type ItineraryItem = {
  id: ItemId;
  day: DayIndex;
  type: EntryType;

  name: string;
  price: string;

  mapUrl?: string;
  placeId?: string;

  // ★ルートはこれを使う（placeId には依存しない）
  lat?: number;
  lng?: number;
};

export function makeInitialItems(): ItineraryItem[] {
  const items: ItineraryItem[] = [];
  for (const day of [1, 2, 3, 4, 5] as const) {
    items.push({
      id: `${day}:spot:0`,
      day,
      type: "spot",
      name: "",
      price: "",
      mapUrl: "",
      placeId: "",
      lat: undefined,
      lng: undefined,
    });
  }
  return items;
}
