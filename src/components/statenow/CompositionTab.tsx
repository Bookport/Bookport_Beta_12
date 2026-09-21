import React, { useEffect } from "react";
import { Clock } from "lucide-react";
import { motion } from "motion/react";
import AnnaTabSpoiler from "./AnnaTabSpoiler";
import { NextStepRecommendation } from "../../utils/nextStepEngine";
import IngredientCollage from "../IngredientCollage";
import { ingestAchievementEvent } from "../../modules/achievements";
import { getIngredientImage } from "../../utils/ingredientMapper";
import { getIngredientAlias } from "../../utils/ingredientAliasMapper";

import scaleIcon from "../../assets/images/SOST/balance/21.webp";
import bowlIcon from "../../assets/images/SOST/balance/22.webp";

const NON_WFPB_KEYWORDS = [
  "баранин", "говядин", "свинин", "птиц", "куриц", "курк", "индейк", "утк", "гус",
  "мяс", "рыб", "лосос", "форел", "семг", "тунец", "треск", "минтай", "скумбри", "сельдь", "селедк",
  "креветк", "кальмар", "миди", "осьминог", "краб", "морепродукт",
  "творог", "сыр", "молок", "сливк", "масло сливочн", "сметан", "кефир", "йогурт", "ряженк",
  "яйц", "яичн", "омлет", "бекон", "колбас", "сосиск", "ветчин", "паштет", "фарш",
  "сало", "майонез"
];

export const checkIsNonWfpb = (name: string, status?: string): boolean => {
  if (status === "red") return true;
  const lower = (name || "").toLowerCase();
  return NON_WFPB_KEYWORDS.some((kw) => lower.includes(kw));
};

interface CompositionTabProps {
  key?: any;
  aggregatedIngredients: {
    name: string;
    weight: number;
    status: "green" | "yellow" | "red";
  }[];
  cookedBookDishes: {
    id: string;
    name: string;
    source: string;
    category: string;
    page: number;
    time: string;
    image: string;
    calories: number;
    protein: number | string;
    fat: number | string;
    fiber: number | string;
  }[];
  todayCustomDishes: {
    id: string;
    name: string;
    category?: string;
    image?: string;
    ingredients?: { name: string; weight: string; status?: "green" | "yellow" | "red" }[];
    calories?: number;
    protein?: number | string;
    fat?: number | string;
    fiber?: number | string;
    time?: string;
  }[];
  annaAnalysisText?: string;
  recommendedAction?: NextStepRecommendation;
}

