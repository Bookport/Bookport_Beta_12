import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronLeft,
  Heart,
  Clock,
  X,
  Sparkles,
  AlertTriangle,
  Check,
  Leaf,
  Zap,
  Shield,
  Info,
  Apple,
  Activity,
} from "lucide-react";
import BottomBar from "./BottomBar";
import { getCategoryColor, DEFAULT_CATEGORIES } from "../utils/categoryColors";
import SaveDishModal from "./SaveDishModal";
import IngredientCollage from "./IngredientCollage";
import { resolveAvatarForCompliance } from "../utils/annaAvatarResolver";
import { checkWFPB } from "../utils/wfpbRules";
import type { SavedDish } from "../types/dishes";
import { getSavedDishes } from "../modules/mixer/services/mixerSave";
import { getRecipeImagePath } from "../utils/recipeImageMapper";
import { complimentsBackData } from "../data/compliments_back";
import { breakfastBackData } from "../data/breakfast_back";
import { lunchBackData } from "../data/lunch_back";
import { dinnerBackData } from "../data/dinner_back";
import { recipeDayBackData } from "../data/recipe_day_back";
import { mustHaveBackData } from "../data/must_have_back";
import { useAppStore } from "../store/useAppStore";
import { api } from "../utils/api";
import { clientLogger } from "../utils/clientLogger";

