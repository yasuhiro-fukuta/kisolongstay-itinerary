// src/components/ItineraryPanel.tsx
"use client";

import type { DayIndex, ItineraryItem } from "@/lib/itinerary";
import { dayColor, hexToRgba } from "@/lib/dayColors";

export default function ItineraryPanel({
  items,
  dates,
  baseDate,
  onChangeBaseDate,
  selectedItemId,
  onSelectItem,
  onChangeItem,
  onAddItem,
  onSave,
  saveButtonText,
  saveDisabled,
  userLabel,
}: {
  items: ItineraryItem[];
  dates: string[];

  baseDate: string;
  onChangeBaseDate: (v: string) => void;

  selectedItemId: string | null;
  onSelectItem: (id: string) => void;

  onChangeItem: (id: string, patch: Partial<Pick<ItineraryItem, "name" | "price">>) => void;
  onAddItem: (day: DayIndex) => void;

  onSave: () => void;
  saveButtonText: string;
  saveDisabled?: boolean;
  userLabel?: string | null;
}) {
  return (
    <div className="text-neutral-100 h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-neutral-800 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold truncate">木曽南部ロングステイ Itinerary（mobile v2）</div>
          {userLabel ? (
            <div className="text-xs text-neutral-400 truncate">ログイン中：{userLabel}</div>
          ) : (
            <div className="text-xs text-neutral-400 truncate">未ログイン（保存する時にログインできます）</div>
          )}

          <div className="mt-2 flex items-center gap-2">
            <div className="text-xs text-neutral-300 shrink-0">出発日</div>
            <input
              type="date"
              value={baseDate ?? ""}
              onChange={(e) => onChangeBaseDate(e.target.value)}
              className="rounded-lg border border-neutral-800 bg-neutral-950/60 px-2 py-1 text-sm text-neutral-100"
            />
          </div>
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
      <div className="flex-1 overflow-auto p-3 space-y-3">
        {([1, 2, 3, 4, 5] as const).map((day, idx0) => {
          const color = dayColor(day);
          const list = items.filter((x) => x.day === day);

          return (
            <section
              key={day}
              className="rounded-2xl border overflow-hidden"
              style={{
                borderColor: color,
                backgroundColor: hexToRgba(color, 0.06),
              }}
            >
              {/* Day header row: Day + date + + button */}
              <div className="px-3 py-2 flex items-center gap-2 border-b border-neutral-800/70">
                <div className="font-semibold">Day{day}</div>
                <div className="ml-2 text-xs text-neutral-300 rounded-md px-2 py-1 border border-neutral-800 bg-neutral-950/40">
                  {dates[idx0] ?? ""}
                </div>

                <button
                  onClick={() => onAddItem(day)}
                  className="ml-auto rounded-lg px-2 py-1 text-xs bg-neutral-100 text-neutral-900"
                  title="行を追加"
                >
                  ＋
                </button>
              </div>

              <div className="p-3 space-y-2">
                {list.map((v) => {
                  const checked = selectedItemId === v.id;

                  const hasLinks =
                    !!String(v.mapUrl ?? "").trim() ||
                    !!String((v as any).hpUrl ?? "").trim() ||
                    !!String((v as any).otaUrl ?? "").trim();

                  return (
                    <div
                      key={v.id}
                      className={[
                        "rounded-xl border p-2",
                        checked
                          ? "border-neutral-100 bg-neutral-950/60"
                          : "border-neutral-800 bg-neutral-950/30",
                      ].join(" ")}
                      onClick={() => onSelectItem(v.id)}
                    >
                      {/* radio + name + price */}
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="itemSelect"
                          checked={checked}
                          onChange={() => onSelectItem(v.id)}
                          title="この行に地図/メニューから入力"
                        />

                        <input
                          value={v.name}
                          onChange={(e) => onChangeItem(v.id, { name: e.target.value })}
                          placeholder="スポット/サービス名"
                          className="flex-1 rounded-lg border border-neutral-800 bg-neutral-950/60 px-2 py-2 text-sm text-neutral-100 placeholder:text-neutral-500"
                        />

                        <input
                          value={v.price}
                          onChange={(e) => onChangeItem(v.id, { price: e.target.value })}
                          placeholder="金額"
                          className="w-[90px] rounded-lg border border-neutral-800 bg-neutral-950/60 px-2 py-2 text-sm text-neutral-100 placeholder:text-neutral-500"
                        />
                      </div>

                      {/* links: Map / HP / OTA (無ければ何も出さない) */}
                      {hasLinks && (
                        <div className="mt-2 flex items-center gap-3 text-xs text-neutral-300">
                          {String(v.mapUrl ?? "").trim() && (
                            <a
                              className="underline"
                              href={String(v.mapUrl)}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Map
                            </a>
                          )}
                          {String((v as any).hpUrl ?? "").trim() && (
                            <a
                              className="underline"
                              href={String((v as any).hpUrl)}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              HP
                            </a>
                          )}
                          {String((v as any).otaUrl ?? "").trim() && (
                            <a
                              className="underline"
                              href={String((v as any).otaUrl)}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              OTA
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <div className="px-3 pb-3 text-xs text-neutral-400">
        使い方：入力したい行を選択 → 地図クリック or 左メニュー選択 → 行に反映されます。
      </div>
    </div>
  );
}
