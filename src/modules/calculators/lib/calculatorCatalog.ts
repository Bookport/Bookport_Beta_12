/* Каталог калькуляторов: список инструментов, их фирменные миниатюры и палитра каждой плашки. */

import headerIcon from "../images/01.webp";
import thumb01 from "../images/1.webp";
import thumb02 from "../images/2.webp";
import thumb03 from "../images/3.webp";
import thumb04 from "../images/4.webp";
import thumb05 from "../images/5.webp";
import thumb06 from "../images/6.webp";
import thumb07 from "../images/7.webp";
import thumb08 from "../images/8.webp";
import thumb09 from "../images/9.webp";
import thumb10 from "../images/10.webp";
import thumb11 from "../images/11.webp";
import thumb12 from "../images/12.webp";
import thumb13 from "../images/13.webp";
import thumb14 from "../images/14.webp";
import thumb15 from "../images/15.webp";
import thumb16 from "../images/16.webp";
import thumb17 from "../images/17.webp";
import thumb18 from "../images/18.webp";
import thumb19 from "../images/19.webp";
import thumb20 from "../images/20.webp";
import sectionEnergy from "../images/r1.webp";
import sectionNutrition from "../images/r2.webp";
import sectionBody from "../images/r3.webp";
import sectionMovement from "../images/r4.webp";

/** Пиктограмма шапки экрана. */
export const screenIcon: string = headerIcon;

export type CalculatorCategory = "energy" | "nutrition" | "body" | "movement";

export type CalculatorId =
  | "bmr" | "tdee" | "calorie-goal" | "weight-timeline" | "macro-goal"
  | "protein" | "meal-macros"
  | "bmi" | "ideal-weight" | "waist-height" | "waist-hip" | "body-fat"
  | "heart-zones" | "pace" | "walking-calories" | "running-calories"
  | "step-goal" | "steps-distance" | "walking-pace" | "movement-speed";

export type CalculatorDefinition = {
  id: CalculatorId;
  title: string;
  description: string;
  category: CalculatorCategory;
  /** Фирменная миниатюра 40×40 на плашке. */
  thumbnail: string;
  /** Пастельный фон плашки — задаётся на каждую карточку, а не на секцию. */
  tint: string;
  /** Насыщенный акцент этого калькулятора: кнопка «Готово» и фокус в модалке. */
  accent: string;
};

export const categoryMeta: Record<CalculatorCategory, { label: string; headingColor: string; icon: string }> = {
  energy: { label: "Энергия и цели", headingColor: "#B95D47", icon: sectionEnergy },
  nutrition: { label: "Питание", headingColor: "#406D4E", icon: sectionNutrition },
  body: { label: "Тело и замеры", headingColor: "#6A4D8C", icon: sectionBody },
  movement: { label: "Движение", headingColor: "#9B454B", icon: sectionMovement },
};

/** Порядок секций на экране. */
export const categoryOrder: CalculatorCategory[] = ["energy", "nutrition", "body", "movement"];

export const calculators: CalculatorDefinition[] = [
  { id: "bmr", title: "Базовый обмен", description: "Энергия, которую тело расходует в покое", category: "energy", thumbnail: thumb01, tint: "#FFF1EB", accent: "#E06D44" },
  { id: "tdee", title: "Суточный расход", description: "Ориентир энергии с учётом активности", category: "energy", thumbnail: thumb02, tint: "#FFF6E5", accent: "#D98A2C" },
  { id: "calorie-goal", title: "Цель калорий", description: "Снижение, поддержание или набор", category: "energy", thumbnail: thumb03, tint: "#FFF8EC", accent: "#C98A2C" },
  { id: "weight-timeline", title: "Путь к цели", description: "Оценка сроков без обещаний точной даты", category: "energy", thumbnail: thumb04, tint: "#F3F8F2", accent: "#4B8E57" },
  { id: "macro-goal", title: "КБЖУ под цель", description: "Баланс белков, жиров и углеводов", category: "energy", thumbnail: thumb05, tint: "#FEF0F2", accent: "#D35265" },
  { id: "protein", title: "Белок в день", description: "Диапазон белка на день и приём пищи", category: "nutrition", thumbnail: thumb06, tint: "#FFF3E8", accent: "#D4713B" },
  { id: "meal-macros", title: "КБЖУ по приёмам", description: "Разложите цель по ритму вашего дня", category: "nutrition", thumbnail: thumb07, tint: "#EBF7EE", accent: "#3D8C55" },
  { id: "bmi", title: "ИМТ и диапазон веса", description: "Справочный взгляд на рост и массу", category: "body", thumbnail: thumb08, tint: "#EBF4FA", accent: "#3679A8" },
  { id: "ideal-weight", title: "Идеальный вес", description: "Сравните несколько ориентиров для роста", category: "body", thumbnail: thumb09, tint: "#FDF6E8", accent: "#C4922F" },
  { id: "waist-height", title: "Талия к росту", description: "Отслеживайте соотношение в динамике", category: "body", thumbnail: thumb10, tint: "#F5EFFB", accent: "#8755B8" },
  { id: "waist-hip", title: "Талия к бёдрам", description: "Простой индекс обхватов", category: "body", thumbnail: thumb11, tint: "#FAF0F6", accent: "#B3538A" },
  { id: "body-fat", title: "Процент жира", description: "Оценка по обхватам по методу US Navy", category: "body", thumbnail: thumb12, tint: "#F1F3FA", accent: "#5367B3" },
  { id: "heart-zones", title: "Зоны пульса", description: "Настройте интенсивность движения", category: "movement", thumbnail: thumb13, tint: "#FDEEEEE", accent: "#C93B47" },
  { id: "pace", title: "Темп и дистанция", description: "Время, скорость или дистанция", category: "movement", thumbnail: thumb14, tint: "#FFF3EB", accent: "#DB6634" },
  { id: "walking-calories", title: "Калории при ходьбе", description: "Расход энергии по весу, времени и темпу", category: "movement", thumbnail: thumb15, tint: "#FFF7ED", accent: "#CE7729" },
  { id: "running-calories", title: "Калории при беге", description: "Расход энергии по весу, времени и темпу", category: "movement", thumbnail: thumb16, tint: "#FDF0EE", accent: "#D9453B" },
  { id: "step-goal", title: "Цель по шагам", description: "Оставшиеся шаги и прогресс дня", category: "movement", thumbnail: thumb17, tint: "#FEF9E7", accent: "#BFA021" },
  { id: "steps-distance", title: "Шаги в расстояние", description: "Перевод шагов в примерную дистанцию", category: "movement", thumbnail: thumb18, tint: "#F0F8F6", accent: "#348E7B" },
  { id: "walking-pace", title: "Темп ходьбы", description: "Темп в мин/км и средняя скорость", category: "movement", thumbnail: thumb19, tint: "#F9F3EB", accent: "#99683B" },
  { id: "movement-speed", title: "Скорость движения", description: "Средняя скорость без учёта остановок", category: "movement", thumbnail: thumb20, tint: "#F0F4F8", accent: "#406A8C" },
];

export const calculatorById: Record<CalculatorId, CalculatorDefinition> = Object.fromEntries(
  calculators.map((calculator) => [calculator.id, calculator]),
) as Record<CalculatorId, CalculatorDefinition>;
