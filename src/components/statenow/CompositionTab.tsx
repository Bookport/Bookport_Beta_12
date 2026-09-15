import React, { useEffect } from "react";
import { Utensils, Clock } from "lucide-react";
import { motion } from "motion/react";
import AnnaTabSpoiler from "./AnnaTabSpoiler";
import { NextStepRecommendation } from "../../utils/nextStepEngine";
import IngredientCollage from "../IngredientCollage";
import { ingestAchievementEvent } from "../../modules/achievements";

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
      className="space-y-5 pb-36"
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
      <div className="bg-white rounded-[32px] border border-gray-100 shadow-[0_8px_24px_rgba(43,49,55,0.02)] p-5 text-left">
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
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {aggregatedIngredients.map((ing) => (
              <div
                key={ing.name}
                className="bg-slate-50/90 border border-slate-200/70 rounded-xl px-3 py-2 flex items-center justify-between"
              >
                <span className="text-sm font-medium text-slate-700">{ing.name}</span>
                <span className="text-sm font-bold text-slate-900">{ing.weight} г</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-slate-200 p-6 rounded-2xl text-center">
            <span className="text-[12px] text-slate-400 font-bold font-sans">Список сырья пуст</span>
            <p className="text-[11px] text-slate-500 mt-1 font-sans">Ингредиенты появятся при заполнении рациона в книге или меню Сделай сам.</p>
          </div>
        )}
      </div>

      {/* Cooked dishes — scoped to currentDayIndex */}
      <div>
        <h2 className="text-sm font-bold tracking-wider text-slate-700 uppercase mb-3">
          БЛЮДА ЭТОГО ДНЯ
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
          <div className="grid grid-cols-2 gap-3">
            {/* Book Recipes */}
            {cookedBookDishes.map((dish) => (
              <div key={dish.id} className="bg-white border border-slate-100 rounded-2xl p-3.5 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-indigo-50 border border-indigo-100 text-indigo-700">
                    КНИГА
                  </span>
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {dish.time}
                  </span>
                </div>

                <div className="w-full h-24 rounded-2xl bg-gray-100 overflow-hidden relative">
                  <img src={dish.image} alt={dish.name} className="w-full h-full object-cover" />
                </div>

                <h3 className="text-sm font-semibold text-slate-800 line-clamp-1">{dish.name}</h3>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-emerald-600">{dish.calories} ккал</span>
                </div>

                <div className="text-[11px] font-medium text-slate-500">
                  Б: {String(dish.protein).replace(/ г$/, "")} г · Ж: {String(dish.fat).replace(/ г$/, "")} г · У: {String(dish.fiber).replace(/ г$/, "")} г
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
                <div key={dish.id} className="bg-white border border-slate-100 rounded-2xl p-3.5 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded border ${badgeClass}`}>
                      {badgeText}
                    </span>
                    {dish.time && (
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {dish.time}
                      </span>
                    )}
                  </div>

                  <div className="w-full h-24 rounded-2xl bg-gray-100 overflow-hidden relative">
                    {dish.image ? (
                      <img src={dish.image} alt={dish.name} className="w-full h-full object-cover" />
                    ) : (
                      <IngredientCollage ingredients={dish.ingredients || []} containerHeight="h-24" />
                    )}
                  </div>

                  <h3 className="text-sm font-semibold text-slate-800 line-clamp-1">{dish.name}</h3>

                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-emerald-600">{dish.calories || 0} ккал</span>
                  </div>

                  <div className="text-[11px] font-medium text-slate-500">
                    Б: {String(dish.protein || 0).replace(/ г$/, "")} г · Ж: {String(dish.fat || 0).replace(/ г$/, "")} г · У: {String(dish.fiber || 0).replace(/ г$/, "")} г
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
