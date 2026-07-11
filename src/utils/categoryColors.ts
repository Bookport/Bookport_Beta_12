const CATEGORY_COLORS: Record<string, { shadow: string; badge: string; label: string }> = {
  "Завтраки":       { shadow: "rgba(245,158,11,0.35)",  badge: "#F59E0B", label: "amber" },
  "Супы":           { shadow: "rgba(16,185,129,0.35)",  badge: "#10B981", label: "emerald" },
  "Салаты":         { shadow: "rgba(34,197,94,0.35)",   badge: "#22C55E", label: "green" },
  "Основные блюда": { shadow: "rgba(59,130,246,0.35)",  badge: "#3B82F6", label: "blue" },
  "Десерты":        { shadow: "rgba(168,85,247,0.35)",  badge: "#A855F7", label: "violet" },
  "Выпечка":        { shadow: "rgba(249,115,22,0.35)",  badge: "#F97316", label: "orange" },
  "Соусы":          { shadow: "rgba(14,165,233,0.35)",  badge: "#0EA5E9", label: "sky" },
  "Напитки":        { shadow: "rgba(244,63,94,0.35)",   badge: "#F43F5E", label: "rose" },
  "Книга":          { shadow: "rgba(139,92,246,0.35)",  badge: "#8B5CF6", label: "violet" },
};

const PALETTE = ["amber", "emerald", "green", "blue", "violet", "orange", "sky", "rose"];

export function getCategoryColor(category: string) {
  const key = category.trim().toLowerCase();
  const found = Object.entries(CATEGORY_COLORS).find(([k]) => k.toLowerCase() === key);
  if (found) return found[1];
  const idx = [...key].reduce((acc, c) => acc + c.charCodeAt(0), 0) % PALETTE.length;
  const label = PALETTE[idx];
  return Object.values(CATEGORY_COLORS).find(c => c.label === label) || CATEGORY_COLORS["Основные блюда"];
}

export const DEFAULT_CATEGORIES = [
  "Завтраки",
  "Супы",
  "Салаты",
  "Основные блюда",
  "Десерты",
  "Выпечка",
  "Соусы",
  "Напитки",
  "Книга",
];
