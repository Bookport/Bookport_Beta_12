import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ChevronLeft, 
  X, 
  Plus, 
  Minus, 
  Trash2, 
  Check, 
  Sparkles, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp,
  UtensilsCrossed,
  PlusCircle,
  HelpCircle,
  Soup,
  Flame,
  Scale
} from "lucide-react";
import { getIngredientImage, normalize, imageMap } from "../utils/ingredientMapper";
import { checkWFPB } from "../utils/wfpbRules";
import { INGREDIENT_CATEGORY_MAP } from "../utils/ingredientCategoryMap";
import { useAppStore, type FoodCacheItem } from "../store/useAppStore";
import ingrGreen from "../assets/ingredients/ingr_green.webp";
import ingrRed from "../assets/ingredients/ingr_red.webp";
import BottomBar from "./BottomBar";

export interface IngredientsScreenProps {
  onBack: () => void;
  onConfirm: (ingredients: any[]) => void;
}

interface DBItem {
  fullName: string;
  shortName: string;
  wfpbStatus: string;
}

function getIngredientSrc(nameRu: string, wfpbStatus: string): string {
  const key = normalize(nameRu);
  return imageMap[key] || (wfpbStatus === "forbidden" ? ingrRed : ingrGreen);
}

export interface SelectedIngredient {
  id: string; // unique
  fullName: string;
  shortName: string;
  weight: number;
  image: string;
  status: "green" | "error" | "blue";
  isCustom?: boolean;
}

export function checkIngredientDisallowed(name: string): { disallowed: boolean; reason: string } {
  const result = checkWFPB(name);
  if (result.compliant) return { disallowed: false, reason: "" };

  const v = result.violations;
  if (v.some(cat => ['animal', 'fish_seafood', 'dairy', 'egg', 'processed_meat', 'honey'].includes(cat))) {
    return { disallowed: true, reason: "ингредиенты животного происхождения" };
  }
  if (v.includes('refined_oil')) {
    return { disallowed: true, reason: "содержит добавленные масла" };
  }
  if (v.includes('added_salt')) {
    return { disallowed: true, reason: "содержит добавленную соль" };
  }
  return { disallowed: true, reason: "запрещённые компоненты" };
}

