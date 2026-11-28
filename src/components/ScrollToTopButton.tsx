"use client";

import React, { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { ArrowUp } from "lucide-react";

interface ScrollToTopButtonProps {
  threshold?: number;
  hiddenWhenModalOpen?: boolean;
  positionClassName?: string;
}

const emptySubscribe = () => () => {};

export function ScrollToTopButton({
  threshold = 80,
  hiddenWhenModalOpen = false,
  positionClassName = "bottom-5 right-5",
}: ScrollToTopButtonProps) {
  const [visible, setVisible] = useState(false);
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > threshold);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  if (!isClient) return null;

  const shouldShow = visible && !hiddenWhenModalOpen;

  return createPortal(
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Kembali ke atas"
      title="Kembali ke atas"
      className={`fixed ${positionClassName} z-30 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/95 dark:bg-[#111827]/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-lg hover:border-[#2563EB] hover:text-[#2563EB] dark:hover:border-[#2563EB] dark:hover:text-[#60A5FA] flex items-center justify-center transition-all duration-200 active:scale-95 cursor-pointer print:hidden ${
        shouldShow
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-2 pointer-events-none"
      }`}
    >
      <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5" />
    </button>,
    document.body
  );
}
