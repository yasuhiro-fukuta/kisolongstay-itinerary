"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";

import GoogleMapCanvas, { type PickedPlace } from "@/components/GoogleMapCanvas";
<<<<<<< HEAD
=======
import MapSearchBar from "@/components/MapSearchBar";
import LeftDrawer from "@/components/LeftDrawer";
>>>>>>> df076ec (stabilized version secrets removed)
import ItineraryPanel from "@/components/ItineraryPanel";
import ChatCorner from "@/components/ChatCorner";
import AuthModal from "@/components/AuthModal";

import { auth } from "@/lib/firebaseClient";
<<<<<<< HEAD
import {
  makeInitialItems,
  type DayIndex,
  type EntryType,
  type ItineraryItem,
} from "@/lib/itinerary";
=======
import { makeInitialItems, type DayIndex, type EntryType, type ItineraryItem } from "@/lib/itinerary";
>>>>>>> df076ec (stabilized version secrets removed)
import type { SavedPlace } from "@/lib/savedLists";
import { saveItinerary, listItineraries, loadItinerary, type SavedItineraryMeta } from "@/lib/itineraryStore";

function yyyyMmDd(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

<<<<<<< HEAD
function useIsMobile(breakpointPx = 768) {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpointPx}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [breakpointPx]);

  return isMobile;
}

function makeItemId(day: DayIndex, type: EntryType) {
  const suffix =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (crypto as any).randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

=======
function makeItemId(day: DayIndex, type: EntryType) {
  const suffix =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
>>>>>>> df076ec (stabilized version secrets removed)
  return `${day}:${type}:${suffix}`;
}

function buildDetailFromPickedPlace(p: PickedPlace) {
  const parts = [p.website, p.bookingUrl, p.airbnbUrl, p.rakutenUrl, p.viatorUrl]
    .map((x) => String(x ?? "").trim())
    .filter(Boolean);
  return parts.join("\n");
}

function buildDetailFromSavedPlace(p: SavedPlace) {
  const parts = [p.officialUrl, p.bookingUrl, p.airbnbUrl, p.rakutenUrl, p.viatorUrl]
    .map((x) => String(x ?? "").trim())
    .filter(Boolean);
  return parts.join("\n");
<<<<<<< HEAD
}

export default function MapItineraryBuilder() {
  const isMobile = useIsMobile();

  const [selectedItemId, setSelectedItemId] = useState<string | null>("1:spot:0");
=======
}

// ★ここが重要：毎回必ず変わる token を作る
function makeFocusToken(query: string) {
  const nonce =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;
  return `${query}|||${nonce}`;
}

export default function MapItineraryBuilder() {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
>>>>>>> df076ec (stabilized version secrets removed)
  const [items, setItems] = useState<ItineraryItem[]>(() => makeInitialItems());

  const [dates, setDates] = useState<string[]>(() => {
    const base = new Date();
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return yyyyMmDd(d);
    });
  });

  const [focusName, setFocusName] = useState<string | null>(null);

<<<<<<< HEAD
  // ドロワー開閉
  const [itineraryOpen, setItineraryOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    if (isMobile == null) return;
    if (isMobile) {
      setItineraryOpen(true);
      setChatOpen(false);
    } else {
      setItineraryOpen(true);
      setChatOpen(false);
    }
  }, [isMobile]);

  // 認証と保存
=======
  const [itineraryOpen, setItineraryOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);

>>>>>>> df076ec (stabilized version secrets removed)
  const [user, setUser] = useState<User | null>(null);
  const [authOpen, setAuthOpen] = useState(false);

  const [savedList, setSavedList] = useState<SavedItineraryMeta[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [saveAfterLogin, setSaveAfterLogin] = useState(false);

  const userLabel = useMemo(() => {
    if (!user) return null;
    return user.displayName || user.email || "ログインユーザー";
  }, [user]);

<<<<<<< HEAD
=======
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

>>>>>>> df076ec (stabilized version secrets removed)
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

<<<<<<< HEAD
  // 認証監視
  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const list = await listItineraries(u.uid);
        setSavedList(list);

        if (saveAfterLogin) {
          setSaveAfterLogin(false);
          await doSave(u);
        }
      } else {
        setSavedList([]);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveAfterLogin]);

  // 行に書き込む
  const applyPlaceToItem = (itemId: string, place: PickedPlace) => {
    const detailCandidate = buildDetailFromPickedPlace(place);

    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        return {
          ...it,
          name: place.name ?? it.name,
          mapUrl: place.mapUrl ?? it.mapUrl,
          placeId: place.placeId ?? it.placeId,
          detail: it.detail ? it.detail : detailCandidate,
        };
      })
    );
  };

  const onPickPlace = (itemId: string | null, place: PickedPlace) => {
    const target = itemId ?? selectedItemId;
    if (!target) return;
    applyPlaceToItem(target, place);
    if (isMobile) setItineraryOpen(true);
  };

  // 左ドロワーからスポット選択
  const onSelectFromDrawer = (p: SavedPlace) => {
    setFocusName(p.name);
    const target = selectedItemId;
    if (!target) return;

    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== target) return it;
        const detailCandidate = buildDetailFromSavedPlace(p);
        return {
          ...it,
          name: p.name ?? it.name,
          mapUrl: p.mapUrl ?? it.mapUrl,
          detail: it.detail ? it.detail : detailCandidate,
        };
      })
    );

    if (isMobile) setItineraryOpen(true);
