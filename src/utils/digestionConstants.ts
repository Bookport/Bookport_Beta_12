import bristol1Img from "../assets/images/digestion/bristol/1.webp";
import bristol2Img from "../assets/images/digestion/bristol/2.webp";
import bristol3Img from "../assets/images/digestion/bristol/3.webp";
import bristol4Img from "../assets/images/digestion/bristol/4.webp";
import bristol5Img from "../assets/images/digestion/bristol/5.webp";
import bristol6Img from "../assets/images/digestion/bristol/6.webp";
import bristol7Img from "../assets/images/digestion/bristol/7.webp";

export const BRISTOL_IMAGES = [
  bristol1Img,
  bristol2Img,
  bristol3Img,
  bristol4Img,
  bristol5Img,
  bristol6Img,
  bristol7Img,
];

export const BRISTOL_DESCRIPTIONS: Record<number, string> = {
  1: "Отдельные твёрдые мелкие комочки (как орешки). Проходят с трудом (сильный запор).",
  2: "Плотный, комковатый стул, напоминающий по форме колбаску. Выходит с усилием (запор).",
  3: "Оформленный стул в виде гладкой колбаски с трещинами на поверхности (вариант нормы).",
  4: "Мягкий и гладкий стул, напоминающий по форме колбаску или змею (идеальный вариант).",
  5: "Мягкие небольшие комочки с чёткими краями. Проходят очень легко (нехватка клетчатки).",
  6: "Рыхлые мягкие хлопья с рваными краями. Имеют кашицеобразную форму (легкая диарея).",
  7: "Полностью водянистый жидкий стул без твёрдых частиц. Выходит мгновенно (диарея).",
};

export const DIGESTION_TIME_INTERVALS = [
  "00:00 - 04:00",
  "04:00 - 08:00",
  "08:00 - 12:00",
  "12:00 - 16:00",
  "16:00 - 20:00",
  "20:00 - 00:00",
];

export const DIGESTION_SYMPTOMS = [
  "Вздутие",
  "Спазмы",
  "Боль",
  "Тошнота",
  "Изжога",
  "Диарея",
  "Запор",
  "Ощущение неполного опорожнения",
  "Слизь",
  "Кровь",
  "Урчание в животе",
  "Газы",
  "Нет симптомов",
];

export const DIGESTION_SYMPTOM_COLORS: Record<string, { inactive: string; active: string }> = {
  "Боль": { inactive: "bg-rose-50 text-rose-700", active: "bg-rose-200 text-rose-900 shadow-md" },
  "Спазмы": { inactive: "bg-rose-50 text-rose-700", active: "bg-rose-200 text-rose-900 shadow-md" },
  "Кровь": { inactive: "bg-rose-50 text-rose-700", active: "bg-rose-200 text-rose-900 shadow-md" },
  "Изжога": { inactive: "bg-rose-50 text-rose-700", active: "bg-rose-200 text-rose-900 shadow-md" },
  "Тошнота": { inactive: "bg-rose-50 text-rose-700", active: "bg-rose-200 text-rose-900 shadow-md" },
  "Вздутие": { inactive: "bg-orange-50 text-orange-700", active: "bg-orange-200 text-orange-900 shadow-md" },
  "Газы": { inactive: "bg-orange-50 text-orange-700", active: "bg-orange-200 text-orange-900 shadow-md" },
  "Урчание в животе": { inactive: "bg-orange-50 text-orange-700", active: "bg-orange-200 text-orange-900 shadow-md" },
  "Диарея": { inactive: "bg-indigo-50 text-indigo-700", active: "bg-indigo-200 text-indigo-900 shadow-md" },
  "Запор": { inactive: "bg-indigo-50 text-indigo-700", active: "bg-indigo-200 text-indigo-900 shadow-md" },
  "Ощущение неполного опорожнения": { inactive: "bg-indigo-50 text-indigo-700", active: "bg-indigo-200 text-indigo-900 shadow-md" },
  "Слизь": { inactive: "bg-indigo-50 text-indigo-700", active: "bg-indigo-200 text-indigo-900 shadow-md" },
  "Нет симптомов": { inactive: "bg-emerald-50 text-emerald-700", active: "bg-emerald-200 text-emerald-900 shadow-md" },
};