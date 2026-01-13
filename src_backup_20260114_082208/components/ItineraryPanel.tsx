// src/components/ItineraryPanel.tsx
"use client";

import type { DayNote, ItineraryItem } from "@/lib/itinerary";
import { dayColor, hexToRgba } from "@/lib/dayColors";
import { translateSpotTitle, useI18n } from "@/lib/i18n";

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

  // keep item order
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
  // strip non-digits (allows commas, 円, etc.)
  const digits = s.replace(/[^0-9]/g, "");
  if (!digits) return 0;
  const n = parseInt(digits, 10);
  return Number.isFinite(n) ? n : 0;
}

function formatNumber(n: number, locale: string): string {
  if (!Number.isFinite(n)) return "";
  try {
    return n.toLocaleString(locale);
  } catch {
    return String(n);
  }
}

type SocialLink = { platform: string; url: string };

function limitSocialLinks(links: unknown): SocialLink[] {
  if (!Array.isArray(links)) return [];
  const out: SocialLink[] = [];
  const seen = new Set<string>();

  for (const raw of links) {
    const platform = String((raw as any)?.platform ?? "").trim();
    const url = String((raw as any)?.url ?? "").trim();
    if (!platform || !url) continue;
    const key = platform.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ platform, url });
  }

  return out;
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

  dayNotes,
  onUpdateDayNote,

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

  dayNotes: DayNote[];
  onUpdateDayNote: (dayNumber: number, patch: Partial<DayNote>) => void;

  onInsertDayAfter: (day: number) => void;
  onRemoveDay: (day: number) => void;
  onInsertRowAfter: (itemId: string) => void;
  onRemoveRow: (itemId: string) => void;

  onSave: () => void;
  onAddToCalendar?: () => void;
  saveButtonText: string;
  saveDisabled?: boolean;
  userLabel?: string | null;

  // mobile: height toggle (1/3 ↔ 2/3)
  expanded?: boolean;
  onToggleExpand?: () => void;
}) {
  const { lang, t } = useI18n();
  const locale = lang === "ja" ? "ja-JP" : "en-US";

  type DayTextKind = "comment" | "diary";

  const [noteEditor, setNoteEditor] = useState<{ dayNumber: number; kind: DayTextKind } | null>(null);
  const [noteDraft, setNoteDraft] = useState<string>("");
  const noteTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!noteEditor) return;
    // モーダルが開いたらフォーカス
    const timer = setTimeout(() => noteTextareaRef.current?.focus(), 0);
    return () => clearTimeout(timer);
  }, [noteEditor]);

  const openNoteEditor = (dayNumber: number, kind: DayTextKind) => {
    const idx = Math.max(0, dayNumber - 1);
    const existing = dayNotes?.[idx]?.[kind] ?? "";
    setNoteDraft(String(existing));
    setNoteEditor({ dayNumber, kind });
  };

  const closeNoteEditor = () => {
    if (!noteEditor) return;
    onUpdateDayNote(noteEditor.dayNumber, { [noteEditor.kind]: noteDraft } as Partial<DayNote>);
    setNoteEditor(null);
  };

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
            title={expanded ? t("itinerary.collapseTitle") : t("itinerary.expandTitle")}
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
              placeholder={t("itinerary.titlePlaceholder")}
              aria-label={t("itinerary.titleAria")}
            />

            {userLabel ? (
              <div className="text-xs text-neutral-400 truncate">{t("itinerary.signedIn", { user: userLabel })}</div>
            ) : (
              <div className="text-xs text-neutral-400 truncate">{t("itinerary.signedOut")}</div>
            )}

            <div className="mt-2 flex items-center gap-2">
              <div className="text-xs text-neutral-300 shrink-0">{t("itinerary.startDate")}</div>
              <input
                type="date"
                value={baseDate ?? ""}
                onChange={(e) => onChangeBaseDate(e.target.value)}
                className="rounded-lg border border-neutral-800 bg-neutral-950/60 px-2 py-1 text-sm text-neutral-100"
              />

              <div className="text-xs text-neutral-300 shrink-0 ml-2">{t("itinerary.totalCost")}</div>
              <input
                value={formatNumber(totalCostYen, locale)}
                readOnly
                className="w-28 rounded-lg border border-neutral-800 bg-neutral-950/40 px-2 py-1 text-sm text-neutral-100 text-right"
                aria-label={t("itinerary.totalCostAria")}
                title={t("itinerary.totalCostTitle")}
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
                title={t("itinerary.calendarTitle")}
              >
                {t("itinerary.calendarButton")}
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

          const note = dayNotes?.[day - 1] ?? {};
          const hasComment = String(note.comment ?? "").trim().length > 0;
          const hasDiary = String(note.diary ?? "").trim().length > 0;

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

                <div className="ml-2 text-xs text-neutral-400">{dateLabel}</div>

                {/* Mobile: comment / diary links */}
                <div className="ml-1 flex items-center gap-1 md:hidden">
                  <button
                    type="button"
                    onClick={() => openNoteEditor(day, "comment")}
                    className={[
                      "rounded-md px-2 py-1 text-xs border bg-neutral-950/40 hover:bg-neutral-900/40",
                      hasComment ? "border-neutral-100 text-neutral-100" : "border-neutral-800 text-neutral-400",
                    ].join(" ")}
                    title={t("itinerary.commentLinkTitle")}
                    aria-label={t("itinerary.commentLinkTitle")}
                  >
                    💬
                  </button>
                  <button
                    type="button"
                    onClick={() => openNoteEditor(day, "diary")}
                    className={[
                      "rounded-md px-2 py-1 text-xs border bg-neutral-950/40 hover:bg-neutral-900/40",
                      hasDiary ? "border-neutral-100 text-neutral-100" : "border-neutral-800 text-neutral-400",
                    ].join(" ")}
                    title={t("itinerary.diaryLinkTitle")}
                    aria-label={t("itinerary.diaryLinkTitle")}
                  >
                    📓
                  </button>
                </div>

                <div className="ml-auto flex items-center gap-2">
                  {/* Day - */}
                  <button
                    onClick={() => onRemoveDay(day)}
                    className="rounded-lg px-2 py-1 text-xs border border-neutral-800 bg-neutral-950/40 hover:bg-neutral-900/40"
                    title={t("itinerary.dayRemoveTitle")}
                  >
                    −
                  </button>

                  {/* Day + */}
                  <button
                    onClick={() => onInsertDayAfter(day)}
                    className="rounded-lg px-2 py-1 text-xs bg-neutral-100 text-neutral-900"
                    title={t("itinerary.dayAddTitle")}
                  >
                    ＋
                  </button>
                </div>
              </div>

              <div className="p-3 space-y-2">
                {rows.map((v) => {
                  const checked = selectedItemId === v.id;
                  const rawName = String(v.name ?? "").trim();
                  const nameLabel = rawName ? translateSpotTitle(rawName, lang) : t("common.unset");

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
                        checked ? "border-neutral-100 bg-neutral-950/60" : "border-neutral-800 bg-neutral-950/30",
                      ].join(" ")}
                      onClick={() => onSelectItem(v.id)}
                      role="button"
                      title={t("itinerary.rowPickTitle")}
                    >
                      <div className="flex items-start gap-2">
                        {/* row select indicator */}
                        <div
                          className={[
                            "mt-0.5 h-4 w-4 rounded-full border",
                            checked ? "border-neutral-100 bg-neutral-100" : "border-neutral-600",
                          ].join(" ")}
                        />

                        {/* thumbnail */}
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

                        {/* spot name (display only) */}
                        <div className="min-w-0 flex-1">
                          {/* icon label */}
                          <div className="text-[11px] text-neutral-400 truncate">{iconLabel}</div>

                          {/* title */}
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

                        {/*
                          right: cost memo (top) + links (bottom)
                          NOTE: keep this column width bounded so many links won't squeeze the title.
                        */}
                        <div className="w-28 shrink-0 flex flex-col items-end gap-1">
                          <input
                            value={v.costMemo ?? ""}
                            onChange={(e) => onChangeCostMemo(v.id, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-24 rounded-lg border border-neutral-800 bg-neutral-950/40 px-2 py-1 text-sm text-neutral-100 text-right placeholder:text-neutral-500"
                            placeholder={t("itinerary.costMemoPlaceholder")}
                            inputMode="numeric"
                            aria-label={t("itinerary.costMemoAria")}
                          />

                          {/* links */}
                          <div className="w-full flex flex-wrap justify-end gap-3 text-xs text-neutral-300 mt-1">
                            {v.mapUrl ? (
                              <a
                                href={v.mapUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {t("common.links.map")}
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
                                {t("common.links.hp")}
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
                                {t("common.links.ota")}
                              </a>
                            ) : null}

                            {limitSocialLinks(v.socialLinks).map((s) => (
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
                            ))}
                          </div>
                        </div>

                        {/* row + / - */}
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onInsertRowAfter(v.id);
                            }}
                            className="rounded-lg px-2 py-1 text-xs bg-neutral-100 text-neutral-900"
                            title={t("itinerary.rowAddTitle")}
                          >
                            ＋
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveRow(v.id);
                            }}
                            className="rounded-lg px-2 py-1 text-xs border border-neutral-800 bg-neutral-950/40 hover:bg-neutral-900/40"
                            title={t("itinerary.rowRemoveTitle")}
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

      {/* コメント／日記エディタ（モーダル） */}
      {noteEditor ? (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-xl border border-neutral-800 bg-neutral-950 shadow-xl">
            <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
              <div className="text-sm font-semibold">
                Day{noteEditor.dayNumber} {noteEditor.kind === "comment" ? t("itinerary.commentLinkTitle") : t("itinerary.diaryLinkTitle")}
              </div>

              <button
                type="button"
                onClick={closeNoteEditor}
                className="rounded-md px-2 py-1 text-neutral-200 hover:bg-neutral-800"
                title={t("common.close")}
                aria-label={t("common.close")}
              >
                ×
              </button>
            </div>

            <div className="p-3">
              <textarea
                ref={noteTextareaRef}
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                rows={10}
                className="w-full resize-none rounded-lg border border-neutral-800 bg-neutral-950/40 p-3 text-sm text-neutral-100 focus:outline-none focus:border-neutral-600"
                placeholder={
                  noteEditor.kind === "comment"
                    ? t("itinerary.commentPlaceholder")
                    : t("itinerary.diaryPlaceholder")
                }
              />
            </div>
          </div>
        </div>
      ) : null}

      <div className="px-3 pb-3 text-xs text-neutral-400">{t("itinerary.howTo")}</div>
    </div>
  );
}