export default function CompositionTab({
  aggregatedIngredients,
  cookedBookDishes,
  todayCustomDishes,
  annaAnalysisText,
  recommendedAction,
}: CompositionTabProps) {
  const formatMacroGrams = (val: unknown): string => {
    if (val === undefined || val === null || val === "") return "0";
    const cleaned = String(val).replace(/ г$/i, "").replace(",", ".");
    const num = parseFloat(cleaned);
    if (isNaN(num)) return "0";
    return num % 1 === 0 ? String(num) : num.toFixed(1);
  };

  const totalMass = aggregatedIngredients.reduce((acc, curr) => acc + curr.weight, 0);

  useEffect(() => {
    // legacy block 1 event
    ingestAchievementEvent({ type: 'ingredient:card_viewed' });
    // block 4 event
    import('../../utils/api').then(({ api }) => {
      api('/api/achievements/track', { method: 'POST', body: { type: 'composition_view', payload: {} } });
      setTimeout(() => ingestAchievementEvent({ type: 'composition_view' } as any), 500);
    });
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="space-y-5 pb-36 w-full overflow-x-hidden"
    >
      {/* 0. Anna's Tab Spoiler Analysis */}
      {annaAnalysisText && recommendedAction && (
        <AnnaTabSpoiler
          tabId="composition"
          tabName="Сырьевой состав рациона"
          analysisText={annaAnalysisText}
          recommendedAction={recommendedAction}
        />
      )}

      {/* 1. Total Raw Mass Weight list of ingredients */}
      <div className="bg-white rounded-[32px] border border-white shadow-[0_4px_16px_rgba(15,23,42,0.08)] p-4 sm:p-5 text-left w-full overflow-hidden">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 min-w-0">
            <img src={scaleIcon} alt="Весы" className="w-6 h-6 object-contain shrink-0 drop-shadow-xs" />
            <h2 className="text-[12.5px] sm:text-sm font-bold tracking-wider text-slate-700 uppercase truncate">
              СОСТАВ И ВЕС СЫРЬЯ
            </h2>
          </div>
          <span className="text-[10.5px] uppercase font-mono font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/80 shrink-0 whitespace-nowrap">
            ВСЕГО: {totalMass} Г
          </span>
        </div>
        <p className="text-[11.5px] text-slate-400 mb-3.5 leading-normal font-sans">
          Общие очищенные ингредиенты всех ваших блюд дня с суммированным сухим или чистым весом.
        </p>

        {aggregatedIngredients.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 w-full">
            {aggregatedIngredients.map((ing) => {
              const isStop = checkIsNonWfpb(ing.name, ing.status);
              const thumb = getIngredientImage(getIngredientAlias(ing.name)) || getIngredientImage(ing.name);

              return (
                <div
                  key={ing.name}
                  className={`h-[56px] px-2.5 py-1 rounded-2xl border flex flex-col justify-between transition-all duration-200 overflow-hidden w-full ${
                    isStop
                      ? "bg-rose-50/50 border-rose-200/80 shadow-[0_2px_8px_rgba(244,63,94,0.04)]"
                      : "bg-emerald-50/20 border-emerald-100/70 shadow-[0_2px_8px_rgba(15,23,42,0.02)]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 w-full min-w-0 pt-0.5">
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={ing.name}
                        className="w-7 h-7 sm:w-8 sm:h-8 object-contain drop-shadow-xs shrink-0 select-none"
                        loading="lazy"
                      />
                    ) : (
                      <span className={`w-3 h-3 rounded-full shrink-0 ${isStop ? "bg-rose-400" : "bg-emerald-300"}`} />
                    )}

                    <span
                      className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold shrink-0 whitespace-nowrap leading-tight ${
                        isStop
                          ? "bg-white/90 border border-rose-200/70 text-rose-700"
                          : "bg-white/90 border border-slate-200/60 text-slate-700"
                      }`}
                    >
                      {ing.weight} г
                    </span>
                  </div>

                  <span
                    className={`text-[11.5px] font-bold leading-none truncate block w-full pb-0.5 ${
                      isStop ? "text-rose-950" : "text-slate-800"
                    }`}
                    title={ing.name}
                  >
                    {ing.name}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="border border-dashed border-slate-200 p-6 rounded-2xl text-center">
            <span className="text-[12px] text-slate-400 font-bold font-sans">Список сырья пуст</span>
            <p className="text-[11px] text-slate-500 mt-1 font-sans">Ингредиенты появятся при фиксации рациона Системой.</p>
          </div>
        )}
      </div>

      {/* 2. Cooked dishes — Open layout without wrapper container */}
      <div className="space-y-2.5 w-full">
        <div className="flex items-center gap-2 px-1">
          <img src={bowlIcon} alt="Блюда дня" className="w-6 h-6 object-contain shrink-0 drop-shadow-xs" />
          <h2 className="text-[12.5px] sm:text-sm font-bold tracking-wider text-slate-700 uppercase truncate">
            ПРИГОТОВЛЕНО СЕГОДНЯ / БЛЮДА ДНЯ
          </h2>
        </div>

        {cookedBookDishes.length === 0 && todayCustomDishes.length === 0 ? (
          <div className="bg-white rounded-3xl border border-white shadow-[0_4px_16px_rgba(15,23,42,0.08)] p-6 text-center flex flex-col items-center justify-center">
            <img src={bowlIcon} alt="Пусто" className="w-10 h-10 object-contain opacity-50 mb-2" />
            <span className="text-[13px] font-bold text-slate-600 font-sans">
              В этот день блюда не фиксировались
            </span>
            <p className="text-[11.5px] text-slate-400 max-w-[240px] mt-1 leading-snug font-sans">
              Приготовьте блюдо из Книги рецептов или зафиксируйте его в «Сделай сам»
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {/* Book Recipes */}
            {cookedBookDishes.map((dish) => (
              <div
                key={dish.id}
                className="bg-white rounded-3xl border border-white shadow-[0_4px_16px_rgba(15,23,42,0.08)] p-2.5 flex flex-col justify-between overflow-hidden"
              >
                <div>
                  <div className="w-full h-24 rounded-2xl bg-slate-100 overflow-hidden relative border border-slate-100">
                    <img src={dish.image} alt={dish.name} className="w-full h-full object-cover" />
                    <div className="absolute top-2 left-2">
                      <span className="text-[9.5px] font-extrabold tracking-wider uppercase px-2 py-0.5 rounded-md bg-emerald-600 text-white shadow-xs leading-none">
                        КНИГА
                      </span>
                    </div>
                  </div>

                  <h3
                    className="text-[12.5px] font-bold text-slate-800 line-clamp-2 mt-2 leading-snug min-h-[34px]"
                    title={dish.name}
                  >
                    {dish.name}
                  </h3>

                  <div className="flex items-center justify-between gap-1 mt-1.5">
                    <span className="text-[11px] font-black px-2 py-0.5 rounded-lg whitespace-nowrap bg-emerald-100/70 text-emerald-800 border border-emerald-200/50">
                      {dish.calories} ккал
                    </span>
                    <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 shrink-0 whitespace-nowrap">
                      <Clock className="w-3 h-3 text-slate-400" /> {dish.time || "—"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1 bg-slate-50/70 rounded-xl p-1.5 mt-2.5 border border-slate-100 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-[9px] font-bold text-slate-400 leading-tight">Белки</span>
                    <span className="text-[10.5px] sm:text-[11px] font-black text-slate-700 leading-tight mt-0.5">
                      {formatMacroGrams(dish.protein)} г
                    </span>
                  </div>
                  <div className="flex flex-col items-center justify-center border-x border-slate-200/50">
                    <span className="text-[9px] font-bold text-slate-400 leading-tight">Жиры</span>
                    <span className="text-[10.5px] sm:text-[11px] font-black text-slate-700 leading-tight mt-0.5">
                      {formatMacroGrams(dish.fat)} г
                    </span>
                  </div>
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-[9px] font-bold text-emerald-600 leading-tight">Волокна</span>
                    <span className="text-[10.5px] sm:text-[11px] font-black text-emerald-600 leading-tight mt-0.5">
                      {formatMacroGrams(dish.fiber)} г
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {/* Custom DIY Dishes */}
            {todayCustomDishes.map((dish) => {
              const isPhoto = !!dish.image && dish.image.length > 0;
              const badgeText = isPhoto ? "ФОТО" : "СБОРКА";

              return (
                <div
                  key={dish.id}
                  className="bg-white rounded-3xl border border-white shadow-[0_4px_16px_rgba(15,23,42,0.08)] p-2.5 flex flex-col justify-between overflow-hidden"
                >
                  <div>
                    <div className="w-full h-24 rounded-2xl bg-slate-100 overflow-hidden relative border border-slate-100">
                      {dish.image ? (
                        <img src={dish.image} alt={dish.name} className="w-full h-full object-cover" />
                      ) : (
                        <IngredientCollage ingredients={dish.ingredients || []} containerHeight="h-24" />
                      )}
                      <div className="absolute top-2 left-2">
                        <span className="text-[9.5px] font-extrabold tracking-wider uppercase px-2 py-0.5 rounded-md bg-emerald-600 text-white shadow-xs leading-none">
                          {badgeText}
                        </span>
                      </div>
                    </div>

                    <h3
                      className="text-[12.5px] font-bold text-slate-800 line-clamp-2 mt-2 leading-snug min-h-[34px]"
                      title={dish.name}
                    >
                      {dish.name}
                    </h3>

                    <div className="flex items-center justify-between gap-1 mt-1.5">
                      <span className="text-[11px] font-black px-2 py-0.5 rounded-lg whitespace-nowrap bg-emerald-100/70 text-emerald-800 border border-emerald-200/50">
                        {dish.calories || 0} ккал
                      </span>
                      <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 shrink-0 whitespace-nowrap">
                        <Clock className="w-3 h-3 text-slate-400" /> {dish.time || "—"}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1 bg-slate-50/70 rounded-xl p-1.5 mt-2.5 border border-slate-100 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <span className="text-[9px] font-bold text-slate-400 leading-tight">Белки</span>
                      <span className="text-[10.5px] sm:text-[11px] font-black text-slate-700 leading-tight mt-0.5">
                        {formatMacroGrams(dish.protein ?? 0)} г
                      </span>
                    </div>
                    <div className="flex flex-col items-center justify-center border-x border-slate-200/50">
                      <span className="text-[9px] font-bold text-slate-400 leading-tight">Жиры</span>
                      <span className="text-[10.5px] sm:text-[11px] font-black text-slate-700 leading-tight mt-0.5">
                        {formatMacroGrams(dish.fat ?? 0)} г
                      </span>
                    </div>
                    <div className="flex flex-col items-center justify-center">
                      <span className="text-[9px] font-bold text-emerald-600 leading-tight">Волокна</span>
                      <span className="text-[10.5px] sm:text-[11px] font-black text-emerald-600 leading-tight mt-0.5">
                        {formatMacroGrams(dish.fiber ?? 0)} г
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}