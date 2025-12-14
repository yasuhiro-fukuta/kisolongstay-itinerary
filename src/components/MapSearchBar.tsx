"use client";

import { useState } from "react";

export default function MapSearchBar({
  onSearch,
}: {
  onSearch: (query: string) => void;
}) {
  const [value, setValue] = useState("");

  const submit = () => {
    const q = value.trim();
    console.log("[MapSearchBar] submit:", q);
    if (!q) return;
    onSearch(q);
  };

  return (
    <div className="absolute left-1/2 top-4 z-[50] -translate-x-1/2 pointer-events-auto">
      <div className="flex items-center gap-2 rounded-full bg-neutral-950/80 backdrop-blur shadow-lg border border-neutral-800 px-3 py-2 min-w-[260px] max-w-[420px]">
        <span className="text-neutral-300 text-sm">🔍</span>

        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="場所名・駅名・住所で検索"
          className="flex-1 bg-transparent outline-none text-sm text-neutral-100 placeholder:text-neutral-500"
        />

        <button
          onClick={submit}
          className="px-3 py-1 rounded-full bg-white text-black text-xs font-semibold"
        >
          検索
        </button>
      </div>
    </div>
  );
}