function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const months = [
    "января", "февраля", "марта", "апреля", "мая", "июня",
    "июля", "августа", "сентября", "октября", "ноября", "декабря"
  ];
  return `${d.getDate()} ${months[d.getMonth()]}, ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

interface RecipesScreenProps {
  onBack?: () => void;
  savedDishes?: SavedDish[];
  onToggleFavorite?: (id: string) => void;
  onSaveDishCategory?: (id: string, category: string) => void;
  onNavigateHome?: () => void;
  onNavigateDiary?: () => void;
  onNavigateProgress?: () => void;
}

export default function RecipesScreen({
  onBack: propsOnBack,
  savedDishes: propsSavedDishes,
  onToggleFavorite: propsOnToggleFavorite,
  onSaveDishCategory: propsOnSaveDishCategory,
  onNavigateHome: propsOnNavigateHome,
  onNavigateDiary: propsOnNavigateDiary,
  onNavigateProgress: propsOnNavigateProgress,
}: RecipesScreenProps) {
  const setScreen = useAppStore((s) => s.setScreen);
  const onBack = propsOnBack || (() => setScreen("my-day"));
  const onToggleFavorite = propsOnToggleFavorite || (() => {});
  const onSaveDishCategory = propsOnSaveDishCategory || (() => {});
  const onNavigateHome = propsOnNavigateHome || (() => setScreen("my-day"));
  const onNavigateDiary = propsOnNavigateDiary || (() => setScreen("what-i-eat"));
  const onNavigateProgress = propsOnNavigateProgress || (() => setScreen("habits-twenty"));
  const savedDishes = propsSavedDishes || [];
  const [activeTab, setActiveTab] = useState("Все");
  const [selectedDishId, setSelectedDishId] = useState<string | null>(null);
  const [editingDish, setEditingDish] = useState<SavedDish | null>(null);

  // Merge regular dishes with mixer dishes
  const allDishes = useMemo(() => {
    let mixerDishes: any[] = [];
    try {
      mixerDishes = getSavedDishes();
    } catch (e) {
      console.error("RecipesScreen: failed to read mixer dishes", e);
    }
    mixerDishes = mixerDishes.map((m: any) => ({
      id: m.id,
      name: m.name,
      time: m.time,
      tag: m.tag,
      category: m.category === 'mixer' ? 'Миксер' : m.category,
      image: m.image || '',
      isFavorite: false,
      isNew: false,
      createdAt: m.time,
      ingredients: m.ingredients.map(i => ({ name: i.name, weight: '75 г', status: i.status })),
      calories: m.calories,
      protein: String(m.protein),
      fiber: String(m.fiber),
      fat: String(m.fat),
      annaTip: m.annaTip,
      annaComment: m.annaComment,
    }));
    const seen = new Set(savedDishes.map(d => d.id));
    const uniqueMixer = mixerDishes.filter(d => !seen.has(d.id));
    return [...uniqueMixer, ...savedDishes] as SavedDish[];
  }, [savedDishes]);

  const allCategories = useMemo(() => {
    const set = new Set<string>();
    DEFAULT_CATEGORIES.forEach((c) => set.add(c));
    allDishes.forEach((d) => {
      if (d.category) set.add(d.category);
    });
    return Array.from(set);
  }, [allDishes]);

  const tabs = useMemo(() => {
    const used = new Set(allDishes.map((d) => d.category).filter(Boolean));
    const defaults = DEFAULT_CATEGORIES.filter((c) => used.has(c));
    const customs = Array.from(used).filter(
      (c) => !DEFAULT_CATEGORIES.some((d) => d.toLowerCase() === c.toLowerCase())
    );
    return ["Все", ...defaults, ...customs];
  }, [allDishes]);

  const filteredDishes = useMemo(() => {
    if (activeTab === "Все") return allDishes;
    return allDishes.filter((d) => d.category === activeTab);
  }, [allDishes, activeTab]);

  // ── Infinite scroll pagination ──
  const PAGE_SIZE = 40;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const paginatedDishes = useMemo(() => {
    return filteredDishes.slice(0, visibleCount);
  }, [filteredDishes, visibleCount]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeTab, filteredDishes.length]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount(prev => Math.min(prev + PAGE_SIZE, filteredDishes.length));
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [filteredDishes.length]);

  const selectedDish = useMemo(
    () => allDishes.find((d) => d.id === selectedDishId) || null,
    [allDishes, selectedDishId]
  );

  const handleOpenEdit = (dish: SavedDish) => {
    setEditingDish(dish);
  };

  const handleSaveCategory = (category: string) => {
    if (editingDish) {
      const col = getCategoryColor(category);
      onSaveDishCategory(editingDish.id, category);
      setEditingDish(null);
      setActiveTab(category);
    }
  };

  const allSavedCategories = useMemo(
    () => allDishes.map((d) => d.category).filter(Boolean) as string[],
    [allDishes]
  );

  const getTagIcon = (tag?: string) => {
    if (!tag) return <Leaf className="w-3.5 h-3.5" />;
    const t = tag.toLowerCase();
    if (t.includes("энерги")) return <Zap className="w-3.5 h-3.5" />;
    if (t.includes("белок") || t.includes("протеин")) return <Shield className="w-3.5 h-3.5" />;
    return <Leaf className="w-3.5 h-3.5" />;
  };

  const getTagColorClass = (tag?: string) => {
    if (!tag) return "bg-emerald-50 text-emerald-600";
    const t = tag.toLowerCase();
    if (t.includes("энерги")) return "bg-amber-50 text-amber-600";
    if (t.includes("белок") || t.includes("протеин")) return "bg-blue-50 text-blue-600";
    return "bg-emerald-50 text-emerald-600";
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50/70">
      {/* Header */}
      <div className="px-4 pt-5 pb-2 flex items-center justify-between">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-gray-600 hover:bg-gray-100 active:scale-95 transition-all cursor-pointer shadow-sm"
        >
          <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
        </button>
        <h1 className="text-lg font-extrabold text-gray-800">Мои блюда</h1>
        <div className="w-9 h-9" />
      </div>

      {/* Dynamic Tabs */}
      <div className="px-4 py-2 overflow-x-auto flex flex-nowrap gap-2 pb-2 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full">
          {tabs.map((tab) => {
            const isActive = activeTab === tab;
            const col = tab === "Все" ? null : getCategoryColor(tab);
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-all cursor-pointer ${
                  isActive
                    ? "bg-gray-200 text-gray-800 shadow-md"
                    : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
                }`}
              >
                {tab === "Все" && isActive ? "★ Все" : tab}
              </button>
            );
          })}
      </div>

      {/* Dish Grid */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {filteredDishes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center pt-16">
            <span className="text-5xl mb-3">🍽</span>
            <p className="text-base font-bold text-gray-800 mb-1">Нет блюд в этой категории</p>
            <p className="text-sm text-gray-500 mb-4">Сфотографируйте блюдо, чтобы оно появилось здесь</p>
            <button
              onClick={onNavigateDiary}
              className="px-5 py-2.5 rounded-2xl bg-brand-green-pure text-white font-bold text-sm hover:bg-brand-green-dark transition-colors cursor-pointer"
            >
              Добавить блюдо
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 mt-1">
            {paginatedDishes.map((dish) => {
              const col = getCategoryColor(dish.category);
              const shadowColor = dish.categoryColor || col.shadow;
              const dishCalories = dish.isBookRecipe && dish.bookRecipeRef ? (() => {
                const r = dish.bookRecipeRef;
                const bd = (r.type === "compliment" ? complimentsBackData :
                  r.type === "breakfast" ? breakfastBackData :
                  r.type === "lunch" ? lunchBackData :
                  r.type === "dinner" ? dinnerBackData :
                  r.type === "recipe_of_day" ? recipeDayBackData :
                  r.type === "must_have" ? mustHaveBackData : null)?.find((d:any) => d.id === `${r.type}_${r.id}`);
                if (!bd) return 0;
                for (const line of bd.kbju) {
                  const m = line.match(/калорийность:\s*(\d+)/i);
                  if (m) return parseInt(m[1]);
                }
                return 0;
              })() : dish.calories;
              return (
                <motion.div
                  key={dish.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => setSelectedDishId(dish.id)}
                  className="bg-white rounded-[20px] p-3 flex flex-col gap-2 transition-all duration-200 cursor-pointer active:scale-[0.98] relative"
                  style={{ boxShadow: `0 6px 20px ${shadowColor}` }}
                >
                  {dish.isNew && (
                    <div className="absolute -top-1.5 -right-1.5 z-10 bg-amber-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                      НОВОЕ
                    </div>
                  )}
                  <div className="w-full h-28 rounded-[14px] bg-gray-100 overflow-hidden relative">
                    {dish.image ? (
                      <img src={dish.image} alt={dish.name} className="w-full h-full object-cover" />
                    ) : (
                      <IngredientCollage ingredients={dish.ingredients} containerHeight="h-28" />
                    )}
                    <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                  </div>
                  {dish.isBookRecipe && (
                    <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-violet-50 text-violet-700 text-[10px] font-bold self-start border border-violet-200">
                      <span>📖</span>
                      <span>{dish.tag}</span>
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-1">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[13px] font-extrabold text-gray-800 leading-snug line-clamp-2">
                        {dish.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-gray-400">{dishCalories} ккал</span>
                        <span className="text-[10px] font-bold text-gray-300">•</span>
                        <span className="text-[10px] font-bold text-gray-400 flex items-center gap-0.5">
                          <Clock className="w-3 h-3" /> {formatDate(dish.createdAt)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); onToggleFavorite(dish.id); }}
                      className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      <Heart
                        className={`w-4 h-4 ${dish.isFavorite ? "fill-red-500 text-red-500" : "text-gray-400"}`}
                      />
                    </button>
                  </div>
                  {dish.isNew && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleOpenEdit(dish); }}
                      className="w-full py-1.5 rounded-xl bg-amber-50 text-amber-700 text-[11px] font-bold hover:bg-amber-100 transition-colors cursor-pointer"
                    >
                      Настроить категорию
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
        {visibleCount < filteredDishes.length && (
          <div ref={sentinelRef} className="h-10 w-full" />
        )}
      </div>

      {/* Dish Detail Modal */}
      <AnimatePresence>
        {selectedDish && (
          <motion.div
            key="dish-detail-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
            onClick={() => setSelectedDishId(null)}
          >
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-[28px] w-full max-w-lg mx-4 max-h-[80dvh] overflow-y-auto overscroll-contain shadow-xl"
            >
              {/* Modal Image */}
              <div className="relative w-full h-48 rounded-t-[28px] overflow-hidden bg-gray-100">
                {selectedDish.image ? (
                  <img src={selectedDish.image} alt={selectedDish.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 z-0">
                    <IngredientCollage ingredients={selectedDish.ingredients} containerHeight="h-48" />
                  </div>
                )}
                <button
                  onClick={() => setSelectedDishId(null)}
                  className="absolute top-3 right-3 w-8 h-8 z-50 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-4 pt-8 z-30">
                  <h2 className="text-xl font-extrabold text-white drop-shadow-lg">{selectedDish.name}</h2>
                </div>
              </div>

              <div className="p-5 space-y-4">
                {selectedDish.category && (
                  <div className="flex items-center gap-2">
                    <span
                      className="px-3 py-1 rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: getCategoryColor(selectedDish.category).badge }}
                    >
                      {selectedDish.category}
                    </span>
                    {selectedDish.isNew && (
                      <button
                        onClick={() => handleOpenEdit(selectedDish)}
                        className="text-xs font-bold text-amber-600 underline cursor-pointer"
                      >
                        Изменить
                      </button>
                    )}
                  </div>
                )}

                {selectedDish.isBookRecipe && selectedDish.bookRecipeRef && (() => {
                  const ref = selectedDish.bookRecipeRef!;
                  const r = ref.type === "compliment" ? complimentsBackData :
                    ref.type === "breakfast" ? breakfastBackData :
                    ref.type === "lunch" ? lunchBackData :
                    ref.type === "dinner" ? dinnerBackData :
                    ref.type === "recipe_of_day" ? recipeDayBackData :
                    ref.type === "must_have" ? mustHaveBackData : null;
                  const bd = r && r.find((d:any) => d.id === `${ref.type}_${ref.id}`);
                  if (!bd) return null;
                  return (
                    <div className="space-y-3 text-[14px] text-gray-700" style={{fontFamily:'"Calibri", "Candara", sans-serif'}}>
                      <div><h4 className="text-[16px] font-bold text-gray-800 mb-1">Ингредиенты:</h4>{bd.ingredients.map((it:string,i:number) => <div key={i} className="ml-2 flex items-start gap-2"><span className="text-gray-400 mt-px">•</span><span>{it}</span></div>)}</div>
                      <div><h4 className="text-[16px] font-bold text-gray-800 mb-1">Способ приготовления:</h4><p className="whitespace-pre-line leading-relaxed">{bd.instructions}</p></div>
                      {bd.kbju.length > 0 && <div className="grid grid-cols-2 gap-x-3 gap-y-1 bg-gray-50 rounded-xl p-3">{bd.kbju.map((it:string,i:number) => {const[l,v]=it.includes(":")?it.split(":"):[it,""];return <div key={i} className="flex items-baseline gap-1 text-[14px]"><span className="text-gray-400 font-normal">{l.trim()}:</span><span className="text-gray-800 font-semibold">{v.trim()}</span></div>})}</div>}
                    </div>
                  );
                })()}

                {!selectedDish.isBookRecipe && (<>

                {/* Macros */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="bg-emerald-50 rounded-xl p-2.5 text-center">
                    <p className="text-lg font-extrabold text-emerald-700">{selectedDish.calories}</p>
                    <p className="text-[10px] font-semibold text-emerald-600">ккал</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-2.5 text-center">
                    <p className="text-lg font-extrabold text-blue-700">{selectedDish.protein}</p>
                    <p className="text-[10px] font-semibold text-blue-600">белок</p>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-2.5 text-center">
                    <p className="text-lg font-extrabold text-amber-700">{selectedDish.fat}</p>
                    <p className="text-[10px] font-semibold text-amber-600">жиры</p>
                  </div>
                  <div className="bg-violet-50 rounded-xl p-2.5 text-center">
                    <p className="text-lg font-extrabold text-violet-700">{selectedDish.fiber}</p>
                    <p className="text-[10px] font-semibold text-violet-600">клетчатка</p>
                  </div>
                </div>

                {/* Anna's Verdict */}
                {(selectedDish.annaTip || selectedDish.annaComment) && (
                  (() => {
                    const text = selectedDish.annaTip || selectedDish.annaComment || "";
                    const violationCount = selectedDish.ingredients.filter(ing => !checkWFPB(ing.name).compliant).length;
                    const isCompliant = violationCount === 0;
                    const avatar = resolveAvatarForCompliance(violationCount, selectedDish.ingredients.length);
                    return (
                      <div className={`rounded-2xl p-4 border ${isCompliant ? "bg-green-50 border-green-200" : "bg-rose-50 border-rose-200"}`}>
                        <div className="flex items-start gap-3">
                          <div className="w-14 h-14 rounded-full overflow-hidden shrink-0 border-2 bg-white shadow-sm" style={{ borderColor: isCompliant ? "#86efac" : "#fecaca" }}>
                            <img
                              src={avatar.src}
                              alt="Анна"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className={`text-xs font-bold mb-1 ${isCompliant ? "text-emerald-700" : "text-rose-700"}`}>Вердикт Анны</p>
                            <p className="text-sm leading-relaxed" style={{ color: "#374151" }}>{text}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })()
                )}

                {/* Ingredients */}
                {selectedDish.ingredients && selectedDish.ingredients.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Ингредиенты</p>
                    <div className="space-y-1.5">
                      {selectedDish.ingredients.map((ing, i) => (
                        <div key={i} className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-gray-50">
                          <div className="flex items-center gap-2">
                            {ing.status === "green" ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : ing.status === "red" ? (
                              <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                            ) : (
                              <Info className="w-3.5 h-3.5 text-amber-500" />
                            )}
                            <span className="text-sm font-medium text-gray-700">{ing.name}</span>
                          </div>
                          <span className="text-xs font-bold text-gray-400">{ing.weight}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Time & Tag */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {formatDate(selectedDish.createdAt)}</span>
                  <span className={`px-2.5 py-1 rounded-full font-bold flex items-center gap-1 ${getTagColorClass(selectedDish.tag)}`}>
                    {getTagIcon(selectedDish.tag)} {selectedDish.tag}
                  </span>
                </div>

                {/* Not new — Edit category button */}
                {!selectedDish.isNew && (
                  <button
                    onClick={() => handleOpenEdit(selectedDish)}
                    className="w-full py-2.5 rounded-2xl bg-gray-100 text-gray-600 font-bold text-sm hover:bg-gray-200 transition-colors cursor-pointer"
                  >
                    Изменить категорию
                  </button>
                )}
                </>)}

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save Category Modal */}
      {editingDish && (
        <SaveDishModal
          dish={editingDish}
          allSavedCategories={allSavedCategories}
          onSave={handleSaveCategory}
          onClose={() => setEditingDish(null)}
        />
      )}

      {/* Bottom Bar */}
      <BottomBar
        onHomeClick={onNavigateHome}
        onDiaryClick={onNavigateDiary}
        onAnalyticsClick={onNavigateProgress}
        activeTab="recipes"
      />
    </div>
  );
}
