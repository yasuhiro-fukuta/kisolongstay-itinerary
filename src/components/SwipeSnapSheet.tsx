"use client";

import React, { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { animate, motion, useMotionValue } from "framer-motion";

export type SheetAnchor = "top" | "bottom";
export type SheetSnap = 0 | 1 | 2;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function nearestIndex(v: number, candidates: number[]) {
  let best = 0;
  let bestDist = Math.abs(v - candidates[0]);
  for (let i = 1; i < candidates.length; i++) {
    const d = Math.abs(v - candidates[i]);
    if (d < bestDist) {
      best = i;
      bestDist = d;
    }
  }
  return best;
}

export type SwipeSnapSheetProps = {
  anchor: SheetAnchor;
  snap: SheetSnap;
  onSnapChange: (next: SheetSnap) => void;
  /** Visible height when collapsed (handle area). */
  handleHeight?: number;
  /** Visible height ratio for the 1/3 stop. */
  midRatio?: number;
  /** Visible height ratio for the 2/3 stop. */
  maxRatio?: number;
  /**
   * Extra offset from the viewport edge (px).
   *
   * Useful on mobile to avoid overlapping fixed UI such as the search bar.
   * - anchor="top"    -> applied to the sheet's `top`
   * - anchor="bottom" -> applied to the sheet's `bottom`
   */
  topOffset?: number;
  bottomOffset?: number;
  className?: string;
  /** Additional classes for the content container. */
  contentClassName?: string;
  children: ReactNode;
};

/**
 * Mobile swipe sheet with 3 snap points:
 * - snap=0: collapsed (edge handle only)
 * - snap=1: ~1/3 screen
 * - snap=2: ~2/3 screen
 *
 * The sheet height follows the finger continuously while dragging.
 * On release, it snaps (spring) to the nearest snap point.
 */
export default function SwipeSnapSheet({
  anchor,
  snap,
  onSnapChange,
  handleHeight = 32,
  midRatio = 1 / 3,
  maxRatio = 2 / 3,
  topOffset = 0,
  bottomOffset = 0,
  className = "",
  contentClassName = "",
  children,
}: SwipeSnapSheetProps) {
  // This component is only used on mobile (rendered client-side). Using window here is safe.
  const [vh, setVh] = useState(() => {
    if (typeof window === "undefined") return 800;
    return window.visualViewport?.height ?? window.innerHeight;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const vv = window.visualViewport;
    const update = () => {
      const h = vv?.height ?? window.innerHeight;
      setVh(h);
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
    };
  }, []);

  const edgeOffsetPx = anchor === "top" ? topOffset : bottomOffset;
  const { minH, midH, maxH, snapHeights } = useMemo(() => {
    const available = Math.max(handleHeight, vh - edgeOffsetPx);

    const maxHpx = Math.max(handleHeight, Math.round(available * maxRatio));
    const midHpx = Math.max(handleHeight, Math.round(available * midRatio));
    const minHpx = Math.max(16, Math.round(handleHeight));

    // Ensure ordering: min <= mid <= max
    const sorted = [minHpx, midHpx, maxHpx].sort((a, b) => a - b);
    return {
      minH: sorted[0],
      midH: sorted[1],
      maxH: sorted[2],
      snapHeights: sorted,
    };
  }, [edgeOffsetPx, handleHeight, maxRatio, midRatio, vh]);

  const height = useMotionValue(snapHeights[snap] ?? minH);

  // Keep the sheet height in sync with the controlled snap.
  useEffect(() => {
    const target = snapHeights[snap] ?? minH;
    animate(height, target, { type: "spring", stiffness: 420, damping: 42 });
  }, [height, minH, snap, snapHeights]);

  const startYRef = useRef(0);
  const startHRef = useRef(0);
  const pointerIdRef = useRef<number | null>(null);
  const didDragRef = useRef(false);

  const dir = anchor === "top" ? 1 : -1; // top: drag down => +height, bottom: drag up => +height

  const endGesture = (commit = true) => {
    pointerIdRef.current = null;

    const currentH = height.get();
    const idx = nearestIndex(currentH, snapHeights);
    const nextSnap = idx as SheetSnap;
    const targetH = snapHeights[idx] ?? minH;

    // Always animate to an exact stop, even if snap doesn't change.
    animate(height, targetH, { type: "spring", stiffness: 420, damping: 42 });

    if (commit) onSnapChange(nextSnap);

    // Reset drag flag after the click event would fire.
    window.setTimeout(() => {
      didDragRef.current = false;
    }, 0);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    pointerIdRef.current = e.pointerId;
    startYRef.current = e.clientY;
    startHRef.current = height.get();
    didDragRef.current = false;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current == null || e.pointerId !== pointerIdRef.current) return;

    const deltaY = e.clientY - startYRef.current;
    if (Math.abs(deltaY) > 3) didDragRef.current = true;

    const nextH = clamp(startHRef.current + dir * deltaY, minH, maxH);
    height.set(nextH);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current == null || e.pointerId !== pointerIdRef.current) return;
    (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    endGesture(true);
  };

  const onPointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current == null || e.pointerId !== pointerIdRef.current) return;
    try {
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    endGesture(true);
  };

  // Optional: tap the handle to toggle collapsed <-> mid.
  const onHandleClick = () => {
    if (didDragRef.current) return;
    if (snap === 0) onSnapChange(1);
    else onSnapChange(0);
  };

  const basePos = "absolute inset-x-0";
  const handlePos = anchor === "top" ? "absolute inset-x-0 bottom-0" : "absolute inset-x-0 top-0";
  const contentPad = anchor === "top" ? { paddingBottom: minH } : { paddingTop: minH };

  const edgeStyle =
    anchor === "top"
      ? { top: `calc(env(safe-area-inset-top, 0px) + ${topOffset}px)` }
      : { bottom: `calc(env(safe-area-inset-bottom, 0px) + ${bottomOffset}px)` };

  return (
    <motion.section
      className={`${basePos} ${className}`}
      style={{ height, ...edgeStyle }}
      aria-hidden={false}
    >
      <div className="relative w-full h-full">
        {/* content */}
        <div
          className={`w-full h-full ${contentClassName}`}
          style={contentPad}
        >
          {children}
        </div>

        {/* swipe handle */}
        <div
          className={`${handlePos} flex items-center justify-center select-none`}
          style={{ height: minH, touchAction: "none" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onClick={onHandleClick}
          role="button"
          tabIndex={0}
          aria-label="Swipe panel"
        >
          <div className="w-14 h-1 rounded-full bg-neutral-100/70" />
        </div>
      </div>
    </motion.section>
  );
}
