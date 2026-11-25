import React from "react";
import { CheckCircle2, QrCode, TrendingUp } from "lucide-react";

/**
 * 1. HeroCafeScene
 * Barista in black apron & cafe customer with botanical leaves (#1E7F5C),
 * yellow accents (#F7B928), and layered Mukaro UI cards.
 */
export function HeroCafeScene() {
  return (
    <div className="relative w-full max-w-lg mx-auto select-none">
      {/* Main Editorial Canvas */}
      <div className="relative rounded-2xl border-[1.5px] border-[#141413] bg-[#FFFDF7] overflow-hidden p-4 sm:p-6 shadow-[6px_6px_0px_#141413]">
        {/* Decorative Circle & Botanical Background */}
        <svg
          viewBox="0 0 460 360"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto"
          aria-hidden="true"
        >
          {/* Soft Sky & Warm Yellow Geometry */}
          <circle cx="240" cy="175" r="135" fill="#DCEBFA" />
          <circle cx="345" cy="88" r="46" fill="#F7B928" />

          {/* Botanical Monstera / Leaves Left (#1E7F5C) */}
          <path
            d="M36 330C36 260 70 210 112 195C96 245 86 290 88 330H36Z"
            fill="#1E7F5C"
          />
          <path
            d="M65 330C68 275 102 242 135 232C122 272 110 302 108 330H65Z"
            fill="#289B72"
          />
          {/* Botanical Leaves Right */}
          <path
            d="M422 330C422 252 388 205 348 188C364 240 374 286 372 330H422Z"
            fill="#1E7F5C"
          />

          {/* Cafe Counter Table */}
          <rect
            x="24"
            y="292"
            width="412"
            height="38"
            rx="8"
            fill="#FFFFFF"
            stroke="#141413"
            strokeWidth="2.5"
          />
          <line
            x1="24"
            y1="306"
            x2="436"
            y2="306"
            stroke="#141413"
            strokeWidth="2"
          />

          {/* Barista Character (Left-Center) */}
          {/* Hair & Head */}
          <circle cx="168" cy="128" r="24" fill="#F4C7A1" stroke="#141413" strokeWidth="2.2" />
          <path
            d="M144 126C144 108 158 98 172 100C186 102 193 114 191 124C182 116 160 115 144 126Z"
            fill="#141413"
          />
          {/* Shirt & Black Apron */}
          <path
            d="M134 218C134 176 146 156 168 156C190 156 202 176 202 218V292H134V218Z"
            fill="#FFFFFF"
            stroke="#141413"
            strokeWidth="2.2"
          />
          <path
            d="M144 182H192V292H144V182Z"
            fill="#141413"
          />
          {/* Apron Pocket */}
          <rect x="156" y="224" width="24" height="22" rx="3" fill="#F7B928" />
          {/* Barista Arm holding coffee cup */}
          <path
            d="M196 178L232 204"
            stroke="#141413"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <path
            d="M196 178L232 204"
            stroke="#F4C7A1"
            strokeWidth="7"
            strokeLinecap="round"
          />
          {/* Coffee Cup on Counter */}
          <rect
            x="228"
            y="258"
            width="28"
            height="34"
            rx="4"
            fill="#F7B928"
            stroke="#141413"
            strokeWidth="2.2"
          />
          <rect
            x="225"
            y="253"
            width="34"
            height="7"
            rx="3"
            fill="#141413"
          />

          {/* Customer Character (Right) */}
          <circle cx="318" cy="140" r="22" fill="#E8B288" stroke="#141413" strokeWidth="2.2" />
          <path
            d="M296 138C296 120 308 112 324 114C336 116 342 128 338 140C328 130 310 128 296 138Z"
            fill="#141413"
          />
          {/* Customer Jacket (#FF6B57 Coral) */}
          <path
            d="M284 222C284 182 298 166 318 166C338 166 352 182 352 222V292H284V222Z"
            fill="#FF6B57"
            stroke="#141413"
            strokeWidth="2.2"
          />
          {/* Customer holding smartphone */}
          <path
            d="M292 192L264 218"
            stroke="#141413"
            strokeWidth="11"
            strokeLinecap="round"
          />
          <path
            d="M292 192L264 218"
            stroke="#E8B288"
            strokeWidth="6.5"
            strokeLinecap="round"
          />
          <rect
            x="248"
            y="206"
            width="20"
            height="32"
            rx="4"
            fill="#141413"
          />
          <rect x="251" y="210" width="14" height="22" rx="2" fill="#DCF2E6" />
        </svg>

        {/* Floating UI Card 1: Kopi Senja - Meja 04 */}
        <div className="mt-3 sm:mt-0 sm:absolute sm:top-4 sm:left-4 bg-white border-[1.5px] border-[#141413] rounded-xl px-3.5 py-2.5 shadow-[3px_3px_0px_#141413] flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#F7B928] border-[1.5px] border-[#141413] flex items-center justify-center shrink-0">
            <QrCode className="w-4 h-4 text-[#141413]" />
          </div>
          <div>
            <p className="text-xs font-extrabold text-[#141413] leading-tight">
              Kopi Senja — Meja 04
            </p>
            <p className="text-[11px] font-medium text-neutral-500">
              2x Es Kopi Susu • Ice
            </p>
          </div>
        </div>

        {/* Floating UI Card 2: QRIS Lunas */}
        <div className="mt-2 sm:mt-0 sm:absolute sm:bottom-5 sm:right-4 bg-[#141413] text-white border-[1.5px] border-[#141413] rounded-xl px-3.5 py-2.5 shadow-[3px_3px_0px_#F7B928] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#F7B928] shrink-0" />
          <span className="text-xs font-bold tabular-nums">
            QRIS Lunas • Rp 48.000
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * 2. FeatureQrScene (#DCF2E6 Mint)
 */
export function FeatureQrScene() {
  return (
    <div className="w-full h-full bg-[#DCF2E6] p-4 flex flex-col justify-between relative overflow-hidden">
      <svg
        viewBox="0 0 240 160"
        fill="none"
        className="w-full h-full"
        aria-hidden="true"
      >
        <circle cx="195" cy="36" r="24" fill="#1E7F5C" opacity="0.2" />
        {/* Table Stand QR */}
        <rect
          x="52"
          y="24"
          width="74"
          height="96"
          rx="10"
          fill="#FFFFFF"
          stroke="#141413"
          strokeWidth="2.5"
        />
        <rect x="66" y="38" width="46" height="46" rx="4" fill="#141413" />
        <rect x="72" y="44" width="12" height="12" fill="#FFFFFF" />
        <rect x="94" y="44" width="12" height="12" fill="#FFFFFF" />
        <rect x="72" y="66" width="12" height="12" fill="#FFFFFF" />
        <rect x="92" y="66" width="14" height="14" fill="#F7B928" />
        <rect x="66" y="94" width="46" height="12" rx="6" fill="#F7B928" stroke="#141413" strokeWidth="1.5" />
        {/* Phone scanning */}
        <rect
          x="136"
          y="42"
          width="54"
          height="92"
          rx="10"
          fill="#141413"
        />
        <rect x="142" y="50" width="42" height="72" rx="5" fill="#FFFFFF" />
        <rect x="148" y="58" width="30" height="22" rx="4" fill="#DCEBFA" />
        <rect x="148" y="86" width="30" height="8" rx="4" fill="#1E7F5C" />
        <rect x="148" y="100" width="22" height="6" rx="3" fill="#141413" />
      </svg>
    </div>
  );
}

/**
 * 3. FeaturePosScene (#DCEBFA Soft Sky Blue)
 */
export function FeaturePosScene() {
  return (
    <div className="w-full h-full bg-[#DCEBFA] p-4 flex items-center justify-center relative overflow-hidden">
      <svg
        viewBox="0 0 240 160"
        fill="none"
        className="w-full h-full"
        aria-hidden="true"
      >
        {/* Tablet POS */}
        <rect
          x="26"
          y="22"
          width="188"
          height="116"
          rx="12"
          fill="#FFFFFF"
          stroke="#141413"
          strokeWidth="2.5"
        />
        {/* Left menu grid */}
        <rect x="38" y="36" width="44" height="36" rx="6" fill="#F7B928" stroke="#141413" strokeWidth="1.5" />
        <rect x="88" y="36" width="44" height="36" rx="6" fill="#DCF2E6" stroke="#141413" strokeWidth="1.5" />
        <rect x="38" y="78" width="44" height="36" rx="6" fill="#FCE4F0" stroke="#141413" strokeWidth="1.5" />
        <rect x="88" y="78" width="44" height="36" rx="6" fill="#ECEEEF" stroke="#141413" strokeWidth="1.5" />
        {/* Right Receipt Panel */}
        <rect x="142" y="36" width="60" height="88" rx="8" fill="#141413" />
        <rect x="150" y="46" width="44" height="8" rx="4" fill="#FFFFFF" />
        <rect x="150" y="60" width="32" height="6" rx="3" fill="#A3A3A3" />
        <rect x="150" y="96" width="44" height="18" rx="9" fill="#F7B928" />
      </svg>
    </div>
  );
}

/**
 * 4. FeatureKitchenScene (#FEF0C7 Warm Cream Yellow)
 */
export function FeatureKitchenScene() {
  return (
    <div className="w-full h-full bg-[#FEF0C7] p-4 flex items-center justify-center relative overflow-hidden">
      <svg
        viewBox="0 0 240 160"
        fill="none"
        className="w-full h-full"
        aria-hidden="true"
      >
        {/* Kitchen Ticket 1 */}
        <rect
          x="32"
          y="24"
          width="82"
          height="108"
          rx="8"
          fill="#FFFFFF"
          stroke="#141413"
          strokeWidth="2.5"
        />
        <rect x="42" y="34" width="42" height="12" rx="6" fill="#F7B928" />
        <line x1="42" y1="58" x2="102" y2="58" stroke="#141413" strokeWidth="2" />
        <line x1="42" y1="74" x2="94" y2="74" stroke="#141413" strokeWidth="2" />
        <rect x="42" y="96" width="62" height="22" rx="11" fill="#141413" />
        {/* Thermal Receipt Roll */}
        <rect
          x="128"
          y="32"
          width="78"
          height="100"
          rx="8"
          fill="#FFFFFF"
          stroke="#141413"
          strokeWidth="2.5"
        />
        <circle cx="167" cy="56" r="12" fill="#1E7F5C" />
        <path d="M161 56L165 60L173 52" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="142" y1="82" x2="192" y2="82" stroke="#141413" strokeWidth="2" />
        <line x1="142" y1="96" x2="184" y2="96" stroke="#141413" strokeWidth="2" />
        <line x1="142" y1="110" x2="192" y2="110" stroke="#141413" strokeWidth="2" />
      </svg>
    </div>
  );
}

/**
 * 5. FeatureInventoryScene (#FCE4F0 Pastel Pink)
 */
export function FeatureInventoryScene() {
  return (
    <div className="w-full h-full bg-[#FCE4F0] p-4 flex items-center justify-center relative overflow-hidden">
      <svg
        viewBox="0 0 240 160"
        fill="none"
        className="w-full h-full"
        aria-hidden="true"
      >
        {/* Botanical Leaf */}
        <path
          d="M32 136C32 98 54 74 82 68C72 98 64 118 64 136H32Z"
          fill="#1E7F5C"
        />
        {/* Stock Opname Card */}
        <rect
          x="58"
          y="24"
          width="148"
          height="112"
          rx="12"
          fill="#FFFFFF"
          stroke="#141413"
          strokeWidth="2.5"
        />
        {/* Rows */}
        <rect x="74" y="42" width="64" height="10" rx="5" fill="#141413" />
        <rect x="156" y="40" width="34" height="14" rx="7" fill="#DCF2E6" stroke="#1E7F5C" strokeWidth="1.5" />
        <rect x="74" y="68" width="54" height="10" rx="5" fill="#141413" />
        <rect x="156" y="66" width="34" height="14" rx="7" fill="#FEF0C7" stroke="#141413" strokeWidth="1.5" />
        <rect x="74" y="94" width="68" height="10" rx="5" fill="#141413" />
        <rect x="156" y="92" width="34" height="14" rx="7" fill="#FF6B57" />
      </svg>
    </div>
  );
}

/**
 * 6. DashboardShowcaseScene
 * Cafe owner holding coffee cup in front of Mukaro dashboard mockup window
 * with #DCEBFA circle & floating "+34% Target Omzet Tercapai" card.
 */
export function DashboardShowcaseScene() {
  return (
    <div className="relative w-full max-w-lg mx-auto select-none">
      <div className="relative rounded-2xl border-[1.5px] border-[#141413] bg-white p-4 sm:p-6 shadow-[6px_6px_0px_#141413] overflow-hidden">
        <svg
          viewBox="0 0 460 340"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto"
          aria-hidden="true"
        >
          {/* Soft Sky Blue Circle */}
          <circle cx="220" cy="170" r="140" fill="#DCEBFA" />
          {/* Botanical Accent */}
          <path
            d="M390 310C390 250 360 212 325 198C338 242 348 278 346 310H390Z"
            fill="#1E7F5C"
          />

          {/* Dashboard Browser Window */}
          <rect
            x="105"
            y="36"
            width="315"
            height="230"
            rx="14"
            fill="#FFFFFF"
            stroke="#141413"
            strokeWidth="2.5"
          />
          {/* Window Header */}
          <path
            d="M105 50C105 42.268 111.268 36 119 36H406C413.732 36 420 42.268 420 50V68H105V50Z"
            fill="#F7B928"
            stroke="#141413"
            strokeWidth="2.5"
          />
          <circle cx="126" cy="52" r="4" fill="#141413" />
          <circle cx="140" cy="52" r="4" fill="#141413" />
          <circle cx="154" cy="52" r="4" fill="#141413" />

          {/* KPI Mini Boxes inside Window */}
          <rect x="125" y="86" width="84" height="44" rx="8" fill="#F8F7F4" stroke="#141413" strokeWidth="1.8" />
          <rect x="219" y="86" width="84" height="44" rx="8" fill="#DCF2E6" stroke="#141413" strokeWidth="1.8" />
          <rect x="313" y="86" width="88" height="44" rx="8" fill="#FCE4F0" stroke="#141413" strokeWidth="1.8" />

          {/* Bar Chart inside Window */}
          <rect x="145" y="196" width="24" height="48" rx="4" fill="#141413" />
          <rect x="183" y="176" width="24" height="68" rx="4" fill="#141413" />
          <rect x="221" y="164" width="24" height="80" rx="4" fill="#F7B928" stroke="#141413" strokeWidth="1.8" />
          <rect x="259" y="182" width="24" height="62" rx="4" fill="#141413" />
          <rect x="297" y="150" width="24" height="94" rx="4" fill="#1E7F5C" />
          <rect x="335" y="142" width="24" height="102" rx="4" fill="#F7B928" stroke="#141413" strokeWidth="1.8" />

          {/* Cafe Owner Character (Left) */}
          <circle cx="82" cy="142" r="24" fill="#F4C7A1" stroke="#141413" strokeWidth="2.5" />
          <path
            d="M58 140C58 122 72 112 88 114C102 116 108 128 104 140C94 130 74 128 58 140Z"
            fill="#141413"
          />
          <path
            d="M46 226C46 184 60 168 82 168C104 168 118 184 118 226V310H46V226Z"
            fill="#141413"
          />
          {/* Coffee Cup in Owner's Hand */}
          <rect
            x="108"
            y="196"
            width="24"
            height="28"
            rx="4"
            fill="#F7B928"
            stroke="#141413"
            strokeWidth="2.2"
          />
        </svg>

        {/* Floating Target Card */}
        <div className="mt-3 sm:mt-0 sm:absolute sm:bottom-5 sm:right-5 bg-white border-[1.5px] border-[#141413] rounded-xl px-4 py-2.5 shadow-[4px_4px_0px_#141413] flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#1E7F5C] text-white flex items-center justify-center shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-extrabold text-[#141413] tabular-nums">
              +34% Target Omzet Tercapai
            </p>
            <p className="text-[10px] font-semibold text-neutral-500">
              Update real-time setiap order lunas
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 7. ClosingCafeScene
 * Character illustration sitting/standing cleanly above the slanted #F7B928 footer.
 */
export function ClosingCafeScene() {
  return (
    <div className="w-full max-w-md mx-auto select-none">
      <svg
        viewBox="0 0 420 170"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto block"
        aria-hidden="true"
      >
        {/* Botanical Leaves */}
        <path
          d="M45 170C45 112 76 76 112 64C98 108 90 142 90 170H45Z"
          fill="#1E7F5C"
        />
        <path
          d="M375 170C375 112 344 76 308 64C322 108 330 142 330 170H375Z"
          fill="#1E7F5C"
        />
        {/* Cafe Table */}
        <rect
          x="130"
          y="124"
          width="160"
          height="46"
          rx="8"
          fill="#FFFFFF"
          stroke="#141413"
          strokeWidth="2.5"
        />
        {/* Happy Barista & Customer High-Five / Cheers */}
        <circle cx="176" cy="72" r="20" fill="#F4C7A1" stroke="#141413" strokeWidth="2.5" />
        <path d="M156 70C156 54 168 46 182 48C194 50 198 60 195 70H156Z" fill="#141413" />
        <path d="M150 124C150 100 162 92 176 92C190 92 202 100 202 124H150Z" fill="#141413" />

        <circle cx="244" cy="72" r="20" fill="#E8B288" stroke="#141413" strokeWidth="2.5" />
        <path d="M224 70C224 54 236 46 250 48C262 50 266 60 263 70H224Z" fill="#141413" />
        <path d="M218 124C218 100 230 92 244 92C258 92 270 100 270 124H218Z" fill="#FF6B57" stroke="#141413" strokeWidth="2.2" />

        {/* Coffee Cups */}
        <rect x="198" y="96" width="24" height="28" rx="4" fill="#F7B928" stroke="#141413" strokeWidth="2" />
      </svg>
    </div>
  );
}
