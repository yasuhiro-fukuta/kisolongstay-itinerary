"use client";

import { ENTRY_TYPES, type DayIndex, type EntryType, type ItineraryItem } from "@/lib/itinerary";

export default function ItineraryPanel({
  items,
  dates,
  selectedItemId,
  onSelectItem,
  onChangeItem,
  onAddItem,
  onChangeDate,
  onSave,
  saveButtonText,
  saveDisabled,
  userLabel,
}: {
  items: ItineraryItem[];
  dates: string[];
  selectedItemId: string | null;

  onSelectItem: (id: string) => void;
  onChangeItem: (id: string, patch: Partial<Pick<ItineraryItem, "name" | "detail" | "price" | "mapUrl" | "placeId">>) => void;
  onAddItem: (day: DayIndex, type: EntryType) => void;

  onChangeDate: (dayIdx0: number, v: string) => void;

  onSave: () => void;
  saveButtonText: string;
  saveDisabled?: boolean;
  userLabel?: string | null;
}) {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-neutral-800 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold truncate text-neutral-100">
            木曽南部ロングステイ Itinerary（mobile v2）
          </div>
          {userLabel ? (
            <div className="text-xs text-neutral-400 truncate">ログイン中：{userLabel}</div>
          ) : (
            <div className="text-xs text-neutral-400 truncate">未ログイン（保存時にログインできます）</div>
          )}
        </div>

        <button
          onClick={onSave}
          disabled={!!saveDisabled}
          className="px-3 py-1.5 rounded-lg bg-neutral-100 text-neutral-900 text-sm disabled:opacity-50"
        >
          {saveButtonText}
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto p-3 space-y-6">
        {([1, 2, 3, 4, 5] as const).map((day, idx0) => (
          <section key={day} className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="font-semibold text-neutral-100">Day{day}</div>
              <input
                type="date"
                value={dates[idx0] ?? ""}
                onChange={(e) => onChangeDate(idx0, e.target.value)}
                className="ml-auto rounded-lg border border-neutral-800 bg-neutral-950/60 px-2 py-1 text-sm text-neutral-100"
              />
            </div>

            <div className="space-y-3">
              {ENTRY_TYPES.map((t) => {
                const list = items.filter((x) => x.day === day && x.type === t.key);

                return (
                  <div key={t.key} className="rounded-2xl border border-neutral-800 bg-neutral-900/35 overflow-hidden">
                    <div className="px-3 py-2 border-b border-neutral-800 flex items-center justify-between">
                      <div className="text-sm font-semibold text-neutral-100">{t.label}</div>
                      <button
                        onClick={() => onAddItem(day, t.key)}
                        className="rounded-lg px-2 py-1 text-xs bg-neutral-100 text-neutral-900"
                        title={`${t.label}を追加`}
                      >
                        ＋
                      </button>
                    </div>

                    <div className="p-3 space-y-3">
                      {list.map((v, i) => {
                        const checked = selectedItemId === v.id;
                        const badge = list.length >= 2 ? `${t.label} ${i + 1}` : t.label;

                        return (
                          <div
                            key={v.id}
                            className={[
                              "rounded-xl border p-3",
                              checked
                                ? "border-neutral-100 bg-neutral-950/60"
                                : "border-neutral-800 bg-neutral-950/30",
                            ].join(" ")}
                            onClick={() => onSelectItem(v.id)}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="itemSelect"
                                checked={checked}
                                onChange={() => onSelectItem(v.id)}
                                title="この行に地図/メニューから入力"
                              />
                              <div className="text-sm font-medium text-neutral-100">{badge}</div>
                            </div>

                            {/* タイトルの“下”にフォーム */}
                            <div className="mt-2 grid grid-cols-1 gap-2">
                              <input
                                value={v.name}
                                onChange={(e) => onChangeItem(v.id, { name: e.target.value })}
                                placeholder="スポット/サービス名"
                                className="rounded-lg border border-neutral-800 bg-neutral-950/60 px-2 py-2 text-sm text-neutral-100 placeholder:text-neutral-500"
                              />

                              <input
                                value={v.detail}
                                onChange={(e) => onChangeItem(v.id, { detail: e.target.value })}
                                placeholder="詳細（URL/メモなど）"
                                className="rounded-lg border border-neutral-800 bg-neutral-950/60 px-2 py-2 text-sm text-neutral-100 placeholder:text-neutral-500"
                              />

                              <input
                                value={v.price}
                                onChange={(e) => onChangeItem(v.id, { price: e.target.value })}
                                placeholder="金額"
                                className="rounded-lg border border-neutral-800 bg-neutral-950/60 px-2 py-2 text-sm text-neutral-100 placeholder:text-neutral-500"
                              />
                            </div>

                            {v.mapUrl && (
                              <div className="mt-2 text-xs text-neutral-300">
                                <a className="underline" href={v.mapUrl} target="_blank" rel="noreferrer">
                                  Google Maps
                                </a>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <div className="px-3 pb-3 text-xs text-neutral-400">
        使い方：入力したい行を選択 → 地図クリック or 左メニュー選択 → 名前/リンクが入ります。
      </div>
    </div>
  );
}
