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

function emojiForIconKey(iconKey: string): string {
  const k = (iconKey || "").toLowerCase().trim();
  if (!k) return "📍";
  if (k.includes("cafe") || k.includes("coffee")) return "☕";
  if (k.includes("trail") || k.includes("mount") || k.includes("hike")) return "⛰️";
  if (k.includes("gorge") || k.includes("river")) return "🏞️";
  if (k.includes("brew") || k.includes("beer")) return "🍺";
  if (k.includes("onsen") || k.includes("spa")) return "♨️";
  if (k.includes("hotel") || k.includes("inn") || k.includes("lodging")) return "🏨";
  if (k.includes("train") || k.includes("station")) return "🚉";
  if (k.includes("restaurant") || k.includes("lunch") || k.includes("dinner") || k.includes("food"))
    return "🍽️";
  if (k.includes("camp")) return "🏕️";
  if (k.includes("cycle") || k.includes("bike")) return "🚴";
  if (k.includes("museum")) return "🏛️";
  if (k.includes("goods") || k.includes("shop") || k.includes("store")) return "🛍️";
  if (k.includes("taxi")) return "🚕";
  if (k.includes("bus") || k.includes("shuttle")) return "🚌";
  if (k.includes("tour")) return "🧭";
  if (k.includes("baggage")) return "🧳";
  return "📍";
}



function parseCostMemoToYen(v: unknown): number {
  const s = String(v ?? "").trim();
  if (!s) return 0;
  // 数字以外は除去（「,」「円」などが混ざってもOK）
  const digits = s.replace(/[^0-9]/g, "");
  if (!digits) return 0;
  const n = parseInt(digits, 10);
  return Number.isFinite(n) ? n : 0;
}

