import {
  HeartPulse,
  Flame,
  ArrowUp,
  Droplet,
  Activity,
  Clock,
  Droplets,
  Shield,
  BatteryLow,
  Brain,
  Wind,
  Heart,
  Layers,
  Link,
  Waves,
  CloudRain,
  Moon,
  ShieldCheck,
  MoreHorizontal,
  Sprout,
  Scale,
  Zap,
  Leaf,
  ArrowDown,
  ShieldAlert,
  Sparkles,
  Smile,
  CloudLightning,
  Cookie,
  Ban,
  Sun,
} from "lucide-react";

export type SettingsSection = "hub" | "notifications" | "nutrition" | "recipes" | "account";

// Mirroring the exact lists from HealthGoalsScreen.tsx to satisfy complete mapping
export const CHRONIC_CONDITIONS = [
  { id: "hypertension", name: "Гипертония", icon: HeartPulse, color: "text-red-500 bg-red-50" },
  { id: "gastritis", name: "Гастрит", icon: Flame, color: "text-orange-500 bg-orange-50" },
  { id: "reflux", name: "Рефлюкс", icon: ArrowUp, color: "text-amber-500 bg-amber-50" },
  { id: "diabetes", name: "Диабет", icon: Droplet, color: "text-blue-500 bg-blue-50" },
  { id: "ibs", name: "СРК", icon: Activity, color: "text-emerald-500 bg-emerald-50" },
  { id: "constipation", name: "Запоры", icon: Clock, color: "text-cyan-500 bg-cyan-50" },
  { id: "cholesterol", name: "Высокий холестерин", icon: Activity, color: "text-rose-500 bg-rose-50" },
  { id: "anemia", name: "Анемия", icon: Droplets, color: "text-red-600 bg-red-100" },
  { id: "allergy", name: "Аллергия", icon: Droplet, color: "text-pink-500 bg-pink-50" },
  { id: "thyroid", name: "Заболевания щитовидной железы", icon: Shield, color: "text-violet-500 bg-violet-50" },
  { id: "fatigue", name: "Хроническая усталость", icon: BatteryLow, color: "text-slate-500 bg-slate-100" },
  { id: "migraine", name: "Мигрень", icon: Brain, color: "text-indigo-500 bg-indigo-50" },
  { id: "asthma", name: "Астма", icon: Wind, color: "text-sky-500 bg-sky-50" },
  { id: "liver", name: "Заболевания печени", icon: Heart, color: "text-red-400 bg-red-50" },
  { id: "kidneys", name: "Заболевания почек", icon: Layers, color: "text-teal-600 bg-teal-50" },
  { id: "arthritis", name: "Артрит / боли в суставах", icon: Link, color: "text-stone-600 bg-stone-100" },
  { id: "anxiety", name: "Тревожность", icon: Waves, color: "text-purple-500 bg-purple-50" },
  { id: "depression", name: "Депрессия", icon: CloudRain, color: "text-blue-600 bg-blue-100" },
  { id: "insomnia", name: "Нарушения сна", icon: Moon, color: "text-indigo-900 bg-indigo-50" },
  { id: "autoimmune", name: "Аутоиммунные заболевания", icon: ShieldCheck, color: "text-lime-600 bg-lime-50" },
  { id: "other_chronic", name: "Другое", icon: MoreHorizontal, color: "text-gray-500 bg-gray-100" }
];

export const GOALS = [
  { id: "improve_digestion", name: "Улучшить пищеварение", icon: Sprout, color: "text-emerald-500 bg-emerald-50" },
  { id: "lose_weight", name: "Снизить вес", icon: Scale, color: "text-teal-500 bg-teal-50" },
  { id: "increase_energy", name: "Повысить энергию", icon: Zap, color: "text-amber-500 bg-amber-50" },
  { id: "normalize_sleep", name: "Нормализовать сон", icon: Moon, color: "text-indigo-500 bg-indigo-50" },
  { id: "reduce_sugar_cravings", name: "Уменьшить тягу к сладкому", icon: Ban, color: "text-purple-500 bg-purple-50" },
  { id: "plant_diet", name: "Перейти на растительное питание", icon: Leaf, color: "text-green-500 bg-green-50" },
  { id: "regular_stool", name: "Наладить регулярный стул", icon: Clock, color: "text-cyan-500 bg-cyan-50" },
  { id: "lower_pressure", name: "Снизить давление", icon: HeartPulse, color: "text-red-500 bg-red-50" },
  { id: "stabilize_sugar", name: "Стабилизировать сахар", icon: Activity, color: "text-blue-500 bg-blue-50" },
  { id: "lower_cholesterol", name: "Снизить холестерин", icon: ArrowDown, color: "text-rose-500 bg-rose-50" },
  { id: "reduce_inflammation", name: "Снизить воспаление", icon: ShieldAlert, color: "text-emerald-600 bg-emerald-50" },
  { id: "improve_skin", name: "Улучшить состояние кожи", icon: Sparkles, color: "text-pink-500 bg-pink-50" },
  { id: "improve_mood", name: "Улучшить настроение", icon: Smile, color: "text-yellow-600 bg-yellow-50" },
  { id: "reduce_anxiety", name: "Уменьшить тревожность", icon: CloudLightning, color: "text-indigo-400 bg-indigo-50" },
  { id: "improve_eating_habits", name: "Улучшить пищевые привычки", icon: Heart, color: "text-rose-400 bg-rose-50" },
  { id: "more_wfpb", name: "Есть больше цельной растительной еды", icon: Cookie, color: "text-orange-500 bg-orange-50" },
  { id: "less_overeating", name: "Меньше переедать", icon: Ban, color: "text-stone-500 bg-stone-50" },
  { id: "drink_water", name: "Пить достаточно воды", icon: Droplet, color: "text-sky-500 bg-sky-50" },
  { id: "routine_stability", name: "Быть устойчивее в режиме", icon: Clock, color: "text-teal-600 bg-teal-50" },
  { id: "improve_wellbeing", name: "Улучшить общее самочувствие", icon: Sun, color: "text-amber-600 bg-amber-50" },
  { id: "other_goal", name: "Другое", icon: Sparkles, color: "text-gray-500 bg-gray-100" }
];

export const LIFESTYLE_TRAITS = [
  { id: "поздний сон", name: "Поздний сон (после 23:30)", desc: "Влияет на мелатониновый купол и очистку почек" },
  { id: "хаотичный режим", name: "Хаотичный режим дня", desc: "Биоритмы запрашивают стабильность" },
  { id: "недостаток воды", name: "Недостаток воды", desc: "Свободная фильтрация лимфы требует увлажнения" },
  { id: "много кофеина", name: "Избыток кофеина", desc: "Вызывает спазмы почечных артерий" },
  { id: "тяга к сладкому", name: "Выраженная тяга к сладкому", desc: "Свидетельствует о нехватке сложных углеводов" },
  { id: "пропуски приёмов пищи", name: "Пропуски приёмов пищи", desc: "Приводит к застоям желчи" }
];

export const RECIPE_DIET_PREFS = [
  { id: "book_priority", name: "Приоритет рецептов из Книги", desc: "Рекомендовать в первую очередь экспертные растительные варианты" },
  { id: "simple_dishes", name: "Простые блюда", desc: "Менее 5 основных ингредиентов в рецепте" },
  { id: "fast_variants", name: "Быстрые варианты", desc: "Менее 20 минут активного приготовления" },
  { id: "consider_chronic", name: "Учитывать медицинские ограничения", desc: "Скрывать рецепты со спорными раздражителями" }
];
