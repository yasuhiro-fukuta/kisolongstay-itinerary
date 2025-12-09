"use client";

import { RowId, RowValue, SLOTS } from "@/lib/itinerary";

export default function ItineraryPanel({
  rows,
  dates,
  selectedRowId,
  onSelectRow,
  onChangeRow,
  onChangeDate,
  onSave,
  saveButtonText,
  saveDisabled,
  userLabel,
}: {
  rows: Record<RowId, RowValue>;
  dates: string[];
  selectedRowId: RowId | null;
  onSelectRow: (id: RowId) => void;
  onChangeRow: (id: RowId, patch: Partial<RowValue>) => void;
  onChangeDate: (dayIdx0: number, v: string) => void;

  onSave: () => void;
  saveButtonText: string;
  saveDisabled?: boolean;
  userLabel?: string | null;
}) {
  return (
    <div className="rounded-2xl bg-white/90 backdrop-blur shadow-lg border border-neutral-200">
      <div className="p-3 border-b border-neutral-200 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold truncate">木曽南部ロングステイ Itinerary（v1）</div>
          {userLabel ? (
            <div className="text-xs text-neutral-600 truncate">ログイン中：{userLabel}</div>
          ) : (
            <div className="text-xs text-neutral-600 truncate">未ログイン（保存する時にログインできます）</div>
          )}
        </div>

        <button
          onClick={onSave}
          disabled={!!saveDisabled}
          className="px-3 py-1.5 rounded-lg bg-neutral-900 text-white text-sm disabled:opacity-50"
        >
          {saveButtonText}
        </button>
      </div>

      <div className="max-h-[62vh] overflow-auto p-3 space-y-6">
        {([1, 2, 3, 4, 5] as const).map((day, idx0) => (
          <section key={day} className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="font-semibold">Day{day}</div>
              <input
                type="date"
                value={dates[idx0] ?? ""}
                onChange={(e) => onChangeDate(idx0, e.target.value)}
                className="ml-auto rounded-lg border border-neutral-300 bg-white px-2 py-1 text-sm"
              />
            </div>

            <div className="space-y-2">
              {SLOTS.map((slot) => {
                const id = `${day}:${slot.key}` as RowId;
                const v = rows[id];
                const checked = selectedRowId === id;

                return (
                  <div key={id} className="rounded-xl border border-neutral-200 bg-white p-2">
                    <div className="grid grid-cols-[140px_20px_1fr_1fr_1fr_110px] gap-2 items-center">
                      <div className="text-sm text-neutral-700">{slot.label}</div>

                      <input
                        type="radio"
                        name="rowSelect"
                        checked={checked}
                        onChange={() => onSelectRow(id)}
                        title="この行に地図/リストから入力"
                      />

                      <input
                        value={v.name}
                        onChange={(e) => onChangeRow(id, { name: e.target.value })}
                        placeholder="スポット/サービス名"
                        className="rounded-lg border border-neutral-300 px-2 py-1 text-sm"
                      />

                      <input
                        value={v.hpUrl}
                        onChange={(e) => onChangeRow(id, { hpUrl: e.target.value })}
                        placeholder="公式HPリンク"
                        className="rounded-lg border border-neutral-300 px-2 py-1 text-sm"
                      />

                      <input
                        value={v.bookingUrl}
                        onChange={(e) => onChangeRow(id, { bookingUrl: e.target.value })}
                        placeholder="Bookingなど予約ページ"
                        className="rounded-lg border border-neutral-300 px-2 py-1 text-sm"
                      />

                      <input
                        value={v.price}
                        onChange={(e) => onChangeRow(id, { price: e.target.value })}
                        placeholder="金額"
                        className="rounded-lg border border-neutral-300 px-2 py-1 text-sm"
                      />
                    </div>

                    {(v.mapUrl ||
                      v.hpUrl ||
                      v.bookingUrl ||
                      v.airbnbUrl ||
                      v.rakutenUrl ||
                      v.viatorUrl) && (
                      <div className="mt-2 text-xs text-neutral-600 flex flex-wrap gap-x-3 gap-y-1">
                        {v.mapUrl && (
                          <a className="underline" href={v.mapUrl} target="_blank" rel="noreferrer">
                            Google Maps
                          </a>
                        )}
                        {v.hpUrl && (
                          <a className="underline" href={v.hpUrl} target="_blank" rel="noreferrer">
                            公式HP
                          </a>
                        )}
                        {v.bookingUrl && (
                          <a className="underline" href={v.bookingUrl} target="_blank" rel="noreferrer">
                            Booking
                          </a>
                        )}
                        {v.airbnbUrl && (
                          <a className="underline" href={v.airbnbUrl} target="_blank" rel="noreferrer">
                            Airbnb
                          </a>
                        )}
                        {v.rakutenUrl && (
                          <a className="underline" href={v.rakutenUrl} target="_blank" rel="noreferrer">
                            楽天
                          </a>
                        )}
                        {v.viatorUrl && (
                          <a className="underline" href={v.viatorUrl} target="_blank" rel="noreferrer">
                            Viator
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <div className="px-3 pb-3 text-xs text-neutral-600">
        使い方：入力したい行のラジオをON → 地図 or 左メニューからスポットを選択 → 名称/リンクが入ります。
      </div>
    </div>
  );
}
