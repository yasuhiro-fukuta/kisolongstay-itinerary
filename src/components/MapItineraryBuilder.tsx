"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";

import GoogleMapCanvas, { PickedPlace } from "@/components/GoogleMapCanvas";
import ItineraryPanel from "@/components/ItineraryPanel";
import ChatCorner from "@/components/ChatCorner";
import LeftDrawer from "@/components/LeftDrawer";
import MapSearchBar from "@/components/MapSearchBar";
import AuthModal from "@/components/AuthModal";

import { auth } from "@/lib/firebaseClient";
import { makeInitialRows, type RowId, type RowValue } from "@/lib/itinerary";
import type { SavedPlace } from "@/lib/savedLists";
import {
  saveItinerary,
  listItineraries,
  loadItinerary,
  type SavedItineraryMeta,
} from "@/lib/itineraryStore";

function yyyyMmDd(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate()
  )}`;
}

export default function MapItineraryBuilder() {
  const [selectedRowId, setSelectedRowId] = useState<RowId | null>("1:breakfast");
  const [rows, setRows] = useState<Record<RowId, RowValue>>(() => makeInitialRows());

  const [dates, setDates] = useState<string[]>(() => {
    const base = new Date();
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return yyyyMmDd(d);
    });
  });

  const [focusName, setFocusName] = useState<string | null>(null);

  // 認証と保存まわり
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

  // 行に書き込む共通関数
  const applyPlaceToRow = (rowId: RowId, place: PickedPlace) => {
    setRows((prev) => ({
      ...prev,
      [rowId]: {
        ...prev[rowId],
        name: place.name ?? prev[rowId].name,
        mapUrl: place.mapUrl ?? prev[rowId].mapUrl,
        hpUrl: place.website ?? prev[rowId].hpUrl,
        bookingUrl: place.bookingUrl ?? prev[rowId].bookingUrl,
        airbnbUrl: place.airbnbUrl ?? prev[rowId].airbnbUrl,
        rakutenUrl: place.rakutenUrl ?? prev[rowId].rakutenUrl,
        viatorUrl: place.viatorUrl ?? prev[rowId].viatorUrl,
        placeId: place.placeId ?? prev[rowId].placeId,
        price: prev[rowId].price,
      },
    }));
  };

  // マップクリックからのコールバック
  const onPickPlace = (rowId: RowId | null, place: PickedPlace) => {
    const target = rowId ?? selectedRowId;
    if (!target) return;
    applyPlaceToRow(target, place);
  };

  // 認証の監視
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

  const refreshList = async (u: User) => {
    const list = await listItineraries(u.uid);
    setSavedList(list);
  };

  const doSave = async (u: User) => {
    if (saving) return;
    setSaving(true);
    setSaveToast(null);
    try {
      await saveItinerary(u.uid, dates, rows);
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

  // 左ドロワーからスポットを選んだとき
  const onSelectFromDrawer = (p: SavedPlace) => {
    setFocusName(p.name);
    if (selectedRowId) {
      applyPlaceToRow(selectedRowId, {
        name: p.name,
        mapUrl: p.mapUrl,
        website: p.officialUrl,
        bookingUrl: p.bookingUrl,
        airbnbUrl: p.airbnbUrl,
        rakutenUrl: p.rakutenUrl,
        viatorUrl: p.viatorUrl,
      });
    }
  };

  // 検索バー
  const onSearch = (query: string) => {
    setFocusName(query);
    if (selectedRowId) {
      applyPlaceToRow(selectedRowId, { name: query });
    }
  };

  // 旅程をロード
  const onLoadItinerary = async (id: string) => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    try {
      const loaded = await loadItinerary(user.uid, id);
      if (loaded.dates?.length) setDates(loaded.dates);
      setRows(loaded.rows);
      setSaveToast("旅程をロードしました");
      setTimeout(() => setSaveToast(null), 1500);
    } catch (e: any) {
      setSaveToast("ロードに失敗しました\n" + String(e?.message ?? e ?? ""));
    }
  };

  const saveButtonText = user
    ? saving
      ? "保存中..."
      : saveToast === "保存しました"
        ? "保存しました"
        : "保存"
    : "会員登録して保存";

  return (
    <div className="h-dvh w-dvw overflow-hidden relative">
      <GoogleMapCanvas
        selectedRowId={selectedRowId}
        onPickPlace={onPickPlace}
        focusName={focusName}
      />

      <LeftDrawer
        onSelectPlace={onSelectFromDrawer}
        savedItineraries={savedList}
        onLoadItinerary={onLoadItinerary}
        userLabel={userLabel}
        onRequestLogin={() => setAuthOpen(true)}
      />

      <MapSearchBar onSearch={onSearch} />

      <div className="pointer-events-none absolute inset-0">
        <div className="pointer-events-auto absolute right-4 top-4 w-[620px] max-w-[92vw]">
          <ItineraryPanel
            rows={rows}
            dates={dates}
            selectedRowId={selectedRowId}
            onSelectRow={setSelectedRowId}
            onChangeDate={(dayIdx0, v) =>
              setDates((prev) => prev.map((x, i) => (i === dayIdx0 ? v : x)))
            }
            onChangeRow={(id, patch) =>
              setRows((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }))
            }
            onSave={onSaveClick}
            saveButtonText={saveButtonText}
            saveDisabled={saving}
            userLabel={userLabel}
          />

          {saveToast && (
            <div className="mt-2 rounded-xl bg-white/90 border border-neutral-200 shadow px-3 py-2 text-xs whitespace-pre-wrap">
              {saveToast}
            </div>
          )}
        </div>

        <div className="pointer-events-auto absolute bottom-4 right-4 w-[620px] max-w-[92vw] h-[28vh] min-h-[220px]">
          <ChatCorner />
        </div>
      </div>

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
