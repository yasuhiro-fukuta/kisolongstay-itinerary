"use client";

import { useState } from "react";

export default function MapSearchBar({
  onSearch,
}: {
  onSearch: (query: string) => void;
}) {
  const [value, setValue] = useState("");

  const triggerSearch = () => {
    const q = value.trim();
    if (!q) return;
    onSearch(q);
  };

  return (
    <div className="absolute left-1/2 top-4 z-[45] -translate-x-1/2 pointer-events-auto">
      <div className="flex items-center gap-2 rounded-full bg-white/95 shadow-lg border border-neutral-200 px-3 py-1.5 min-w-[260px] max-w-[420px]">
        <span className="text-neutral-500 text-sm">🔍</span>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              triggerSearch();
            }
          }}
          placeholder="場所名・店名・住所で検索"
          className="flex-1 border-none outline-none text-sm bg-transparent"
        />
        <button
          onClick={triggerSearch}
          className="px-3 py-1 rounded-full bg-neutral-900 text-white text-xs"
        >
          検索
        </button>
      </div>
    </div>
  );
}
