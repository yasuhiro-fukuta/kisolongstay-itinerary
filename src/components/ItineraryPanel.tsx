// src/components/ItineraryPanel.tsx
"use client";

import type { ItineraryItem } from "@/lib/itinerary";
import { dayColor, hexToRgba } from "@/lib/dayColors";

function yyyyMmDd(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDays(base: string, plusDays: number): string {
  if (!base) return "";
  const [y, m, d] = base.split("-").map(Number);
  if (!y || !m || !d) return "";
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + plusDays);
  return yyyyMmDd(dt);
}

function groupByDay(items: ItineraryItem[]): { day: number; rows: ItineraryItem[] }[] {
  const days = Array.from(new Set(items.map((x) => Number(x.day))))
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);

  const map = new Map<number, ItineraryItem[]>();
  for (const d of days) map.set(d, []);

  // items順を保持
  for (const it of items) {
    const d = Number(it.day);
    if (!map.has(d)) map.set(d, []);
    map.get(d)!.push(it);
  }

  return days.map((d) => ({ day: d, rows: map.get(d) ?? [] }));
}

export default function ItineraryPanel({
  items,
  baseDate,
  onChangeBaseDate,
  selectedItemId,
  onSelectItem,

  onInsertDayAfter,
  onRemoveDay,
  onInsertRowAfter,
  onRemoveRow,

  onSave,
  saveButtonText,
  saveDisabled,
  userLabel,
}: {
  items: ItineraryItem[];

  baseDate: string;
  onChangeBaseDate: (v: string) => void;

  selectedItemId: string | null;
  onSelectItem: (id: string) => void;

  onInsertDayAfter: (day: number) => void;
  onRemoveDay: (day: number) => void;
  onInsertRowAfter: (itemId: string) => void;
  onRemoveRow: (itemId: string) => void;

  onSave: () => void;
  saveButtonText: string;
  saveDisabled?: boolean;
  userLabel?: string | null;
}) {
  const groups = groupByDay(items);

  return (
    <div className="text-neutral-100 h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-neutral-800 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold truncate">木曽南部ロングステイ Itinerary（v3）</div>
          {userLabel ? (
            <div className="text-xs text-neutral-400 truncate">ログイン中：{userLabel}</div>
          ) : (
            <div className="text-xs text-neutral-400 truncate">未ログイン（保存時にログインできます）</div>
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
        {groups.map(({ day, rows }) => {
          const color = dayColor(day);
          const dateLabel = addDays(baseDate, day - 1);

          return (
            <section
              key={day}
              className="rounded-2xl border overflow-hidden"
              style={{
                borderColor: color,
                backgroundColor: hexToRgba(color, 0.06),
              }}
            >
              {/* Day header */}
              <div className="px-3 py-2 flex items-center gap-2 border-b border-neutral-800/70">
                <div className="font-semibold">Day{day}</div>

                <div className="ml-2 text-xs text-neutral-300 rounded-md px-2 py-1 border border-neutral-800 bg-neutral-950/40">
                  {dateLabel}
                </div>

                <div className="ml-auto flex items-center gap-2">
                  {/* Day - */}
                  <button
                    onClick={() => onRemoveDay(day)}
                    className="rounded-lg px-2 py-1 text-xs border border-neutral-800 bg-neutral-950/40 hover:bg-neutral-900/40"
                    title="このDayを削除"
                  >
                    −
                  </button>

                  {/* Day + */}
                  <button
                    onClick={() => onInsertDayAfter(day)}
                    className="rounded-lg px-2 py-1 text-xs bg-neutral-100 text-neutral-900"
                    title="次のDayとの間にDayを追加"
                  >
                    ＋
                  </button>
                </div>
              </div>

              <div className="p-3 space-y-2">
                {rows.map((v) => {
                  const checked = selectedItemId === v.id;
                  const nameLabel = v.name?.trim() ? v.name : "（未設定）";

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
                      role="button"
                      title="この行に地図/メニューから入力"
                    >
                      <div className="flex items-start gap-2">
                        {/* 行選択表示 */}
                        <div
                          className={[
                            "mt-0.5 h-4 w-4 rounded-full border",
                            checked ? "border-neutral-100 bg-neutral-100" : "border-neutral-600",
                          ].join(" ")}
                        />

                        {/* ★スポット名：自由記述不可（表示のみ） */}
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">{nameLabel}</div>

                          {/* links */}
                          <div className="mt-1 flex flex-wrap gap-3 text-xs text-neutral-300">
                            {v.mapUrl ? (
                              <a className="underline" href={v.mapUrl} target="_blank" rel="noreferrer">
                                Map
                              </a>
                            ) : null}
                            {v.hpUrl ? (
                              <a className="underline" href={v.hpUrl} target="_blank" rel="noreferrer">
                                HP
                              </a>
                            ) : null}
                            {v.otaUrl ? (
                              <a className="underline" href={v.otaUrl} target="_blank" rel="noreferrer">
                                OTA
                              </a>
                            ) : null}
                          </div>
                        </div>

                        {/* 行 + / - */}
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onInsertRowAfter(v.id);
                            }}
                            className="rounded-lg px-2 py-1 text-xs bg-neutral-100 text-neutral-900"
                            title="次の行との間に行を追加"
                          >
                            ＋
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveRow(v.id);
                            }}
                            className="rounded-lg px-2 py-1 text-xs border border-neutral-800 bg-neutral-950/40 hover:bg-neutral-900/40"
                            title="この行を削除（最後の1行は内容クリア）"
                          >
                            −
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <div className="px-3 pb-3 text-xs text-neutral-400">
        使い方：入力したい行を選択 → 地図クリック or メニュー選択 → 行に反映されます。
      </div>
    </div>
  );
}