export default function IngredientsScreen({
  onBack,
  onConfirm
}: IngredientsScreenProps) {
  const foodCache = useAppStore(s => s.foodCache);
  const foodCacheLoading = useAppStore(s => s.foodCacheLoading);
  const fetchFoodCache = useAppStore(s => s.fetchFoodCache);

  useEffect(() => {
    if (foodCache.length === 0 && !foodCacheLoading) fetchFoodCache();
  }, []);

  const CATEGORIES_DATA = useMemo(() => {
    const lowerToItem: Record<string, FoodCacheItem> = {};
    for (const item of foodCache) {
      lowerToItem[item.nameRu.toLowerCase().replace(/ё/g, 'е')] = item;
    }
    const result: Record<string, DBItem[]> = {};
    for (const [cat, names] of Object.entries(INGREDIENT_CATEGORY_MAP)) {
      const items: DBItem[] = [];
      for (const name of names) {
        const real = lowerToItem[name.toLowerCase().replace(/ё/g, 'е')];
        if (real) {
          items.push({ fullName: real.nameRu, shortName: real.nameRu, wfpbStatus: real.wfpbStatus });
        }
      }
      result[cat] = items;
    }
    return result;
  }, [foodCache]);

  // Screen States
  const [selectedIngredients, setSelectedIngredients] = useState<SelectedIngredient[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string>("варка"); // Default cook method

  // Modal controls
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showCustomInput, setShowCustomInput] = useState<boolean>(false);
  const [customNameInput, setCustomNameInput] = useState<string>("");

  // Weight modal controls
  const [weightModalItem, setWeightModalItem] = useState<{ fullName: string; shortName: string; isCustom?: boolean } | null>(null);
  const [weightValue, setWeightValue] = useState<number>(100);

  // Warning modal controls for forbidden custom ingredients
  const [pendingWarningItem, setPendingWarningItem] = useState<{ item: SelectedIngredient } | null>(null);

  // Expandable status of category list accordion
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const keys = Object.keys(CATEGORIES_DATA);
    if (keys.length > 0 && Object.keys(expandedCategories).length === 0) {
      setExpandedCategories({ [keys[0]]: true });
    }
  }, [CATEGORIES_DATA]);

  const toggleCategory = (catName: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [catName]: !prev[catName]
    }));
  };

  // Trigger select standard ingredient
  const handleSelectPredefined = (item: DBItem, catName: string) => {
    setWeightValue(100);
    setWeightModalItem({ fullName: item.fullName, shortName: item.shortName });
    setActiveCategory(null); // close selection window
    if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ingredient-card-viewed', { detail: { name: item.fullName } }))
    }
  };

  // Open custom name form
  const handleOpenCustomInput = () => {
    setCustomNameInput("");
    setShowCustomInput(true);
    setActiveCategory(null);
  };

  // Confirm custom name & bridge to weight modal
  const handleConfirmCustomName = () => {
    if (!customNameInput.trim()) return;
    setWeightValue(100);
    setWeightModalItem({ 
      fullName: customNameInput.trim(), 
      shortName: customNameInput.trim(),
      isCustom: true 
    });
    setShowCustomInput(false);
  };

  // Confirm selected weight inside modal
  const handleConfirmWeight = () => {
    if (!weightModalItem) return;

    const disallowedCheck = checkIngredientDisallowed(weightModalItem.fullName);
    const newIngredient: SelectedIngredient = {
      id: `${weightModalItem.fullName}-${Date.now()}`,
      fullName: weightModalItem.fullName,
      shortName: weightModalItem.shortName,
      weight: weightValue,
      image: getIngredientImage(weightModalItem.shortName) || getIngredientImage(weightModalItem.fullName) || '',
      status: disallowedCheck.disallowed ? "error" : "green",
      isCustom: weightModalItem.isCustom
    };

    setWeightModalItem(null);

    // If it's disallowed, show manual alert dialog requesting confirmation
    if (newIngredient.status === "error") {
      setPendingWarningItem({ item: newIngredient });
    } else {
      setSelectedIngredients(prev => [...prev, newIngredient]);
    }
  };

  // Add the forbidden item anyway after explicit confirmation
  const handleAcceptWarningItem = () => {
    if (!pendingWarningItem) return;
    setSelectedIngredients(prev => [...prev, pendingWarningItem.item]);
    setPendingWarningItem(null);
  };

  // Remove selected ingredient
  const handleRemoveIngredient = (id: string) => {
    setSelectedIngredients(prev => prev.filter(x => x.id !== id));
  };

  // Compile final selection and trigger analysis downstream screen integration
  const handleConfirmAll = () => {
    if (selectedIngredients.length === 0) return;
    
    // Map SelectedIngredient to standard IngredientCard schema expected by CheckCompositionScreen
    const mappedIngredients = selectedIngredients.map(item => ({
      id: item.fullName.toLowerCase().replace(/\s+/g, '-'),
      fullName: item.fullName,
      shortName: item.shortName,
      image: item.image,
      weight: item.weight,
      status: item.status,
      isCustom: item.isCustom
    }));

    // Trigger parent routine passing our built composition of food
    onConfirm(mappedIngredients);
  };

  return (
    <div className="flex-1 flex flex-col justify-between bg-[#FAFAFA] min-h-[844px] relative scroll-smooth" id="ingredients-screen-root">
      
      {/* 1. SCROLLABLE SCREEN CONTAINER */}
      <div className="flex-1 px-5 pt-3 pb-8 overflow-y-auto max-h-[725px]" id="ingredients-scroll-container">
        
        {/* HEADER BAR */}
        <div className="flex justify-between items-center mb-5 relative z-10" id="ingredients-header">
          <button 
            type="button" 
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-white border border-gray-100 shadow-sm flex items-center justify-center text-text-sec hover:text-brand-green-pure active:scale-95 transition-all cursor-pointer animate-fade-in"
            id="ingredients-back-btn"
          >
            <ChevronLeft className="w-6 h-6 shrink-0" />
          </button>
          
          <h2 
            className="text-[17px] font-black text-text-dark tracking-tight"
            style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
          >
            Новое блюдо
          </h2>

          <div className="w-10 h-10 flex items-center justify-center text-brand-green-pure">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        {/* TITLE & DETAILS */}
        <div className="text-left mb-5" id="ingredients-title-box">
          <h1 
            className="text-[28px] font-black text-text-dark leading-none tracking-tight mb-2"
            style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
          >
            Ингредиенты
          </h1>
          <p 
            className="text-[14.5px] font-medium leading-snug text-text-sec"
            style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
          >
            Соберите состав блюда из цельных растительных ингредиентов и задайте вес каждого из них.
          </p>
        </div>

        {/* ZONE A: ADDED INGREDIENTS LIST (PROMINENT UPPER CONTAINER) */}
        <div className="bg-white rounded-[26px] border border-gray-150/55 p-4.5 mb-5 shadow-[0_8px_20px_-6px_rgba(0,0,0,0.03)]" id="added-ingredients-zone">
          <div className="flex justify-between items-center mb-3">
            <span 
              className="text-[14.5px] font-extrabold text-text-dark tracking-tight flex items-center gap-1.5"
              style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
            >
              <Scale className="w-4.5 h-4.5 text-brand-green-pure shrink-0" />
              Состав блюда
            </span>
            <span className="text-[11px] font-extrabold text-brand-green-dark bg-emerald-50 px-2 py-0.5 rounded-full select-none">
              {selectedIngredients.length} {selectedIngredients.length === 1 ? "продукт" : selectedIngredients.length >= 2 && selectedIngredients.length <= 4 ? "продукта" : "продуктов"}
            </span>
          </div>

          <AnimatePresence mode="popLayout">
            {selectedIngredients.length === 0 ? (
              <motion.div 
                key="empty-inside-list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-8 text-center flex flex-col items-center justify-center text-gray-400 gap-2 select-none"
                id="added-ingredients-blank-state"
              >
                <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 border border-gray-100">
                  <UtensilsCrossed className="w-6 h-6" />
                </div>
                <p 
                  className="text-[13px] font-bold text-text-placeholder px-4"
                  style={{ fontFamily: '"Calibri", sans-serif' }}
                >
                  Здесь появятся добавленные вами ингредиенты с их точным весом.
                </p>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5 max-h-[220px] overflow-y-auto pr-1" id="added-ingredients-scroller">
                {selectedIngredients.map((ing) => (
                  <motion.div
                    key={ing.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    className={`flex items-center justify-between p-2.5 rounded-20 border transition-all duration-300 ${
                      ing.status === "error" 
                        ? "bg-rose-50/50 border-rose-100 text-rose-900" 
                        : "bg-gray-50/40 border-gray-100 hover:bg-gray-50/80"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-12 overflow-hidden bg-white shrink-0 border border-gray-100 flex items-center justify-center">
                        <img 
                          src={ing.image} 
                          alt={ing.shortName} 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1547058886-f6d8174f85e4?auto=format&fit=crop&q=80&w=150";
                          }}
                        />
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-1.5">
                          <p 
                            className="text-[14px] font-extrabold text-text-dark leading-tight"
                            style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
                          >
                            {ing.shortName}
                          </p>
                          {ing.status === "error" && (
                            <span className="text-[10px] font-black text-rose-600 bg-rose-100/60 px-1.5 py-0.2 rounded-md uppercase tracking-wider select-none">
                              Предупреждение
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] font-bold text-text-sec leading-none mt-0.5">
                          {ing.weight} г
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveIngredient(ing.id)}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-text-placeholder hover:text-rose-600 hover:bg-rose-50 active:scale-95 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* ZONE B: CATEGORIES OF INGREDIENTS ACCORDION */}
        <div className="mb-6 flex flex-col gap-2.5 text-left" id="categories-accordion-section">
          <span 
            className="text-[14.5px] font-extrabold text-text-dark pl-2 mb-1 block"
            style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
          >
            Выберите продукты по категориям
          </span>

          {Object.keys(INGREDIENT_CATEGORY_MAP).map(catName => {
            const items = CATEGORIES_DATA[catName] || [];
            const isExpanded = expandedCategories[catName];
            return (
              <div 
                key={catName} 
                className="bg-white rounded-[22px] border border-gray-150/40 shadow-xs overflow-hidden transition-all duration-300"
              >
                {/* Category Header Toggler */}
                <button
                  type="button"
                  onClick={() => toggleCategory(catName)}
                  className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50/40 active:bg-gray-50/80 transition-colors text-left font-extrabold text-[15px] text-text-dark cursor-pointer select-none"
                  style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
                >
                  <span className="truncate">{catName}</span>
                  <div className="w-7 h-7 rounded-full bg-gray-50/70 border border-gray-100 flex items-center justify-center text-text-sec">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {/* Expanded Item Sheet / Grid Slider directly inside accordion */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden border-t border-gray-100"
                    >
                      <div className="p-4 bg-gray-50/20 flex flex-col gap-3">
                        <div className="grid grid-cols-3 gap-y-6 gap-x-4 max-h-[260px] overflow-y-auto pr-0.5">
                          {items.length === 0 ? (
                            <div className="col-span-3 flex flex-col items-center justify-center py-6 text-text-placeholder select-none">
                              <span className="text-[12px] font-medium">
                                Ингредиенты загружаются...
                              </span>
                            </div>
                          ) : items.map((item) => {
                            const isSelected = selectedIngredients.some(si => si.fullName === item.fullName);
                            return (
                              <button
                                type="button"
                                key={item.fullName}
                                onClick={() => handleSelectPredefined(item, catName)}
                                className={`flex flex-col items-center justify-start cursor-pointer gap-2 relative ${isSelected ? 'drop-shadow-md' : ''}`}
                              >
                                <div className="w-12 h-12 flex items-center justify-center shrink-0">
                                  <img 
                                    src={getIngredientSrc(item.fullName, item.wfpbStatus)} 
                                    alt={item.shortName} 
                                    className="w-11 h-11 rounded-lg object-contain bg-gray-50/70"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      if (!target.dataset.fallback) {
                                        target.dataset.fallback = "1";
                                        target.src = item.wfpbStatus === "forbidden" ? ingrRed : ingrGreen;
                                      }
                                    }}
                                  />
                                </div>
                                {isSelected && (
                                  <div className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-brand-green-pure rounded-full flex items-center justify-center">
                                    <Check className="w-3 h-3 text-white" />
                                  </div>
                                )}
                                <span className="text-xs md:text-sm font-medium text-center text-gray-800 leading-tight">
                                  {item.shortName}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Prompt-defined mandatory action element: "Ввести свой ингредиент" inside the selection context */}
                        <button
                          type="button"
                          onClick={handleOpenCustomInput}
                          className="w-full py-3 px-4 rounded-[18px] border border-dashed border-brand-green-pure text-brand-green-pure bg-emerald-50/10 hover:bg-emerald-50/30 cursor-pointer flex items-center justify-center gap-1.5 text-[13.5px] font-bold tracking-tight transition-colors"
                        >
                          <PlusCircle className="w-4.5 h-4.5 shrink-0" />
                          <span style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}>
                            Ввести свой ингредиент
                          </span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* ZONE C: PREPARATION METHOD SELECTOR */}
        <div className="bg-white rounded-[26px] border border-gray-150/40 p-4.5 mb-6 text-left shadow-[0_5px_15px_-4px_rgba(0,0,0,0.01)]" id="preparation-method-section">
          <span 
            className="text-[14.5px] font-extrabold text-text-dark tracking-tight flex items-center gap-1.5 mb-3"
            style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
          >
            <Flame className="w-4.5 h-4.5 text-brand-green-pure shrink-0" />
            Способ приготовления
          </span>

          <div className="grid grid-cols-3 gap-2" id="preparation-tabs">
            {[
              { id: "варка", label: "Варка", icon: "🍲" },
              { id: "тушение", label: "Тушение", icon: "🥘" },
              { id: "жарка без масла", label: "Без масла", icon: "🍳" }
            ].map(method => (
              <button
                type="button"
                key={method.id}
                onClick={() => setSelectedMethod(method.id)}
                className={`py-3 px-1 rounded-[18px] flex flex-col items-center justify-center border text-center transition-all duration-300 cursor-pointer select-none ${
                  selectedMethod === method.id 
                    ? "bg-[#E6F4EA]/80 border-brand-green-pure/75 text-brand-green-dark scale-102 shadow-xs" 
                    : "bg-white border-gray-100 hover:bg-gray-50/40 text-text-sec"
                }`}
              >
                <span className="text-[18px] mb-1 select-none">{method.icon}</span>
                <span 
                  className="text-[12.5px] font-extrabold tracking-tight"
                  style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
                >
                  {method.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ZONE D: CONFIRMATION GRAND CALC ACTION BUTTON */}
        <motion.button
          type="button"
          onClick={handleConfirmAll}
          disabled={selectedIngredients.length === 0}
          whileHover={selectedIngredients.length > 0 ? { scale: 1.01 } : {}}
          whileTap={selectedIngredients.length > 0 ? { scale: 0.98 } : {}}
          className={`w-full volumetric-btn py-4 rounded-[22px] font-extrabold text-[16px] text-white flex items-center justify-center gap-2 select-none uppercase tracking-wider border-t border-white/20 transition-all ${
            selectedIngredients.length > 0 
              ? "opacity-100 brightness-100 hover:brightness-105 active:brightness-95 cursor-pointer shadow-[0_8px_18px_rgba(22,181,81,0.22)]" 
              : "opacity-45 bg-gray-300 border-gray-200 cursor-not-allowed shadow-none"
          }`}
          id="ingredients-cta-calculate-btn"
        >
          <Check className="w-5 h-5 shrink-0" />
          <span style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}>
            Подтвердить
          </span>
        </motion.button>

      </div>

      {/* FIXED FOOTER TAB PLACEHOLDER JUST IN CASE PRESERVED AS PER REQ */}
      {/* (Navigation remains static container for standard styling visual flow matching app) */}

      {/* MODAL LIGHT OVERLAYS PORTALS */}
      <AnimatePresence>
        
        {/* 1. CUSTOM NAME INPUT POPUP GENTLE OVERLAY */}
         {showCustomInput && (
           <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-6"
             id="custom-input-overlay"
           >
             <motion.div 
               initial={{ scale: 0.96, y: 15 }}
               animate={{ scale: 1, y: 0 }}
               exit={{ scale: 0.96, y: 15 }}
               className="bg-white w-full max-w-[340px] rounded-[28px] border border-gray-100 shadow-xl p-5.5 text-left relative"
             >
               <button
                 type="button"
                 onClick={() => setShowCustomInput(false)}
                 className="absolute top-4 right-4 w-7 h-7 rounded-full bg-gray-50 flex items-center justify-center text-text-sec hover:bg-gray-100 active:scale-95 cursor-pointer"
               >
                 <X className="w-4 h-4" />
               </button>

               <span className="text-[11px] font-black tracking-widest text-brand-green-pure uppercase block mb-1">
                 СВОЙ ПРОДУКТ
               </span>
               <h3 
                 className="text-[17px] font-extrabold text-text-dark mb-4 leading-tight"
                 style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
               >
                 Введите название
               </h3>

               <input 
                 type="text"
                 placeholder="Например: Шампиньоны, Тыква..."
                 value={customNameInput}
                 onChange={(e) => setCustomNameInput(e.target.value)}
                 className="w-full bg-gray-50 border border-gray-150 rounded-xl px-3.5 py-3 text-[14px] font-bold text-text-dark focus:outline-hidden focus:border-brand-green-pure focus:ring-3 focus:ring-emerald-400/25 transition-all text-left mb-4.5"
                 autoFocus
                 style={{ fontFamily: '"Calibri", sans-serif' }}
               />

               <button
                 type="button"
                 onClick={handleConfirmCustomName}
                 disabled={!customNameInput.trim()}
                 className={`w-full py-3.5 rounded-[18px] font-extrabold text-[14px] text-white select-none uppercase tracking-wider text-center transition-all ${
                   customNameInput.trim() 
                     ? "bg-[#16B551] shadow-xs active:scale-98 cursor-pointer" 
                     : "bg-gray-200 cursor-not-allowed"
                 }`}
               >
                 Продолжить
               </button>
             </motion.div>
           </motion.div>
         )}

         {/* 2. INGREDIENT WEIGHT ENTRY DRAWER WITH BIG VOLUME KOB BUTTONS */}
         {weightModalItem && (
           <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-6"
             id="weight-modal-overlay"
           >
             <motion.div 
               initial={{ scale: 0.96, y: 15 }}
               animate={{ scale: 1, y: 0 }}
               exit={{ scale: 0.96, y: 15 }}
               className="bg-white w-full max-w-[340px] rounded-[30px] border border-gray-100 shadow-2xl p-6.5 text-center relative"
             >
               <button
                 type="button"
                 onClick={() => setWeightModalItem(null)}
                 className="absolute top-5 right-5 w-7.5 h-7.5 rounded-full bg-gray-50 flex items-center justify-center text-text-sec hover:bg-gray-100 active:scale-95 cursor-pointer"
               >
                 <X className="w-4.5 h-4.5" />
               </button>

               <span className="text-[11px] font-black tracking-widest text-[#16B551] uppercase block mb-1">
                 ВЕС ИНГРЕДИЕНТА
               </span>
               <h3 
                 className="text-[18px] font-black text-text-dark mb-6 leading-tight max-w-[80%] mx-auto"
                 style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
               >
                 {weightModalItem.shortName}
               </h3>

               {/* Large beautiful digital view state input weight value */}
               <div className="flex items-center justify-center gap-5 mb-7 select-none animate-scale-up">
                 <button
                   type="button"
                   onClick={() => setWeightValue(prev => Math.max(10, prev - 10))}
                   className="w-13 h-13 rounded-full bg-gray-50 hover:bg-gray-100 text-text-dark border border-gray-150 flex items-center justify-center shadow-xs active:scale-95 transition-all text-[24px] font-bold cursor-pointer font-sans"
                 >
                   -
                 </button>

                 <div className="flex flex-col items-center">
                   <div className="flex items-baseline gap-1">
                     <span className="text-[44px] font-black text-text-dark leading-none tracking-tight font-sans">
                       {weightValue}
                     </span>
                     <span className="text-[16px] font-extrabold text-text-sec uppercase leading-none font-sans">
                       г
                     </span>
                   </div>
                   <span className="text-[9.5px] font-extrabold text-[#085B24] tracking-wider uppercase block mt-1 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                     Цельный вес
                   </span>
                 </div>

                 <button
                   type="button"
                   onClick={() => setWeightValue(prev => Math.min(1000, prev + 10))}
                   className="w-13 h-13 rounded-full bg-gray-50 hover:bg-gray-100 text-text-dark border border-gray-150 flex items-center justify-center shadow-xs active:scale-95 transition-all text-[24px] font-bold cursor-pointer font-sans"
                 >
                   +
                 </button>
               </div>

               <div className="grid grid-cols-3 gap-2 mb-6">
                 {[50, 100, 200].map(val => (
                   <button
                     type="button"
                     key={val}
                     onClick={() => setWeightValue(val)}
                     className={`py-2 px-1 rounded-xl text-[13px] font-extrabold border transition-all cursor-pointer ${
                       weightValue === val 
                         ? "bg-emerald-50 border-brand-green-pure text-brand-green-dark" 
                         : "bg-white border-gray-100 hover:bg-gray-50"
                     }`}
                     style={{ fontFamily: '"Calibri", sans-serif' }}
                   >
                     {val} г
                   </button>
                 ))}
               </div>

               <button
                 type="button"
                 onClick={handleConfirmWeight}
                 className="w-full py-4 rounded-[20px] font-extrabold text-[15px] text-white select-none uppercase tracking-wider bg-gradient-to-b from-brand-green-soft to-brand-green-dark shadow-xs border-t border-white/20 active:scale-98 cursor-pointer text-center"
                 style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
               >
                 Подтвердить
               </button>
             </motion.div>
           </motion.div>
         )}

         {/* 3. ALERT WARNING MODAL OVERLAY (FORBIDDEN CUSTOM INPUT WARNINGS) */}
         {pendingWarningItem && (
           <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-55 p-6"
             id="pending-warning-overlay"
           >
             <motion.div 
               initial={{ scale: 0.95, y: 15 }}
               animate={{ scale: 1, y: 0 }}
               exit={{ scale: 0.95, y: 15 }}
               className="bg-white w-full max-w-[340px] rounded-[30px] border border-red-100 shadow-2xl p-6.5 text-left relative"
             >
               <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 mb-4 border border-rose-100">
                 <AlertTriangle className="w-6 h-6 shrink-0" />
               </div>

               <span className="text-[11px] font-extrabold tracking-widest text-rose-500 uppercase block mb-1">
                 Предупреждение системы
               </span>
               <h3 
                 className="text-[18px] font-extrabold text-text-dark mb-2 leading-tight"
                 style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
               >
                 Продукт не соответствует диете
               </h3>
               
               <p 
                 className="text-[13.5px] text-text-sec font-medium leading-relaxed mb-5"
                 style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
               >
                 Ингредиент <strong className="text-text-dark">«{pendingWarningItem.item.fullName}»</strong> содержит {checkIngredientDisallowed(pendingWarningItem.item.fullName).reason || "запрещенные элементы"}, что противоречит здоровой системе цельного растительного рациона без масла и соли (WFPB). 
                 <br />
                 <br />
                 Вы действительно хотите продолжить расчёт с этим ингредиентом?
               </p>

               <div className="flex gap-2.5">
                 <button
                   type="button"
                   onClick={() => setPendingWarningItem(null)}
                   className="flex-1 py-3.5 rounded-[18px] font-bold text-[13.5px] border border-gray-150 text-text-sec bg-white hover:bg-gray-50 hover:text-text-dark active:scale-95 transition-all text-center cursor-pointer"
                   style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
                 >
                   Отменить
                 </button>
                 <button
                   type="button"
                   onClick={handleAcceptWarningItem}
                   className="flex-1 py-3.5 rounded-[18px] font-black text-[13.5px] bg-[#E11D48] text-white hover:bg-red-700 active:scale-95 transition-all text-center cursor-pointer"
                   style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
                 >
                   Разрешить
                 </button>
               </div>
             </motion.div>
           </motion.div>
         )}

      </AnimatePresence>

      <div className="w-full shrink-0" id="ingredients-bottom-bar-nav">
        <BottomBar onHomeClick={onBack} activeTab="add-food" />
      </div>

    </div>
  );
}
