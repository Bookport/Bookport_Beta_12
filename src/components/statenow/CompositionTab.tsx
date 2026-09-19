import React, { useEffect } from "react";
import { Utensils, Clock } from "lucide-react";
import { motion } from "motion/react";
import AnnaTabSpoiler from "./AnnaTabSpoiler";
import { NextStepRecommendation } from "../../utils/nextStepEngine";
import IngredientCollage from "../IngredientCollage";
import { ingestAchievementEvent } from "../../modules/achievements";
import { getIngredientImage } from "../../utils/ingredientMapper";
import { getIngredientAlias } from "../../utils/ingredientAliasMapper";

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
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="space-y-5 pb-36 w-full max-w-[360px] mx-auto overflow-x-hidden"
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
      {/* Total Raw Mass Weight list of ingredients */}
      <div className="bg-white rounded-[32px] border border-gray-100 shadow-[0_8px_24px_rgba(43,49,55,0.02)] p-5 text-left w-full overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold tracking-wider text-slate-700 uppercase">
            СОСТАВ И ВЕС СЫРЬЯ ЗА ДЕНЬ
          </h2>
          <span className="text-[10px] uppercase font-mono font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
            ВСЕГО: {totalMass} Г
          </span>
        </div>
        <p className="text-[11.5px] text-gray-400 mb-4 leading-normal font-sans">
          Общие очищенные ингредиенты всех ваших блюд дня с суммированным сухим или чистым весом.
        </p>

        {aggregatedIngredients.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 w-full">
            {aggregatedIngredients.map((ing) => {
              const thumb = getIngredientImage(getIngredientAlias(ing.name)) || getIngredientImage(ing.name);
              return (
                <div
                  key={ing.name}
                  className="h-[58px] px-2.5 py-1 rounded-2xl border flex flex-col justify-between shadow-xs bg-slate-50/50 border-slate-200/70 overflow-hidden w-full"
                >
                  <div className="flex items-center justify-between gap-1 w-full min-w-0">
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={ing.name}
                        className="w-9 h-9 object-contain drop-shadow-sm shrink-0 select-none -my-1"
                        loading="lazy"
                      />
                    ) : (
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-300 shrink-0" />
                    )}
                    <span className="px-1.5 py-0.5 rounded-md text-[10.5px] font-black shrink-0 whitespace-nowrap bg-white/95 border border-slate-200 text-slate-700">
                      {ing.weight} г
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-800 leading-none truncate block w-full mb-0.5">
                    {ing.name}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="border border-dashed border-slate-200 p-6 rounded-2xl text-center">
            <span className="text-[12px] text-slate-400 font-bold font-sans">Список сырья пуст</span>
            <p className="text-[11px] text-slate-500 mt-1 font-sans">Ингредиенты появятся при заполнении рациона в книге или меню Сделай сам.</p>
          </div>
        )}
      </div>

      {/* Cooked dishes — scoped to currentDayIndex */}
      <div className="px-2.5 py-3.5 sm:p-5 rounded-3xl border border-slate-100 bg-white shadow-sm w-full overflow-hidden">
        <h2 className="text-sm font-bold tracking-wider text-slate-700 uppercase mb-3">
          ПРИГОТОВЛЕНО СЕГОДНЯ
        </h2>

        {cookedBookDishes.length === 0 && todayCustomDishes.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-2xl p-3.5 shadow-sm space-y-2">
            <div className="border border-dashed border-slate-200 p-5 rounded-2xl text-center flex flex-col items-center justify-center">
              <Utensils className="w-7 h-7 text-slate-300 mb-2" />
              <span className="text-[12.5px] font-bold text-slate-500 font-sans">В этот день блюда не фиксировались</span>
              <p className="text-[11px] text-slate-400 max-w-[220px] mt-1 leading-snug font-sans">
                Приготовьте блюдо из Книги или создайте его в «Сделай сам»
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {/* Book Recipes */}
            {cookedBookDishes.map((dish) => (
              <div key={dish.id} className="bg-white border border-slate-100 rounded-2xl p-2 sm:p-2.5 shadow-sm flex flex-col overflow-hidden">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-indigo-50 border border-indigo-100 text-indigo-700">
                    КНИГА
                  </span>
                </div>

                <div className="w-full h-24 rounded-2xl bg-gray-100 overflow-hidden relative mt-1.5">
                  <img src={dish.image} alt={dish.name} className="w-full h-full object-cover" />
                </div>

                <h3 className="text-[12.5px] font-bold text-slate-800 line-clamp-1 mt-1.5 leading-tight">{dish.name}</h3>

                <div className="flex flex-wrap gap-1 mt-1.5">
                  <span className="whitespace-nowrap text-[11px] font-black block text-slate-700">Б: {formatMacroGrams(dish.protein) + " г"}</span>
                  <span className="whitespace-nowrap text-[11px] font-black block text-slate-700">Ж: {formatMacroGrams(dish.fat) + " г"}</span>
                  <span className="whitespace-nowrap text-[11px] font-black block text-emerald-700">Волокна: {formatMacroGrams(dish.fiber) + " г"}</span>
                </div>

                <div className="flex items-center justify-between gap-1 mt-2 w-full">
                  <span className="text-[11px] font-black px-1.5 py-0.5 rounded-md whitespace-nowrap bg-emerald-100/80 text-emerald-800 border border-emerald-200/60">
                    {dish.calories} ккал
                  </span>
                  <span className="text-[11px] font-bold text-slate-500 flex items-center gap-0.5 shrink-0 whitespace-nowrap">
                    <Clock className="w-3 h-3" /> {dish.time}
                  </span>
                </div>
              </div>
            ))}

            {/* Custom DIY Dishes */}
            {todayCustomDishes.map((dish) => {
              const isPhoto = !!dish.image && dish.image.length > 0;
              const badgeText = isPhoto ? "ФОТО" : "СБОРКА";
              const badgeClass = isPhoto
                ? "bg-sky-50 border-sky-100 text-sky-700"
                : "bg-emerald-50 border-emerald-100 text-emerald-700";

              return (
                <div key={dish.id} className="bg-white border border-slate-100 rounded-2xl p-2 sm:p-2.5 shadow-sm flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between gap-1">
                    <span className={`text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded border ${badgeClass}`}>
                      {badgeText}
                    </span>
                  </div>

                  <div className="w-full h-24 rounded-2xl bg-gray-100 overflow-hidden relative mt-1.5">
                    {dish.image ? (
                      <img src={dish.image} alt={dish.name} className="w-full h-full object-cover" />
                    ) : (
                      <IngredientCollage ingredients={dish.ingredients || []} containerHeight="h-24" />
                    )}
                  </div>

                  <h3 className="text-[12.5px] font-bold text-slate-800 line-clamp-1 mt-1.5 leading-tight">{dish.name}</h3>

                  <div className="flex flex-wrap gap-1 mt-1.5">
                    <span className="whitespace-nowrap text-[11px] font-black block text-slate-700">Б: {formatMacroGrams(dish.protein ?? 0) + " г"}</span>
                    <span className="whitespace-nowrap text-[11px] font-black block text-slate-700">Ж: {formatMacroGrams(dish.fat ?? 0) + " г"}</span>
                    <span className="whitespace-nowrap text-[11px] font-black block text-emerald-700">Волокна: {formatMacroGrams(dish.fiber ?? 0) + " г"}</span>
                  </div>

                  <div className="flex items-center justify-between gap-1 mt-2 w-full">
                    <span className="text-[11px] font-black px-1.5 py-0.5 rounded-md whitespace-nowrap bg-emerald-100/80 text-emerald-800 border border-emerald-200/60">
                      {dish.calories || 0} ккал
                    </span>
                    {dish.time ? (
                      <span className="text-[11px] font-bold text-slate-500 flex items-center gap-0.5 shrink-0 whitespace-nowrap">
                        <Clock className="w-3 h-3" /> {dish.time}
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-slate-500 flex items-center gap-0.5 shrink-0 whitespace-nowrap">
                        <Clock className="w-3 h-3" /> —
                      </span>
                    )}
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
