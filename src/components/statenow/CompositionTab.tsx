import React from "react";
import { Utensils, Clock, Flame } from "lucide-react";
import { motion } from "motion/react";
import AnnaTabSpoiler from "./AnnaTabSpoiler";
import { NextStepRecommendation } from "../../utils/nextStepEngine";
import IngredientCollage from "../IngredientCollage";

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="space-y-5"
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
          <h2 className="text-[14px] font-black text-slate-850 tracking-tight uppercase flex items-center gap-1.5 select-none font-sans">
            <span className="text-emerald-500">⚖️</span> Вес сырья за день
          </h2>
          <span className="text-[10px] uppercase font-mono font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
            Всего: {totalMass} г
          </span>
        </div>
        <p className="text-[11.5px] text-gray-400 mb-4 leading-normal font-sans">
          Общие очищенные ингредиенты всех ваших блюд дня с суммированным сухим или чистым весом.
        </p>

        {aggregatedIngredients.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {aggregatedIngredients.map((ing) => (
              <div 
                key={ing.name} 
                className={`px-3 py-1.5 rounded-2xl border text-[11.5px] font-semibold flex items-center gap-1.5 transition-all ${
                  ing.status === "red" 
                    ? "bg-rose-50 border-rose-100 text-rose-700" 
                    : (ing.status === "yellow" ? "bg-amber-50 border-amber-100 text-amber-700" : "bg-[#F0FDF4] border-emerald-150/40 text-emerald-800")
                }`}
              >
                <span className="font-extrabold">{ing.name}</span>
                <span className="opacity-35 font-normal">•</span>
                <span className="font-mono">{ing.weight} г</span>
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

      {/* Cooked dishes archive or history list */}
      <div className="bg-white rounded-[32px] border border-gray-100 shadow-[0_8px_24px_rgba(43,49,55,0.02)] p-5 text-left">
        <h2 className="text-[14px] font-black text-slate-850 tracking-tight mb-4 uppercase flex items-center gap-1.5 select-none font-sans">
          <span className="text-emerald-500">📖</span> Приготовлено сегодня / Архив дня
        </h2>

        <div className="grid grid-cols-2 gap-3">
          {cookedBookDishes.length === 0 && todayCustomDishes.length === 0 ? (
            <div className="col-span-2 border border-dashed border-slate-200 p-6 rounded-2xl text-center flex flex-col items-center justify-center">
              <Utensils className="w-8 h-8 text-slate-350 mb-2" />
              <span className="text-[13px] font-extrabold text-slate-400 font-sans">Архив блюд пуст</span>
              <p className="text-[11.5px] text-slate-400 max-w-[200px] mt-1 leading-snug font-sans">
                Приготовьте блюда из Книги или создайте рецепт в меню «Сделай сам»
              </p>
            </div>
          ) : (
            <>
              {/* Book Recipes */}
              {cookedBookDishes.map((dish) => (
                <div key={dish.id} className="bg-slate-50 rounded-[20px] p-2 flex flex-col gap-2 relative border border-slate-100/80 hover:bg-slate-100/60 transition-all overflow-hidden">
                  <div className="absolute top-3 left-3 z-10 bg-indigo-100/90 backdrop-blur-sm text-indigo-700 text-[9px] font-bold px-2 py-0.5 rounded shadow-xs border border-indigo-200 font-mono">
                    КНИГА
                  </div>
                  
                  <div className="w-full h-24 rounded-2xl bg-gray-100 overflow-hidden relative">
                    <img src={dish.image} alt={dish.name} className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                  </div>
                  
                  <div className="flex-1 text-left min-w-0 px-1">
                    <h3 className="text-[12.5px] font-extrabold text-slate-800 tracking-tight leading-snug line-clamp-2">
                      {dish.name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100/50">{dish.calories} ккал</span>
                      <span className="text-[9.5px] font-bold text-slate-400 flex items-center gap-0.5">
                        <Clock className="w-3 h-3" /> {dish.time}
                      </span>
                    </div>
                    
                    <div className="flex gap-1.5 mt-1.5 text-[9.5px] font-semibold text-slate-500">
                      <span>Б: <strong className="text-slate-700">{dish.protein} г</strong></span>
                      <span>Ж: <strong className="text-slate-700">{dish.fat} г</strong></span>
                      <span>У: <strong className="text-emerald-600">{dish.fiber} г</strong></span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Custom DIY Dishes */}
              {todayCustomDishes.map((dish) => {
                const isPhoto = !!dish.image && dish.image.length > 0;
                const badgeText = isPhoto ? "ФОТО" : "СБОРКА";
                const badgeColors = isPhoto 
                  ? "bg-sky-100/90 text-sky-700 border-sky-200" 
                  : "bg-emerald-100/90 text-emerald-700 border-emerald-200";
                const bgHover = isPhoto ? "hover:bg-sky-50/50" : "hover:bg-emerald-50/50";
                const bgBase = isPhoto ? "bg-sky-50/20 border-sky-100/50" : "bg-emerald-50/20 border-emerald-100/50";

                return (
                  <div key={dish.id} className={`${bgBase} rounded-[20px] p-2 flex flex-col gap-2 relative border ${bgHover} transition-all overflow-hidden`}>
                    <div className={`absolute top-3 left-3 z-10 backdrop-blur-sm text-[9px] font-bold px-2 py-0.5 rounded shadow-xs border font-mono ${badgeColors}`}>
                      {badgeText}
                    </div>
                    
                    <div className="w-full h-24 rounded-2xl bg-gray-100 overflow-hidden relative">
                      {dish.image ? (
                        <img src={dish.image} alt={dish.name} className="w-full h-full object-cover" />
                      ) : (
                        <IngredientCollage ingredients={dish.ingredients || []} containerHeight="h-24" />
                      )}
                      <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                    </div>
                    
                    <div className="flex-1 text-left min-w-0 px-1">
                      <h3 className="text-[12.5px] font-extrabold text-slate-800 tracking-tight leading-snug line-clamp-2">
                        {dish.name}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100/50">{dish.calories || 0} ккал</span>
                        {dish.time && (
                          <span className="text-[9.5px] font-bold text-slate-400 flex items-center gap-0.5">
                            <Clock className="w-3 h-3" /> {dish.time}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex gap-1.5 mt-1.5 text-[9.5px] font-semibold text-slate-500">
                        <span>Б: <strong className="text-slate-700">{dish.protein || 0} г</strong></span>
                        <span>Ж: <strong className="text-slate-700">{dish.fat || 0} г</strong></span>
                        <span>У: <strong className="text-emerald-600">{dish.fiber || 0} г</strong></span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
