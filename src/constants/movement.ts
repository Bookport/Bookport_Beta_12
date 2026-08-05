export const MOVEMENT_DAILY_TARGET_MIN = 30;
export const MOVEMENT_MAX_POINTS_PER_DAY = 60;

export const ACTIVITY_CONFIGS: Record<string, {
  name: string;
  gradient: string;
  bgColor: string;
  textColor: string;
  badgeBg: string;
  borderGlow: string;
  hexColor: string;
}> = {
  "Walk": {
    name: "Прогулка",
    gradient: "from-emerald-500 to-teal-400",
    bgColor: "bg-emerald-50/70",
    textColor: "text-emerald-800",
    badgeBg: "bg-emerald-100/50",
    borderGlow: "border-emerald-200/65 shadow-emerald-100",
    hexColor: "#E6F4EA"
  },
  "Gymnastics": {
    name: "Зарядка",
    gradient: "from-amber-400 to-orange-500",
    bgColor: "bg-amber-50/70",
    textColor: "text-amber-800",
    badgeBg: "bg-amber-100/50",
    borderGlow: "border-amber-200/65 shadow-amber-100",
    hexColor: "#FEF7E0"
  },
  "Stretching": {
    name: "Растяжка",
    gradient: "from-sky-450 to-indigo-450",
    bgColor: "bg-sky-50/75",
    textColor: "text-sky-850",
    badgeBg: "bg-sky-100/50",
    borderGlow: "border-sky-200/65 shadow-sky-100",
    hexColor: "#E8F0FE"
  },
  "Yoga": {
    name: "Йога",
    gradient: "from-violet-500 to-indigo-500",
    bgColor: "bg-violet-50/70",
    textColor: "text-violet-800",
    badgeBg: "bg-violet-100/50",
    borderGlow: "border-violet-200/65 shadow-violet-100",
    hexColor: "#F3E8FD"
  },
  "Cardio": {
    name: "Кардио",
    gradient: "from-rose-500 to-orange-500",
    bgColor: "bg-rose-50/70",
    textColor: "text-rose-850",
    badgeBg: "bg-rose-100/50",
    borderGlow: "border-rose-250/65 shadow-rose-100",
    hexColor: "#FCE8E6"
  },
  "Strength": {
    name: "Силовая",
    gradient: "from-slate-700 to-slate-900",
    bgColor: "bg-slate-100/70",
    textColor: "text-slate-800",
    badgeBg: "bg-slate-200/65",
    borderGlow: "border-slate-300/65 shadow-slate-200",
    hexColor: "#F1F3F4"
  },
  "Cycling": {
    name: "Велосипед",
    gradient: "from-amber-500 to-lime-500",
    bgColor: "bg-lime-50/70",
    textColor: "text-lime-850",
    badgeBg: "bg-lime-100/50",
    borderGlow: "border-lime-200/65 shadow-lime-100",
    hexColor: "#E4F7FB"
  },
  "Dancing": {
    name: "Танцы",
    gradient: "from-fuchsia-500 to-pink-500",
    bgColor: "bg-fuchsia-50/70",
    textColor: "text-fuchsia-850",
    badgeBg: "bg-fuchsia-100/50",
    borderGlow: "border-fuchsia-200/65 shadow-fuchsia-100",
    hexColor: "#FDE7F3"
  },
  "Mobility": {
    name: "Мобилити",
    gradient: "from-cyan-400 to-blue-500",
    bgColor: "bg-cyan-50/70",
    textColor: "text-cyan-850",
    badgeBg: "bg-cyan-100/50",
    borderGlow: "border-cyan-200/65 shadow-cyan-100",
    hexColor: "#E0F2F1"
  },
  "Custom": {
    name: "Своя активность",
    gradient: "from-neutral-500 to-neutral-700",
    bgColor: "bg-neutral-50/80",
    textColor: "text-neutral-800",
    badgeBg: "bg-neutral-200/60",
    borderGlow: "border-neutral-300/60 shadow-neutral-100",
    hexColor: "#E0F2F1"
  }
};
