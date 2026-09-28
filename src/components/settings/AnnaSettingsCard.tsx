import React from "react";

export type AnnaSettingsTheme = "mint" | "lilac" | "sky" | "amber";

interface AnnaSettingsCardProps {
  avatarSrc: string;
  title?: string;
  subtitle?: string;
  text: string;
  theme?: AnnaSettingsTheme;
}

const THEME_CLASSES: Record<AnnaSettingsTheme, { wrap: string; title: string; avatarRing: string }> = {
  mint: {
    wrap: "bg-emerald-50/70 border-emerald-100",
    title: "text-emerald-900",
    avatarRing: "border-emerald-200",
  },
  lilac: {
    wrap: "bg-purple-50/70 border-purple-100",
    title: "text-purple-900",
    avatarRing: "border-purple-200",
  },
  sky: {
    wrap: "bg-sky-50/70 border-sky-100",
    title: "text-sky-900",
    avatarRing: "border-sky-200",
  },
  amber: {
    wrap: "bg-amber-50/70 border-amber-100",
    title: "text-amber-900",
    avatarRing: "border-amber-200",
  },
};

export default function AnnaSettingsCard({
  avatarSrc,
  title = "Анна",
  subtitle = "Советник WFPB",
  text,
  theme = "mint",
}: AnnaSettingsCardProps) {
  const t = THEME_CLASSES[theme];
  return (
    <div className={`${t.wrap} rounded-3xl p-4 border flex flex-col text-left`}>
      <div className="flex items-center gap-3">
        <img
          src={avatarSrc}
          alt="Анна"
          className="w-11 h-11 rounded-full border-2 border-white shadow-xs object-cover flex-shrink-0 bg-white"
          referrerPolicy="no-referrer"
        />
        <div className="flex flex-col">
          <span className={`font-bold text-[15px] leading-tight ${t.title}`}>{title}</span>
          <span className="text-[12px] opacity-75 text-slate-500 font-medium leading-tight">{subtitle}</span>
        </div>
      </div>
      <div className="w-full mt-3 p-3.5 bg-white/90 rounded-2xl border border-white/60 shadow-2xs">
        <p className="text-[13px] leading-relaxed text-slate-700 font-medium w-full text-left">{text}</p>
      </div>
    </div>
  );
}
