"use client";

import {
  ReactNode,
  useLayoutEffect,
  useRef,
  useState,
  MutableRefObject,
} from "react";
import { animate, motion, useDragControls, useMotionValue } from "framer-motion";
import { useI18n } from "@/lib/i18n";

type Edge = "right" | "bottom";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function useAxisSize(ref: MutableRefObject<HTMLElement | null>, edge: Edge): number {
  const [size, setSize] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      setSize(edge === "right" ? rect.width : rect.height);
    };

    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [edge, ref]);

  return size;
}

export default function EdgeSheet({
  edge,
  open,
  onOpenChange,
  handleLabel,
  handleSize = 44,
  className = "",
  children,
}: {
  edge: Edge;
  open: boolean;
  onOpenChange: (next: boolean) => void;
  handleLabel: string;
  handleSize?: number;
  className?: string;
  children: ReactNode;
}) {
  const { t } = useI18n();

  const sheetRef = useRef<HTMLElement | null>(null);
  const dragControls = useDragControls();
  const axisSize = useAxisSize(sheetRef, edge);

  const maxOffset = Math.max(0, axisSize - handleSize);
  const offset = useMotionValue(0);

  const draggingRef = useRef(false);

  useLayoutEffect(() => {
    const target = open ? 0 : maxOffset;
    const controls = animate(offset, target, {
      type: "spring",
      stiffness: 420,
      damping: 42,
    });
    return () => controls.stop();
  }, [open, maxOffset, offset]);

  const dragAxis: "x" | "y" = edge === "right" ? "x" : "y";

  const finishByPosition = () => {
    if (maxOffset <= 0) return;
    const v = clamp(offset.get(), 0, maxOffset);
    const nextOpen = v < maxOffset * 0.5;
    onOpenChange(nextOpen);
  };

  return (
    <motion.div
      ref={sheetRef as MutableRefObject<HTMLDivElement | null>}
      className={[
        "pointer-events-auto relative flex flex-col",
        "rounded-2xl border border-neutral-800 bg-neutral-950/80 backdrop-blur-xl shadow-2xl",
        className,
      ].join(" ")}
      drag={maxOffset > 0 ? dragAxis : false}
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      dragElastic={0}
      dragConstraints={
        maxOffset > 0
          ? dragAxis === "x"
            ? { left: 0, right: maxOffset }
            : { top: 0, bottom: maxOffset }
          : undefined
      }
      style={dragAxis === "x" ? { x: offset } : { y: offset }}
      onDragStart={() => {
        draggingRef.current = true;
      }}
      onDragEnd={() => {
        draggingRef.current = false;
        finishByPosition();
      }}
    >
      {/* handle */}
      <div
        className={[
          "absolute z-10",
          edge === "right" ? "left-0 top-0 bottom-0 border-r" : "left-0 right-0 top-0 border-b",
          "border-neutral-800 bg-neutral-900/70",
          "flex items-center justify-center",
          "cursor-grab active:cursor-grabbing select-none",
        ].join(" ")}
        style={edge === "right" ? { width: handleSize } : { height: handleSize }}
        onPointerDown={(e) => dragControls.start(e)}
        onClick={(e) => {
          e.stopPropagation();
          if (draggingRef.current) return;
          onOpenChange(!open);
        }}
        title={open ? t("sheet.hide") : t("sheet.show")}
      >
        {edge === "right" ? (
          <div className="h-full w-full flex flex-col items-center justify-center gap-2">
            <div className="text-neutral-200 text-lg leading-none">{open ? "›" : "‹"}</div>
            <div
              className="text-[10px] tracking-widest text-neutral-200"
              style={{ writingMode: "vertical-rl" }}
            >
              {handleLabel}
            </div>
          </div>
        ) : (
          <div className="w-full flex items-center justify-center gap-2">
            <div className="text-neutral-200 text-base leading-none">{open ? "˅" : "˄"}</div>
            <div className="text-xs font-semibold text-neutral-200">{handleLabel}</div>
          </div>
        )}
      </div>

      {/* content */}
      <div
        className="h-full w-full overflow-y-auto"
        style={edge === "right" ? { paddingLeft: handleSize } : { paddingTop: handleSize }}
      >
        {children}
      </div>
    </motion.div>
  );
}
