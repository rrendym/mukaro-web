import React from "react";

interface MukaroLogoProps {
  size?: "sm" | "md" | "lg";
  showDomain?: boolean;
  subtitle?: string;
  className?: string;
  iconClassName?: string;
}

export function MukaroLogo({
  size = "md",
  showDomain = false,
  subtitle,
  className = "",
  iconClassName = "",
}: MukaroLogoProps) {
  const iconSizes = {
    sm: "w-8 h-8",
    md: "w-9 h-9",
    lg: "w-11 h-11",
  };

  const textSizes = {
    sm: "text-base",
    md: "text-xl",
    lg: "text-2xl",
  };

  const resolvedSubtitle = subtitle ?? (showDomain ? "mukaro.id" : undefined);

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <div
        className={`${iconSizes[size]} ${iconClassName} rounded-lg overflow-hidden shrink-0 ring-1 ring-black/10 dark:ring-white/15 bg-slate-900`}
      >
        <img
          src="/mukaro-logo.jpg"
          alt="Mukaro"
          className="w-full h-full object-cover"
        />
      </div>
      <div className="flex flex-col leading-none">
        <span
          className={`${textSizes[size]} font-extrabold tracking-[-0.03em] text-[#0F172A] dark:text-slate-100`}
        >
          Mukaro
        </span>
        {resolvedSubtitle && (
          <span className="text-[11px] font-medium text-[#475569] dark:text-slate-400 mt-0.5">
            {resolvedSubtitle}
          </span>
        )}
      </div>
    </div>
  );
}