=======





const onPickPlace = (itemId: string | null, place: PickedPlace) => {
  // ★ 未選択なら最初の行に入れる
  const targetId =
    itemId ??
    items.find((i) => i.day === 1 && i.type === "spot")?.id;

  if (!targetId) return;

  setItems((prev) =>
    prev.map((it) =>
      it.id === targetId
        ? {
            ...it,
            name: place.name ?? it.name,
            mapUrl: place.mapUrl ?? it.mapUrl,
            placeId: place.placeId ?? it.placeId,
          }
        : it
    )
  );

  setSelectedItemId(targetId);
};




  const onSelectFromDrawer = (p: SavedPlace) => {
    const token = makeFocusToken(p.name);
    console.log("[MapItineraryBuilder] focus token(drawer):", token);
    setFocusName(token);

    const target = selectedItemId;
    if (!target) return;

    const detailCandidate = buildDetailFromSavedPlace(p);

    setItems((prev) =>
      prev.map((it) =>
        it.id === target
          ? {
              ...it,
              name: p.name ?? it.name,
              mapUrl: p.mapUrl ?? it.mapUrl,
              detail: it.detail ? it.detail : detailCandidate,
            }
          : it
      )
    );
>>>>>>> df076ec (stabilized version secrets removed)
  };

  const onSearch = (query: string) => {
<<<<<<< HEAD
    setFocusName(query);
    if (!selectedItemId) return;

    setItems((prev) =>
      prev.map((it) => (it.id === selectedItemId ? { ...it, name: query } : it))
    );

    if (isMobile) setItineraryOpen(true);
  };

  // 旅程ロード
=======
    const token = makeFocusToken(query);
    console.log("[MapItineraryBuilder] onSearch:", query, "token:", token);
    setFocusName(token);

    if (selectedItemId) {
      setItems((prev) =>
        prev.map((it) => (it.id === selectedItemId ? { ...it, name: query } : it))
      );
    }
  };

>>>>>>> df076ec (stabilized version secrets removed)
  const onLoadItinerary = async (id: string) => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    try {
      const loaded = await loadItinerary(user.uid, id);
      if (loaded.dates?.length) setDates(loaded.dates);
      setItems(loaded.items);
      setSaveToast("旅程をロードしました");
      setTimeout(() => setSaveToast(null), 1500);
      if (isMobile) setItineraryOpen(true);
    } catch (e: any) {
      setSaveToast("ロードに失敗しました\n" + String(e?.message ?? e ?? ""));
    }
  };

