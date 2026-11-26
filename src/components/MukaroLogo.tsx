import React from "react";

interface MukaroLogoProps {
  size?: "sm" | "md" | "lg";
  showDomain?: boolean;
  className?: string;
}

export function MukaroLogo({
  size = "md",
  showDomain = false,
  className = "",
}: MukaroLogoProps) {
  const iconSizes = {
    sm: "w-7 h-7",
    md: "w-9 h-9",
    lg: "w-11 h-11",
  };

  const textSizes = {
    sm: "text-base",
    md: "text-xl",
    lg: "text-2xl",
  };

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <div
        className={`${iconSizes[size]} rounded-xl bg-[#2563EB] flex items-center justify-center shrink-0`}
      >
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5"
        >
          <path
            d="M7 23V9.5C7 8.67157 7.67157 8 8.5 8H10.2C10.75 8 11.25 8.3 11.5 8.78L16 17.2L20.5 8.78C20.75 8.3 21.25 8 21.8 8H23.5C24.3284 8 25 8.67157 25 9.5V23"
            stroke="#FFFFFF"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="16" cy="23" r="2.2" fill="#93C5FD" />
        </svg>
      </div>
      <div className="flex flex-col leading-none">
        <span
          className={`${textSizes[size]} font-extrabold tracking-[-0.03em] text-[#0F172A] dark:text-slate-100`}
        >
          Mukaro
        </span>
        {showDomain && (
          <span className="text-[11px] font-medium text-[#475569] dark:text-slate-400 mt-0.5">
            mukaro.id
          </span>
        )}
      </div>
    </div>
  );
}