function formatYen(n: number): string {
  if (!Number.isFinite(n)) return "";
  try {
    return n.toLocaleString("ja-JP");
  } catch {
    return String(n);
  }
}
export default function ItineraryPanel({
  itineraryTitle,
  onChangeItineraryTitle,
  items,
  baseDate,
  onChangeBaseDate,
  selectedItemId,
  onSelectItem,
  onChangeCostMemo,

  onInsertDayAfter,
  onRemoveDay,
  onInsertRowAfter,
  onRemoveRow,

  onSave,
  onAddToCalendar,
  saveButtonText,
  saveDisabled,
  userLabel,
  expanded,
  onToggleExpand,
}: {
  itineraryTitle: string;
  onChangeItineraryTitle: (v: string) => void;
  items: ItineraryItem[];

  baseDate: string;
  onChangeBaseDate: (v: string) => void;

  selectedItemId: string | null;
  onSelectItem: (id: string) => void;
  onChangeCostMemo: (itemId: string, value: string) => void;

  onInsertDayAfter: (day: number) => void;
  onRemoveDay: (day: number) => void;
  onInsertRowAfter: (itemId: string) => void;
  onRemoveRow: (itemId: string) => void;

  onSave: () => void;
  onAddToCalendar?: () => void;
  saveButtonText: string;
  saveDisabled?: boolean;
  userLabel?: string | null;

  // スマホ向け：表示高さ（1/3 ↔ 2/3）を切り替える
  expanded?: boolean;
  onToggleExpand?: () => void;
}) {
  const groups = groupByDay(items);
  const totalCostYen = items.reduce((sum, it) => sum + parseCostMemoToYen(it.costMemo), 0);

  return (
    <div className="text-neutral-100 h-full flex flex-col">
      {/* Header */}
      <div className="px-3 pb-3 pt-8 border-b border-neutral-800 relative">
        {onToggleExpand ? (
          <button
            onClick={onToggleExpand}
            className="absolute left-1/2 top-2 -translate-x-1/2 rounded-full px-3 py-1 border border-neutral-800 bg-neutral-950/40 hover:bg-neutral-900/40 text-neutral-100 text-sm leading-none"
            title={expanded ? "縮める（1/3表示）" : "広げる（2/3表示）"}
          >
            {expanded ? "▽" : "△"}
          </button>
        ) : null}

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <input
              value={itineraryTitle}
              onChange={(e) => onChangeItineraryTitle(e.target.value)}
              className="w-full max-w-[60vw] font-semibold bg-transparent border-b border-neutral-700/70 focus:border-neutral-100 outline-none truncate"
              placeholder="旅程名（保存/カレンダーのタイトル）"
              aria-label="旅程名"
            />
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
            
              <div className="text-xs text-neutral-300 shrink-0 ml-2">合計金額</div>
              <input
                value={formatYen(totalCostYen)}
                readOnly
                className="w-28 rounded-lg border border-neutral-800 bg-neutral-950/40 px-2 py-1 text-sm text-neutral-100 text-right"
                aria-label="合計金額"
                title="各行の金額メモの合計"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onSave}
              disabled={!!saveDisabled}
              className="px-3 py-1.5 rounded-lg bg-neutral-100 text-neutral-900 text-sm disabled:opacity-50"
            >
              {saveButtonText}
            </button>

            {userLabel && onAddToCalendar ? (
              <button
                onClick={onAddToCalendar}
                className="px-3 py-1.5 rounded-lg bg-neutral-100 text-neutral-900 text-sm whitespace-nowrap"
                title="Googleカレンダーに旅程を反映"
              >
                カレンダーに反映
              </button>
            ) : null}
          </div>
        </div>
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

                  const thumbUrl = String(v.thumbUrl ?? "").trim();
                  const iconKey = String(v.iconKey ?? "").trim();
                  const iconUrl = String(v.iconUrl ?? "").trim();
                  const iconLabel = iconKey || "spot";
                  const emoji = emojiForIconKey(iconKey);

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

                        {/* サムネイル */}
                        <div className="h-12 w-12 rounded-lg overflow-hidden border border-neutral-800 bg-neutral-900 shrink-0 relative">
                          {thumbUrl ? (
                            <img
                              src={thumbUrl}
                              alt={nameLabel}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = "none";
                              }}
                            />
                          ) : null}
                        </div>

                        {/* ★スポット名：自由記述不可（表示のみ） */}
                        <div className="min-w-0 flex-1">
                          {/* アイコン名 */}
                          <div className="text-[11px] text-neutral-400 truncate">{iconLabel}</div>

                          {/* タイトル（左にアイコン） */}
                          <div className="text-sm font-medium truncate text-neutral-100 flex items-center gap-2">
                            {iconUrl ? (
                              <img
                                src={iconUrl}
                                alt=""
                                className="h-4 w-4 shrink-0"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).style.display = "none";
                                }}
                              />
                            ) : (
                              <span className="shrink-0">{emoji}</span>
                            )}
                            <span className="truncate">{nameLabel}</span>
                          </div>
                        </div>

                        {/* 右：金額メモ（上）＋リンク（下） */}
                        <div className="shrink-0 flex flex-col items-end gap-1">
                          <input
                            value={v.costMemo ?? ""}
                            onChange={(e) => onChangeCostMemo(v.id, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-24 rounded-lg border border-neutral-800 bg-neutral-950/40 px-2 py-1 text-sm text-neutral-100 text-right placeholder:text-neutral-500"
                            placeholder="金額をメモ"
                            inputMode="numeric"
                            aria-label="金額メモ"
                          />

                          {/* links（右側下：金額メモの下に移動） */}
                          <div className="flex flex-wrap justify-end gap-3 text-xs text-neutral-300">
                            {v.mapUrl ? (
                              <a
                                href={v.mapUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Map
                              </a>
                            ) : null}
                            {v.hpUrl ? (
                              <a
                                href={v.hpUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                HP
                              </a>
                            ) : null}
                            {v.otaUrl ? (
                              <a
                                href={v.otaUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                OTA
                              </a>
                            ) : null}

                            {Array.isArray(v.socialLinks)
                              ? v.socialLinks.map((s) => (
                                  <a
                                    key={s.platform + s.url}
                                    href={s.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {s.platform}
                                  </a>
                                ))
                              : null}
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
