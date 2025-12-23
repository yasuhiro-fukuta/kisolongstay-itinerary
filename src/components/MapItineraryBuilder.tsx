// src/components/MapItineraryBuilder.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";

import GoogleMapCanvas, { type AreaFocus, type MapFocus } from "@/components/GoogleMapCanvas";
import MapSearchBar from "@/components/MapSearchBar";
import LeftDrawer from "@/components/LeftDrawer";
import ItineraryPanel from "@/components/ItineraryPanel";
import AuthModal from "@/components/AuthModal";

import { auth } from "@/lib/firebaseClient";
import { makeEmptySpot, makeInitialItems, type ItineraryItem } from "@/lib/itinerary";
import {
  saveItinerary,
  listItineraries,
  loadItinerary,
  type SavedItineraryMeta,
} from "@/lib/itineraryStore";

import { loadLeftMenuData, type LeftMenuData, type MenuRow } from "@/lib/menuData";
import { loadSampleTourData, type SampleTourData } from "@/lib/sampleTourData";

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

function makeNonce() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

async function resolveMapUrlToLatLng(mapUrl: string): Promise<{ lat: number; lng: number } | null> {
  const url = String(mapUrl ?? "").trim();
  if (!url) return null;

  const res = await fetch("/api/resolve-map", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  const data = await res.json().catch(() => ({} as any));
  if (!res.ok) return null;

  if (data?.ok && typeof data.lat === "number" && typeof data.lng === "number") {
    return { lat: data.lat, lng: data.lng };
  }
  return null;
}

// v3+: カテゴリ→エリア表示対象URL（Google Map の「市区町村検索」っぽい挙動に寄せる）
// ※短縮URLは /api/resolve-map がリダイレクト追従して lat/lng を得る
const CATEGORY_AREA_URL: Record<string, string> = {
  "妻籠": "https://maps.app.goo.gl/3MLcRzBadQWnqLjCA",
  "蘭": "https://maps.app.goo.gl/3MLcRzBadQWnqLjCA",
  "南木曽": "https://maps.app.goo.gl/kdaGT1A8ZofXuNqJ7",
  "田立": "https://maps.app.goo.gl/e7TB2uYUSKTr4Ap17",
  "柿其": "https://maps.app.goo.gl/kdaGT1A8ZofXuNqJ7",
  "阿寺": "https://maps.app.goo.gl/A5U7GPnXnHHdfN8j9",
  "野尻": "https://maps.app.goo.gl/A5U7GPnXnHHdfN8j9",
  "与川": "https://maps.app.goo.gl/kdaGT1A8ZofXuNqJ7",
  "須原": "https://maps.app.goo.gl/VfpJTpDZnU9iVYzx5",
};

export default function MapItineraryBuilder() {
  // v3+: メニュー上/旅程下（スマホでの操作性強化）
  const [menuOpen, setMenuOpen] = useState(false);
  const [itineraryOpen, setItineraryOpen] = useState(false);
  const [itineraryExpanded, setItineraryExpanded] = useState(false); // 1/3 ↔ 2/3

  // 旅程を閉じたら、次回は必ず 1/3 表示からスタート
  useEffect(() => {
    if (!itineraryOpen) setItineraryExpanded(false);
  }, [itineraryOpen]);

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const selectedIdRef = useRef<string | null>(selectedItemId);
  useEffect(() => {
    selectedIdRef.current = selectedItemId;
  }, [selectedItemId]);

  const [items, setItems] = useState<ItineraryItem[]>(() => makeInitialItems());

  const [baseDate, setBaseDate] = useState<string>(() => yyyyMmDd(new Date()));
  const dayCount = useMemo(() => {
    const maxDay = Math.max(1, ...items.map((x) => Number(x.day) || 1));
    return maxDay;
  }, [items]);

  const dates = useMemo(() => Array.from({ length: dayCount }, (_, i) => addDays(baseDate, i)), [baseDate, dayCount]);

  const [focus, setFocus] = useState<MapFocus>({ kind: "none" });
  const [area, setArea] = useState<AreaFocus>({ kind: "none" });

  // Auth + 保存
  const [user, setUser] = useState<User | null>(null);
  const [authOpen, setAuthOpen] = useState(false);

  const [savedList, setSavedList] = useState<SavedItineraryMeta[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [saveAfterLogin, setSaveAfterLogin] = useState(false);

  // CSVデータ
  const [leftMenuData, setLeftMenuData] = useState<LeftMenuData | null>(null);
  const [sampleData, setSampleData] = useState<SampleTourData | null>(null);

  // resolve多重防止
  const resolvingRef = useRef(0);

  const userLabel = useMemo(() => {
    if (!user) return null;
    return user.displayName || user.email || "ログインユーザー";
  }, [user]);

  useEffect(() => {
    loadLeftMenuData()
      .then(setLeftMenuData)
      .catch((e) => console.error("left_menu.csv load failed:", e));

    loadSampleTourData()
      .then(setSampleData)
      .catch((e) => console.error("sampletour.csv load failed:", e));
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const list = await listItineraries(u.uid);
        setSavedList(list);
      } else {
        setSavedList([]);
      }
    });
  }, []);

  const refreshList = async (u: User) => {
    const list = await listItineraries(u.uid);
    setSavedList(list);
  };

  const doSave = async (u: User) => {
    if (saving) return;
    setSaving(true);
    setSaveToast(null);
    try {
      await saveItinerary(u.uid, dates, items);
      await refreshList(u);
      setSaveToast("保存しました");
      setTimeout(() => setSaveToast(null), 1500);
    } catch (e: any) {
      setSaveToast("保存に失敗しました\n" + String(e?.message ?? e ?? ""));
    } finally {
      setSaving(false);
    }
  };

  const onSaveClick = async () => {
    if (!user) {
      setSaveAfterLogin(true);
      setAuthOpen(true);
      return;
    }
    await doSave(user);
  };

  const fallbackTargetId = () => items[0]?.id ?? null;

  // 地図クリックで拾ったものを反映
  const onPickPlace = (itemId: string | null, place: any) => {
    const targetId = itemId ?? selectedItemId ?? fallbackTargetId();
    if (!targetId) return;

    setItems((prev) =>
      prev.map((it) =>
        it.id === targetId
          ? {
              ...it,
              name: String(place.name ?? it.name ?? ""),
              mapUrl: String(place.mapUrl ?? it.mapUrl ?? ""),
              placeId: String(place.placeId ?? it.placeId ?? ""),
              hpUrl: "",  // mapクリックでHP/OTAは自動付与しない
              otaUrl: "",
              lat: typeof place.lat === "number" ? place.lat : it.lat,
              lng: typeof place.lng === "number" ? place.lng : it.lng,
            }
          : it
      )
    );

    setSelectedItemId(targetId);
    setMenuOpen(false); // マップタップ時に閉じる要件の延長（ここで確実に閉じる）
  };

  // v3: 行を選んで、メニューから入れる
  const onSelectFromMenu = async (p: MenuRow) => {
    const targetId = selectedItemId ?? fallbackTargetId();
    if (!targetId) return;

    // UI即反映（Map/HP/OTA 空でも有効）
    setItems((prev) =>
      prev.map((it) =>
        it.id === targetId
          ? {
              ...it,
              name: p.title ?? it.name,
              mapUrl: p.mapUrl ?? "",
              hpUrl: p.hpUrl ?? "",
              otaUrl: p.otaUrl ?? "",
              placeId: "",
              lat: undefined,
              lng: undefined,
            }
          : it
      )
    );
    setSelectedItemId(targetId);

    // mapUrl があれば lat/lng を確定
    const myReq = ++resolvingRef.current;
    const loc = p.mapUrl ? await resolveMapUrlToLatLng(p.mapUrl) : null;
    if (myReq !== resolvingRef.current) return;

    if (loc) {
      setItems((prev) =>
        prev.map((it) => (it.id === targetId ? { ...it, lat: loc.lat, lng: loc.lng } : it))
      );
      setFocus({ kind: "latlng", lat: loc.lat, lng: loc.lng, nonce: makeNonce() });
    }
  };

  // 検索バー（任意：残す）
  const onSearch = (query: string) => {
    const q = query.trim();
    if (!q) return;

    const targetId = selectedItemId ?? fallbackTargetId();
    if (!targetId) return;

    setSelectedItemId(targetId);
    setFocus({ kind: "query", query: q, nonce: makeNonce() });
  };

  // v3: Day +（割り込み）
  const insertDayAfter = (day: number) => {
    const d = Math.max(1, Math.trunc(day || 1));
    const newDay = d + 1;
    const newItem = makeEmptySpot(newDay);

    setItems((prev) => {
      // まず d より後ろを繰り下げ
      const shifted = prev.map((it) => (it.day > d ? { ...it, day: it.day + 1 } : it));

      // day d の末尾の直後に挿入
      let insertAt = shifted.length;
      for (let i = shifted.length - 1; i >= 0; i--) {
        if (shifted[i].day === d) {
          insertAt = i + 1;
          break;
        }
      }

      const next = [...shifted];
      next.splice(insertAt, 0, newItem);
      return next;
    });

    setSelectedItemId(newItem.id);
    setItineraryOpen(true);
  };

  // v3: Day -（Dayごと削除、詰める）
  const removeDay = (day: number) => {
    const d = Math.max(1, Math.trunc(day || 1));

    setItems((prev) => {
      const removed = prev.filter((it) => it.day !== d);
      const shifted = removed.map((it) => (it.day > d ? { ...it, day: it.day - 1 } : it));

      if (!shifted.length) {
        const init = makeInitialItems(1, 1);
        setSelectedItemId(init[0]?.id ?? null);
        return init;
      }

      // selected が消えたら近い行を選ぶ
      const sel = selectedIdRef.current;
      const exists = sel ? shifted.some((it) => it.id === sel) : false;
      if (!exists) setSelectedItemId(shifted[0]?.id ?? null);

      return shifted;
    });
  };

  // v3: 行 +（割り込み）
  const insertRowAfter = (itemId: string) => {
    const newId = makeEmptySpot(1).id; // idだけ使う
    setItems((prev) => {
      const idx = prev.findIndex((it) => it.id === itemId);
      if (idx < 0) return prev;

      const day = prev[idx].day;
      const newItem = makeEmptySpot(day);
      (newItem as any).id = newId;

      const next = [...prev];
      next.splice(idx + 1, 0, newItem);
      setSelectedItemId(newItem.id);
      return next;
    });
    setItineraryOpen(true);
  };

  // v3: 行 -（削除。ただしそのDayの最後の1行は削除せず内容クリア）
  const removeRow = (itemId: string) => {
    setItems((prev) => {
      const idx = prev.findIndex((it) => it.id === itemId);
      if (idx < 0) return prev;

      const day = prev[idx].day;
      const dayItems = prev.filter((x) => x.day === day);

      // 最後の1行は「削除」せず内容クリア（行+/-が消えないように）
      if (dayItems.length <= 1) {
        const next = prev.map((it) =>
          it.id === itemId
            ? { ...it, name: "", mapUrl: "", hpUrl: "", otaUrl: "", placeId: "", lat: undefined, lng: undefined }
            : it
        );
        return next;
      }

      const next = prev.filter((it) => it.id !== itemId);

      // 選択行を消したら、近い行に寄せる
      const sel = selectedIdRef.current;
      if (sel === itemId) {
        const fallback = next[Math.min(idx, next.length - 1)]?.id ?? next[0]?.id ?? null;
        setSelectedItemId(fallback);
      }

      return next;
    });
  };

  // 保存済み旅程ロード
  const onLoadItinerary = async (id: string) => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    try {
      const loaded = await loadItinerary(user.uid, id);
      if (loaded.dates?.[0]) setBaseDate(String(loaded.dates[0]));
      setItems(loaded.items);
      setSaveToast("旅程をロードしました");
      setTimeout(() => setSaveToast(null), 1500);
      setItineraryOpen(true);
    } catch (e: any) {
      setSaveToast("ロードに失敗しました\n" + String(e?.message ?? e ?? ""));
    }
  };

  // v3: サンプルツアーロード（left_menu.csvの menuid を参照して反映）
  const onLoadSampleTour = async (tourName: string) => {
    if (!leftMenuData || !sampleData) return;

    const rows = sampleData.byTour.get(tourName) ?? [];
    if (!rows.length) return;

    const maxDay = Math.max(1, ...rows.map((r) => r.day));
    const maxRowByDay = new Map<number, number>();
    for (const r of rows) {
      maxRowByDay.set(r.day, Math.max(maxRowByDay.get(r.day) ?? 1, r.rownum));
    }

    // 必要な Day/行数 を先に確保
    const next: ItineraryItem[] = [];
    for (let d = 1; d <= maxDay; d++) {
      const need = Math.max(1, maxRowByDay.get(d) ?? 1);
      for (let i = 0; i < need; i++) next.push(makeEmptySpot(d));
    }

    // day -> rows の参照配列を作る
    const bucket = new Map<number, ItineraryItem[]>();
    for (const it of next) {
      if (!bucket.has(it.day)) bucket.set(it.day, []);
      bucket.get(it.day)!.push(it);
    }

    // menuid 参照で内容を流し込む
    for (const r of rows) {
      const target = bucket.get(r.day)?.[r.rownum - 1];
      const menu = leftMenuData.byId.get(r.menuid);
      if (!target || !menu) continue;

      target.name = menu.title ?? "";
      target.mapUrl = menu.mapUrl ?? "";
      target.hpUrl = menu.hpUrl ?? "";
      target.otaUrl = menu.otaUrl ?? "";
      target.placeId = "";
      target.lat = undefined;
      target.lng = undefined;
    }

    // mapUrl があるものは lat/lng を解決（無い行はそのまま有効）
    const cache = new Map<string, { lat: number; lng: number } | null>();
    await Promise.all(
      next.map(async (it) => {
        const u = String(it.mapUrl ?? "").trim();
        if (!u) return;
        if (!cache.has(u)) cache.set(u, await resolveMapUrlToLatLng(u));
        const loc = cache.get(u);
        if (loc) {
          it.lat = loc.lat;
          it.lng = loc.lng;
        }
      })
    );

    setItems(next);
    setSelectedItemId(next[0]?.id ?? null);
    setItineraryOpen(true);
    setMenuOpen(false);
    setSaveToast(`サンプルツアーをロードしました\n${tourName}`);
    setTimeout(() => setSaveToast(null), 1500);
  };

  // v3: カテゴリ押下 → 面をアクティブにする（旅程は触らない）
  const onCategoryPicked = async (category: string) => {
    const url = CATEGORY_AREA_URL[String(category ?? "").trim()];
    if (!url) {
      setArea({ kind: "none" });
      return;
    }

    const loc = await resolveMapUrlToLatLng(url);
    if (!loc) return;

    // ★仕様：カテゴリ選択 → 赤点線で囲む（まずは円近似）
    setArea({
      kind: "circle",
      lat: loc.lat,
      lng: loc.lng,
      radiusMeters: 4500, // 必要ならカテゴリ別に調整
      nonce: makeNonce(),
    });
  };

  const saveButtonText = user
    ? saving
      ? "保存中..."
      : saveToast === "保存しました"
        ? "保存しました"
        : "保存"
    : "会員登録して保存";

  return (
    <div className="h-dvh w-dvw overflow-hidden relative bg-neutral-950">
      <GoogleMapCanvas
        selectedItemId={selectedItemId}
        onPickPlace={onPickPlace}
        onMapTap={() => setMenuOpen(false)} // ★v3 要件3
        focus={focus}
        area={area}
        items={items}
      />

      {/* 検索（残す：必要なら後で移設しても良い） */}
      <MapSearchBar onSearch={onSearch} />

      {/* v3+: 旅程（下から出る） */}
      <div
        className={[
          "absolute inset-x-0 bottom-0 z-[65]",
          itineraryExpanded ? "h-[66vh]" : "h-[33vh]",
          "transition-transform duration-300 ease-out",
          itineraryOpen ? "translate-y-0 pointer-events-auto" : "translate-y-full pointer-events-none",
        ].join(" ")}
      >
        <div className="h-full rounded-t-2xl bg-neutral-950/90 border border-neutral-800 shadow-xl overflow-hidden">
          <ItineraryPanel
            items={items}
            baseDate={baseDate}
            onChangeBaseDate={setBaseDate}
            selectedItemId={selectedItemId}
            onSelectItem={(id) => setSelectedItemId(id)}
            onInsertDayAfter={insertDayAfter}
            onRemoveDay={removeDay}
            onInsertRowAfter={insertRowAfter}
            onRemoveRow={removeRow}
            onSave={onSaveClick}
            saveButtonText={saveButtonText}
            saveDisabled={saving}
            userLabel={userLabel}
            expanded={itineraryExpanded}
            onToggleExpand={() => setItineraryExpanded((v) => !v)}
          />
        </div>
      </div>

      {/* v3+: メニュー（上から出る） */}
      {leftMenuData ? (
        <LeftDrawer
          open={menuOpen}
          onOpenChange={setMenuOpen}
          categories={leftMenuData.categories}
          byCategory={leftMenuData.byCategory}
          onCategoryPicked={onCategoryPicked}
          onSelectPlace={onSelectFromMenu}
          sampleTours={sampleData?.tours ?? []}
          onLoadSampleTour={onLoadSampleTour}
          savedItineraries={savedList}
          onLoadItinerary={onLoadItinerary}
          userLabel={userLabel}
          onRequestLogin={() => setAuthOpen(true)}
        />
      ) : null}

      {/* v3: 右下トグルボタン（旅程） */}
      <button
        onClick={() => setItineraryOpen((v) => !v)}
        className="absolute right-4 bottom-4 z-[80] rounded-full bg-neutral-950/80 backdrop-blur shadow-lg border border-neutral-800 w-12 h-12 grid place-items-center text-neutral-100"
        title="旅程"
      >
        📝
      </button>

      {/* v3: 右下トグルボタン（メニュー）※上に配置 */}
      <button
        onClick={() => setMenuOpen((v) => !v)}
        className="absolute right-4 bottom-20 z-[80] rounded-full bg-neutral-950/80 backdrop-blur shadow-lg border border-neutral-800 w-12 h-12 grid place-items-center text-neutral-100"
        title="メニュー"
      >
        {menuOpen ? "×" : "≡"}
      </button>

      {saveToast ? (
        <div className="absolute left-1/2 top-24 -translate-x-1/2 z-[90] pointer-events-none">
          <div className="rounded-xl bg-neutral-950/80 border border-neutral-800 shadow px-3 py-2 text-xs whitespace-pre-wrap text-neutral-100 backdrop-blur pointer-events-auto">
            {saveToast}
          </div>
        </div>
      ) : null}

      <AuthModal
        open={authOpen}
        onClose={() => {
          setAuthOpen(false);
          setSaveAfterLogin(false);
        }}
        onSuccess={(u) => {
          setAuthOpen(false);
          refreshList(u);
          if (saveAfterLogin) {
            setSaveAfterLogin(false);
            doSave(u);
          }
        }}
      />
    </div>
  );
}