<<<<<<< HEAD
  // + で同カテゴリ行を追加
  const onAddItem = (day: DayIndex, type: EntryType) => {
    const newId = makeItemId(day, type);

=======
  const onAddItem = (day: DayIndex, type: EntryType) => {
    const newId = makeItemId(day, type);
>>>>>>> df076ec (stabilized version secrets removed)
    setItems((prev) => {
      const newItem: ItineraryItem = {
        id: newId,
        day,
        type,
        name: "",
        detail: "",
        price: "",
        placeId: "",
        mapUrl: "",
      };

      let insertAt = prev.length;
      for (let i = prev.length - 1; i >= 0; i--) {
        if (prev[i].day === day && prev[i].type === type) {
          insertAt = i + 1;
          break;
        }
      }
      const next = [...prev];
      next.splice(insertAt, 0, newItem);
      return next;
    });

    setSelectedItemId(newId);
<<<<<<< HEAD
    if (isMobile) setItineraryOpen(true);
=======
    setItineraryOpen(true);
>>>>>>> df076ec (stabilized version secrets removed)
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
<<<<<<< HEAD
      {/* 背景：地図 */}
=======
>>>>>>> df076ec (stabilized version secrets removed)
      <GoogleMapCanvas
        selectedItemId={selectedItemId}
        onPickPlace={onPickPlace}
        focusName={focusName}
      />

      {/* 左上メニュー（既存そのまま） */}
      <LeftDrawer
        onSelectPlace={onSelectFromDrawer}
        savedItineraries={savedList}
        onLoadItinerary={onLoadItinerary}
        userLabel={userLabel}
        onRequestLogin={() => setAuthOpen(true)}
      />

      {/* 上中央 検索バー */}
      <MapSearchBar onSearch={onSearch} />

<<<<<<< HEAD
      {/* 右上：Itinerary パネル表示ボタン */}
      <button
        onClick={() => setItineraryOpen((v) => !v)}
        className="absolute right-4 top-4 z-[70] rounded-full bg-neutral-950/80 backdrop-blur shadow-lg border border-neutral-800 w-10 h-10 grid place-items-center text-neutral-100"
        title="旅程パネル"
=======
      <button
        onClick={() => setItineraryOpen((v) => !v)}
        className="absolute right-4 top-4 z-[70] rounded-full bg-neutral-950/80 backdrop-blur shadow-lg border border-neutral-800 w-10 h-10 grid place-items-center text-neutral-100"
        title="旅程"
>>>>>>> df076ec (stabilized version secrets removed)
      >
        📝
      </button>

<<<<<<< HEAD
      {/* 右オーバーレイ：Itinerary（LeftDrawerと同じ構造で右出し） */}
=======
>>>>>>> df076ec (stabilized version secrets removed)
      {itineraryOpen && (
        <div className="absolute inset-0 z-[60] pointer-events-auto">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setItineraryOpen(false)}
          />
          <div className="absolute right-0 top-0 h-full w-[560px] max-w-[92vw] bg-neutral-950/95 backdrop-blur shadow-xl border-l border-neutral-800 overflow-auto">
            <ItineraryPanel
              items={items}
              dates={dates}
              selectedItemId={selectedItemId}
              onSelectItem={(id) => setSelectedItemId(id)}
              onChangeDate={(dayIdx0, v) =>
                setDates((prev) => prev.map((x, i) => (i === dayIdx0 ? v : x)))
              }
              onChangeItem={(id, patch) =>
                setItems((prev) =>
                  prev.map((it) => (it.id === id ? { ...it, ...patch } : it))
                )
              }
              onAddItem={onAddItem}
              onSave={onSaveClick}
              saveButtonText={saveButtonText}
              saveDisabled={saving}
              userLabel={userLabel}
            />
          </div>
        </div>
      )}

<<<<<<< HEAD
      {/* 右下：チャットボタン ＋ ポップアップ */}
=======
>>>>>>> df076ec (stabilized version secrets removed)
      <button
        onClick={() => setChatOpen((v) => !v)}
        className="absolute right-4 bottom-4 z-[70] rounded-full bg-neutral-950/80 backdrop-blur shadow-lg border border-neutral-800 w-10 h-10 grid place-items-center text-neutral-100"
        title="チャット"
      >
        💬
      </button>

      {chatOpen && (
<<<<<<< HEAD
        <div className="absolute right-4 bottom-16 z-[65] w-[420px] max-w-[92vw] h-[280px]">
=======
        <div className="absolute right-4 bottom-16 z-[65] w-[420px] max-w-[92vw] h-[280px] pointer-events-auto">
>>>>>>> df076ec (stabilized version secrets removed)
          <div className="h-full rounded-2xl bg-neutral-950/90 border border-neutral-800 shadow-xl overflow-hidden">
            <ChatCorner />
          </div>
        </div>
      )}
<<<<<<< HEAD
=======

      {saveToast && (
        <div className="absolute left-1/2 top-20 -translate-x-1/2 z-[80] pointer-events-none">
          <div className="rounded-xl bg-neutral-950/80 border border-neutral-800 shadow px-3 py-2 text-xs whitespace-pre-wrap text-neutral-100 backdrop-blur pointer-events-auto">
            {saveToast}
          </div>
        </div>
      )}
>>>>>>> df076ec (stabilized version secrets removed)

      {/* トースト */}
      {saveToast && (
        <div className="absolute left-1/2 top-20 -translate-x-1/2 z-[80]">
          <div className="rounded-xl bg-neutral-950/80 border border-neutral-800 shadow px-3 py-2 text-xs whitespace-pre-wrap text-neutral-100 backdrop-blur">
            {saveToast}
          </div>
        </div>
      )}

      {/* 認証モーダル */}
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
