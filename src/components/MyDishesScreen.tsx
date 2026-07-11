import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAppStore } from "../store/useAppStore";
import { 
  Search, 
  Clock, 
  Heart, 
  ChevronLeft, 
  Apple, 
  Leaf, 
  Zap, 
  Activity, 
  Shield, 
  Sparkles,
  Info,
  X,
  Plus
} from "lucide-react";
import BottomBar from "./BottomBar";
import CalendarButton from "./CalendarButton";
import IngredientCollage from "./IngredientCollage";
import { resolveAvatar, resolveAvatarForCompliance } from "../utils/annaAvatarResolver";
import { getSavedDishes } from "../modules/mixer/services/mixerSave";
import { getRecipeImagePath } from "../utils/recipeImageMapper";
import { complimentsBackData } from "../data/compliments_back";
import { breakfastBackData } from "../data/breakfast_back";
import { lunchBackData } from "../data/lunch_back";
import { dinnerBackData } from "../data/dinner_back";
import { recipeDayBackData } from "../data/recipe_day_back";
import { mustHaveBackData } from "../data/must_have_back";

const annaAvatarSrc = resolveAvatar({ toneGroup: 'positive', intent: 'affirmation' }).src;

export interface BookRecipeRef {
  type: "compliment" | "breakfast" | "lunch" | "dinner" | "recipe_of_day" | "must_have" | "drinks";
  id: number;
  technicalName: string;
  emotionalName?: string;
}

export interface SavedDish {
  id: string;
  name: string;
  time: string;
  tag: string;
  category: string;
  categoryColor?: string;
  image: string;
  isFavorite?: boolean;
  isNew?: boolean;
  dayIndex?: number;
  createdAt: string;
  ingredients: { name: string; weight: string; status: "green" | "yellow" | "red"; manuallyAllowed?: boolean }[];
  calories: number;
  protein: string;
  fiber: string;
  fat: string;
  annaTip: string;
  computedNutrients?: {
    calories: number;
    protein: string;
    fiber: string;
    fat: string;
  };
  annaComment?: string;
  isMixerGenerated?: boolean;
  isBookRecipe?: boolean;
  bookRecipeRef?: BookRecipeRef;
}

interface MyDishesScreenProps {
  onBack: () => void;
  savedDishes: SavedDish[];
  onToggleFavorite: (id: string) => void;
  onSaveDishCategory: (id: string, category: string) => void;
  dayNotes: Record<number, { text: string; time: string }[]>;
  currentDayIndex: number;
  screen: string;
  onOpenCalendar: () => void;
  onNavigateHome: () => void;
  onNavigateDiary: () => void;
  onNavigateProgress: () => void;
}

const DEFAULT_CATEGORIES = [
  "Завтраки",
  "Супы",
  "Салаты",
  "Основные блюда",
  "Дессерты",
  "выпечка",
  "соусы",
  "Напитки",
  "Книга"
];

interface NutrientItem {
  name: string;
  value: number;
  unit: string;
  desc: string;
}

interface DishReport {
  vitamins: NutrientItem[];
  minerals: NutrientItem[];
}

function getNutrientData(dish: SavedDish): DishReport {
  const nameLower = (dish.name || "").toLowerCase();
  const ingText = (dish.ingredients || []).map(i => (i.name || "").toLowerCase()).join(" ");
  
  // Base healthy values
  let vitA = 70;
  let vitC = 85;
  let vitB9 = 75;
  let vitE = 40;
  let vitK = 50;
  
  let iron = 55;
  let magnesium = 65;
  let zinc = 40;
  let potassium = 60;
  let lysine = 35;
  let selenium = 30;

  // Boost levels based on composition details
  if (nameLower.includes("зелен") || nameLower.includes("салат") || nameLower.includes("шпинат") || nameLower.includes("капуст") || nameLower.includes("брокколи") || nameLower.includes("петруш") || ingText.includes("салат") || ingText.includes("шпинат") || ingText.includes("зелень") || ingText.includes("петрушка") || ingText.includes("укроп")) {
    vitK = 260;
    vitC = 165;
    vitA = 140;
    iron = 80;
    potassium = 90;
  }
  
  if (nameLower.includes("ягод") || nameLower.includes("фрукт") || nameLower.includes("апельсин") || nameLower.includes("цитрус") || nameLower.includes("лимон") || nameLower.includes("дессерт") || nameLower.includes("смузи") || ingText.includes("ягоды") || ingText.includes("фрукт") || ingText.includes("банан") || ingText.includes("яблоко")) {
    vitC = 230;
    vitA = 105;
    vitE = 55;
    potassium = 75;
  }
  
  if (nameLower.includes("нут") || nameLower.includes("чечевиц") || nameLower.includes("фасол") || nameLower.includes("боб") || nameLower.includes("тофу") || nameLower.includes("киноа") || nameLower.includes("соя") || nameLower.includes("арахис") || nameLower.includes("темпе") || ingText.includes("нут") || ingText.includes("чечевица") || ingText.includes("фасоль") || ingText.includes("бобы") || ingText.includes("тофу") || ingText.includes("киноа")) {
    lysine = 110;
    iron = 90;
    zinc = 75;
    magnesium = 85;
    selenium = 60;
  }
  
  if (nameLower.includes("орех") || nameLower.includes("сем") || nameLower.includes("авокадо") || nameLower.includes("кунжут") || nameLower.includes("миндаль") || nameLower.includes("льнян") || ingText.includes("орехи") || ingText.includes("семечки") || ingText.includes("авокадо") || ingText.includes("кунжут") || ingText.includes("лён")) {
    vitE = 115;
    magnesium = 95;
    zinc = 65;
    selenium = 55;
  }

  return {
    vitamins: [
      { name: "Витамин A (Бета-каротин)", value: vitA, unit: "мкг", desc: "Зрение, иммунитет и молодость клеток" },
      { name: "Витамин C (Аскорбиновая к-та)", value: vitC, unit: "мг", desc: "Синтез коллагена и прочность капилляров" },
      { name: "Витамин B9 (Фолиевая к-та)", value: vitB9, unit: "мкг", desc: "Обновление клеток и ремонт структуры ДНК" },
      { name: "Витамин E (Токоферол)", value: vitE, unit: "мг", desc: "Супер-антиоксидант мембран от окисления" },
      { name: "Витамин K (Филлохинон)", value: vitK, unit: "мкг", desc: "Регуляция кальциевого обмена и сосудов" },
    ],
    minerals: [
      { name: "Железо (Fe)", value: iron, unit: "мг", desc: "Снабжение всех органов кислородом" },
      { name: "Магний (Mg)", value: magnesium, unit: "мг", desc: "Релаксация сосудов и антистресс-эффект" },
      { name: "Цинк (Zn)", value: zinc, unit: "мг", desc: "Ферментная активность и регенерация кожи" },
      { name: "Калий (K)", value: potassium, unit: "мг", desc: "Снижение давления и вывод натрия" },
      { name: "Лизин (Аминокислота)", value: lysine, unit: "мг", desc: "Построение правильных белков организма" },
      { name: "Селен (Se)", value: selenium, unit: "мкг", desc: "Защита эндокринных желез и щитовидки" },
    ]
  };
}

export default function MyDishesScreen({
  onBack,
  savedDishes,
  onToggleFavorite,
  onSaveDishCategory,
  dayNotes,
  currentDayIndex,
  screen,
  onOpenCalendar,
  onNavigateHome,
  onNavigateDiary,
  onNavigateProgress
}: MyDishesScreenProps) {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeCategory, setActiveCategory] = useState<string>("Салаты");
  const [selectedDish, setSelectedDish] = useState<SavedDish | null>(null);
  const [tick, setTick] = useState(0);

  // Re-read book dishes when component mounts or regains visibility
  React.useEffect(() => {
    const onFocus = () => setTick(n => n + 1);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);

  const [editingDish, setEditingDish] = useState<SavedDish | null>(null);
  const [selectedCatVal, setSelectedCatVal] = useState<string>("");
  const [customCategory, setCustomCategory] = useState<string>("");

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const visibleList = savedDishes
      .filter(d => d.category === activeCategory)
      .map(d => ({ name: d.name, calories: d.calories }));

    (window as any).currentScreenContext = {
      screen_id: "my-dishes",
      screen_title: "Моя Кулинарная Коллекция",
      current_day: currentDayIndex,
      active_tab: activeCategory,
      selected_item: selectedDish ? selectedDish.name : null,
      visible_items: visibleList,
      current_status: selectedDish ? "Просмотр детальных нутриентов WFPB блюда из коллекции" : "Просмотр сохраненных блюд на кулинарном экране",
      active_modal_or_overlay: selectedDish ? "Детализация сохраненного блюда" : null,
      modal_data: selectedDish ? {
        dish_name: selectedDish.name,
        calories: selectedDish.calories,
        protein: selectedDish.protein,
        fiber: selectedDish.fiber,
        fat: selectedDish.fat,
        ingredients: selectedDish.ingredients?.map(i => `${i.name} (${i.weight || "75 г"})`),
        annaTip: selectedDish.annaTip
      } : null
    };

    return () => {
      if ((window as any).currentScreenContext?.screen_id === "my-dishes") {
        delete (window as any).currentScreenContext;
      }
    };
  }, [currentDayIndex, savedDishes, activeCategory, selectedDish]);

  const userProfile = useAppStore(s => s.userProfile);
  const user_name = userProfile.name || "";
  const user_gender = (userProfile.gender as "female" | "male") || "female";
  
  const nutrientData = selectedDish ? getNutrientData(selectedDish) : null;
  const isClean = selectedDish ? !selectedDish.ingredients.some(ing => ing.status === "red") : true;
  const violationCount = selectedDish ? selectedDish.ingredients.filter(ing => ing.status === "red").length : 0;

  const startEditing = (dish: SavedDish) => {
    setEditingDish(dish);
    setSelectedCatVal(dish.category || "Основные блюда");
    setCustomCategory("");
  };

  // Merge regular dishes with mixer dishes and book dishes
  const [allDishes, setAllDishes] = React.useState<SavedDish[]>([]);
  React.useEffect(() => {
    const mixerDishes = getSavedDishes().map(m => ({
      id: m.id,
      name: m.name,
      time: m.time,
      tag: m.tag,
      category: m.category === 'mixer' ? 'Миксер' : m.category,
      image: m.image || '',
      isFavorite: false,
      isNew: false,
      createdAt: m.time,
      isBookRecipe: false,
      ingredients: m.ingredients.map(i => ({ name: i.name, weight: '75 г', status: i.status })),
      calories: m.calories,
      protein: String(m.protein),
      fiber: String(m.fiber),
      fat: String(m.fat),
      annaTip: m.annaTip,
      annaComment: m.annaComment,
    }));
    const bookDishes: SavedDish[] = [];
    const seen = new Set(savedDishes.map(d => d.id));
    const uniqueMixer = mixerDishes.filter(d => !seen.has(d.id));
    const uniqueBook = bookDishes.filter(d => !seen.has(d.id));
    setAllDishes([...uniqueMixer, ...uniqueBook, ...savedDishes]);
  }, [savedDishes, tick, activeCategory]);

  // Dynamically compute unique categories (WFPB)
  const categories = React.useMemo(() => {
    const uniques = new Set(DEFAULT_CATEGORIES);
    allDishes.forEach(dish => {
      if (dish.category) {
        const norm = dish.category.trim();
        if (norm) {
          const matchedDefault = DEFAULT_CATEGORIES.find(c => c.toLowerCase() === norm.toLowerCase());
          uniques.add(matchedDefault || norm);
        }
      }
    });
    return Array.from(uniques);
  }, [allDishes]);

  // Filter based on active category and custom query search
  const filteredDishes = allDishes.filter(dish => {
    const matchesCategory = activeCategory === 'Миксер'
      ? (dish.category === 'Миксер' || dish.category === 'mixer')
      : activeCategory === 'Книга'
      ? dish.isBookRecipe === true
      : dish.category.toLowerCase() === activeCategory.toLowerCase();
    const matchesSearch = dish.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          dish.tag.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getTagIcon = (tagName: string) => {
    const norm = tagName.toLowerCase();
    if (norm.includes("ужин") || norm.includes("лёгкий")) {
      return <Leaf className="w-3.5 h-3.5 text-[#16B551] fill-[#16B551]/10" />;
    } else if (norm.includes("энерг") || norm.includes("актив")) {
      return <Zap className="w-3.5 h-3.5 text-[#8B5CF6] fill-[#8B5CF6]/10" />;
    } else if (norm.includes("белок") || norm.includes("сытн")) {
      return <Shield className="w-3.5 h-3.5 text-[#F59E0B] fill-[#F59E0B]/10" />;
    }
    return <Sparkles className="w-3.5 h-3.5 text-[#10B981]" />;
  };

  const getTagColorClass = (tagName: string) => {
    const norm = tagName.toLowerCase();
    if (norm.includes("ужин") || norm.includes("лёгкий")) {
      return "bg-[#F0FDF4] text-[#15803D] border-[#DCFCE7]";
    } else if (norm.includes("энерг") || norm.includes("актив")) {
      return "bg-[#F5F3FF] text-[#6D28D9] border-[#EDE9FE]";
    } else if (norm.includes("белок") || norm.includes("сытн")) {
      return "bg-[#FFFBEB] text-[#B45309] border-[#FEF3C7]";
    }
    return "bg-[#F0FDF4] text-[#15803D] border-[#DCFCE7]";
  };

  return (
    <div 
      className="flex-1 flex flex-col justify-between bg-[#FCFDFD] h-full"
      style={{ fontFamily: '"Calibri", sans-serif' }}
      id="my-dishes-screen-root"
    >
      <div className="flex-1 overflow-y-auto px-5.5 pt-4.5 pb-20">
        
        {/* UPPER STATUS/HEADER HEADER AREA WITH BACK & CALENDAR */}
        <div className="flex items-center justify-between mb-5.5 relative">
          <button
            type="button"
            onClick={onBack}
            className="w-11 h-11 bg-white hover:bg-[#FAFAFA] border border-[#EFF2F3] shadow-[0_4px_10px_rgba(43,49,55,0.03)] rounded-[16px] flex items-center justify-center transition-all duration-200 active:scale-95 cursor-pointer shrink-0"
            aria-label="Назад"
          >
            <ChevronLeft className="w-5.5 h-5.5 text-[#2B3137]" />
          </button>

          {/* Screen titles aligned centered */}
          <div className="text-center flex-1 mx-2">
            <h1 
              className="text-[21px] font-black text-[#2B3137] tracking-tight leading-tight"
            >
              Мои блюда
            </h1>
            <p 
              className="text-[12.5px] text-[#737C86] font-semibold tracking-wide"
            >
              Ваши сохранённые блюда и анализы
            </p>
          </div>

          <CalendarButton 
            dayNotes={dayNotes}
            currentDayIndex={currentDayIndex}
            screen={screen}
            onClick={onOpenCalendar}
            className="w-11 h-11 rounded-[16px] shrink-0"
          />
        </div>

        {/* SEARCH INPUT BAR FIELD */}
        <div className="relative mb-5" id="my-dishes-search-container">
          <span className="absolute inset-y-0 left-4.5 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-[#8E9B9C]" />
          </span>
          <input
            type="text"
            className="w-full bg-[#FAFBFB] border border-[#EFF2F3] text-[#2B3137] placeholder-[#8E9B9C] focus:border-[#16B551] focus:bg-white text-[15px] font-semibold py-3.5 pl-11.5 pr-4.5 rounded-[22px] shadow-[0_2px_8px_rgba(0,0,0,0.015)] outline-none transition-all duration-200"
            placeholder="Найти блюдо"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-4 flex items-center text-[#8E9B9C] hover:text-text-dark cursor-pointer text-[13px] font-bold"
            >
              Очистить
            </button>
          )}
        </div>

        {/* CATEGORY SELECTOR PILLS CAROUSEL */}
        <div 
          className="flex gap-2 overflow-x-auto pb-4 scrollbar-hidden select-none -mx-2 px-2"
          id="category-pills-container"
        >
          {categories.map((cat) => {
            const isActive = cat.toLowerCase() === activeCategory.toLowerCase();
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`transition-all duration-300 py-2.5 px-4.5 rounded-[18px] text-[13.5px] font-bold cursor-pointer whitespace-nowrap shrink-0 ${
                  isActive 
                    ? "bg-white border-[1.5px] border-[#10D150] text-[#16B551] shadow-[0_4px_12px_rgba(16,181,81,0.08)] scale-[1.02]"
                    : "bg-white border border-[#EFF2F3] text-[#737C86] hover:bg-[#FAFBFB] hover:border-gray-200"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* VERTICAL DISH LIST WITH ANIMATIONS */}
        <div className="flex flex-col gap-4.5 mt-2.5" id="dishes-vertical-list">
          <AnimatePresence mode="popLayout">
            {filteredDishes.length > 0 ? (
              filteredDishes.map((dish) => (
                <motion.div
                  key={dish.id}
                  layoutId={`dish-card-${dish.id}`}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => {
                    if (dish.isNew) {
                      startEditing(dish);
                    } else {
                      setSelectedDish(dish);
                    }
                  }}
                  className="bg-white rounded-[24px] p-3 border border-[#EFF2F3] shadow-[0_4px_16px_rgba(43,49,55,0.015)] flex gap-4 hover:border-gray-200/85 hover:shadow-[0_8px_24px_rgba(43,49,55,0.035)] active:scale-[0.99] transition-all duration-200 cursor-pointer text-left relative overflow-hidden"
                >
                  {/* Left size realistic food camera photograph */}
                  <div className="w-[88px] h-[88px] rounded-[18px] overflow-hidden bg-gray-50 flex items-center justify-center shrink-0 border border-gray-100">
                    <img
                      src={dish.image}
                      alt={dish.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-500"
                    />
                  </div>

                  {/* Middle area detail description */}
                  <div className="flex flex-col justify-between py-1.5 flex-1 pr-6 z-10">
                    <div>
                      <h4 className="text-[15px] font-extrabold text-[#2B3137] leading-snug tracking-tight mb-1">
                        {dish.name}
                      </h4>
                      <div className="flex items-center gap-1.5 text-[#737C86] text-[12px] font-semibold mb-2">
                        <Clock className="w-3.5 h-3.5 text-[#97A3A4] shrink-0" />
                        <span>{dish.time}</span>
                      </div>
                    </div>

                    {/* Highly descriptive mini badge indicator */}
                    <div className="flex gap-1.5">
                      {dish.isNew ? (
                        <div className="px-2.5 py-1 rounded-full border border-orange-200 bg-orange-50 text-orange-600 text-[10.5px] font-black flex items-center gap-1.5 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                          <span>Настроить категорию</span>
                        </div>
                      ) : dish.isBookRecipe ? (
                        <div className="px-2.5 py-1 rounded-full border border-violet-200 bg-violet-50 text-violet-700 text-[11px] font-bold flex items-center gap-1.5">
                          <span>📖</span>
                          <span>{dish.tag}</span>
                        </div>
                      ) : (
                        <div className={`px-2.5 py-1 rounded-full border text-[11px] font-bold flex items-center gap-1.5 ${getTagColorClass(dish.tag)}`}>
                          {getTagIcon(dish.tag)}
                          <span>{dish.tag}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Absolute positioned favorite indicator heart button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation(); // Avoid opening the detailed overlay
                      onToggleFavorite(dish.id);
                    }}
                    className="absolute top-4.5 right-4.5 w-7.5 h-7.5 rounded-full flex items-center justify-center text-[#737C86] hover:text-[#FA5252] hover:bg-[#FFF5F5] active:scale-90 transition-all duration-200 cursor-pointer z-20"
                    aria-label="В избранное"
                  >
                    <Heart 
                      className={`w-[19px] h-[19px] transition-all ${
                        dish.isFavorite 
                          ? "fill-[#FA5252] text-[#FA5252] scale-110" 
                          : "text-[#8E9B9C] hover:text-[#FA5252]"
                      }`} 
                    />
                  </button>
                </motion.div>
              ))
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-12 px-6 text-center text-text-sec flex flex-col items-center justify-center gap-3 bg/10"
              >
                <div className="w-[66px] h-[66px] rounded-full bg-[#FAFBFB] flex items-center justify-center border border-dashed border-gray-200 text-[#8E9B9C] mb-1">
                  🥗
                </div>
                <h5 className="text-[15px] font-extrabold text-[#2B3137]">
                  Нет блюд в категории «{activeCategory}»
                </h5>
                <p className="text-[12.5px] font-medium leading-relaxed max-w-[240px]">
                  {searchQuery 
                    ? `По вашему запросу «${searchQuery}» ничего не найдено`
                    : "Сфотографируйте новое WFPB блюдо, чтобы пополнить коллекцию"}
                </p>
                
                {activeCategory !== "Основные блюда" && (
                  <button
                    type="button"
                    onClick={() => { setActiveCategory("Основные блюда"); setSearchQuery(""); }}
                    className="mt-2 text-[12.5px] font-extrabold text-[#16B551] border-b border-[#16B551] pb-0.5"
                  >
                    Перейти к Основным блюдам
                  </button>
                )}

                {!searchQuery && (
                  <button
                    type="button"
                    onClick={onNavigateDiary}
                    className="mt-5 px-5 py-3 bg-[#16B551] hover:bg-[#10D150] font-bold text-white rounded-xl text-[13.0px] shadow-[0_4px_12px_rgba(22,181,81,0.15)] flex items-center gap-2 cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span>Сфотографировать блюдо</span>
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>

      {/* POPUP DETAIL MODAL OVERLAY ON CELL CLICK */}
      <AnimatePresence>
        {selectedDish && nutrientData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#2B3137]/40 backdrop-blur-xs flex items-end justify-center z-50 p-0 sm:p-4"
            onClick={() => setSelectedDish(null)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 280 }}
              className="w-full max-w-2xl bg-white rounded-t-[36px] sm:rounded-[32px] h-[95%] sm:h-[90%] overflow-hidden shadow-2xl flex flex-col text-left text-text-dark border border-gray-100"
              onClick={(e) => e.stopPropagation()}
            >
              {/* IMAGE HEADER WITH GRADIENT TINT SHADOW AND DISMISS CROSS */}
              <div className="relative h-[240px] w-full bg-gray-50 overflow-hidden shrink-0">
                {selectedDish.image ? (
                  <img
                    src={selectedDish.image}
                    alt={selectedDish.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <IngredientCollage
                    ingredients={selectedDish.ingredients}
                    containerHeight="h-[240px]"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
                
                {/* Distinct, high-precision Close Cross Pill Button */}
                <button
                  type="button"
                  onClick={() => setSelectedDish(null)}
                  className="absolute top-4.5 right-4.5 w-10 h-10 rounded-full bg-white/95 backdrop-blur-xs flex items-center justify-center text-[#2B3137] hover:bg-white hover:scale-105 shadow-[0_4px_12px_rgba(0,0,0,0.12)] active:scale-95 transition-all cursor-pointer border border-gray-100/60 z-20"
                  aria-label="Закрыть"
                >
                  <X className="w-5 h-5 shrink-0" />
                </button>

                {/* Overlaid Title and Quick Badges */}
                <div className="absolute bottom-5 left-5.5 right-5.5 text-white z-10">
                  <span className="text-[11px] font-black uppercase text-[#10D150] tracking-widest leading-none mb-1.5 inline-block">
                    {selectedDish.category}
                  </span>
                  <h3 className="text-[22px] sm:text-[24px] font-black leading-tight mb-2 tracking-tight">
                    {selectedDish.name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3.5 text-white/95 text-[12.5px] font-bold mt-1.5">
                    <span className="flex items-center gap-1.5 bg-black/25 py-1 px-2.5 rounded-full backdrop-blur-xs">
                      <Clock className="w-4 h-4 text-[#10D150]" />
                      {(() => {
                        try {
                          const d = new Date(selectedDish.createdAt);
                          if (isNaN(d.getTime())) return selectedDish.createdAt;
                          return d.toLocaleString("ru-RU", {
                            timeZone: "Europe/Moscow",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          });
                        } catch (e) {
                          return selectedDish.createdAt;
                        }
                      })()}
                    </span>
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-black border border-white/20 bg-white/15 backdrop-blur-xs`}>
                      {selectedDish.tag}
                    </span>
                    {isClean ? (
                      <span className="bg-[#E8F8EE]/90 text-[#15803D] text-[10px] font-black py-1 px-2.5 rounded-full leading-none flex items-center gap-1 shrink-0">
                        🌱 100% WFPB
                      </span>
                    ) : (
                      <span className="bg-[#FFF5F5] text-[#C92A2A] text-[10px] font-black py-1 px-2.5 rounded-full leading-none flex items-center gap-1 shrink-0 border border-[#FFC9C9]">
                        ⚠️ Отклонения
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* DETAILS METRICS CONTAINER SCREEN (SCROLLABLE AREA) */}
              <div className="p-5.5 sm:p-6 flex-1 overflow-y-auto">
                
                {/* NUTRITION FAST BOX INFO GRID */}
                <div className="grid grid-cols-4 gap-2.5 mb-6.5">
                  <div className="bg-[#FAFBFB] rounded-[18px] p-2.5 text-center border border-[#EFF2F3] shadow-[0_2px_4px_rgba(0,0,0,0.01)]">
                    <span className="block text-[10px] text-[#737C86] font-bold">Калории</span>
                    <span className="text-[15.5px] font-black text-[#2B3137] mt-0.5 block">{selectedDish.computedNutrients ? selectedDish.computedNutrients.calories : selectedDish.calories} <span className="text-[9.5px] font-medium text-text-sec">ккал</span></span>
                  </div>
                  <div className="bg-[#FAFBFB] rounded-[18px] p-2.5 text-center border border-[#EFF2F3] shadow-[0_2px_4px_rgba(0,0,0,0.01)]">
                    <span className="block text-[10px] text-[#737C86] font-bold">Белки</span>
                    <span className="text-[15.5px] font-black text-[#15803D] mt-0.5 block">{selectedDish.computedNutrients ? selectedDish.computedNutrients.protein : selectedDish.protein}</span>
                  </div>
                  <div className="bg-[#FAFBFB] rounded-[18px] p-2.5 text-center border border-[#EFF2F3] shadow-[0_2px_4px_rgba(0,0,0,0.01)]">
                    <span className="block text-[10px] text-[#737C86] font-bold">Клетчатка</span>
                    <span className="text-[15.5px] font-black text-[#15803D] mt-0.5 block">{selectedDish.computedNutrients ? selectedDish.computedNutrients.fiber : selectedDish.fiber}</span>
                  </div>
                  <div className="bg-[#FAFBFB] rounded-[18px] p-2.5 text-center border border-[#EFF2F3] shadow-[0_2px_4px_rgba(0,0,0,0.01)]">
                    <span className="block text-[10px] text-[#737C86] font-bold">Жиры</span>
                    <span className="text-[15.5px] font-black text-[#737C86] mt-0.5 block">{selectedDish.computedNutrients ? selectedDish.computedNutrients.fat : selectedDish.fat}</span>
                  </div>
                </div>

                {/* INGREDIENTS LIST COMPOSITION */}
                <div className="mb-6.5">
                  <h4 className="text-[14.5px] font-black text-[#2B3137] mb-3 flex items-center gap-2">
                    <Apple className="w-4.5 h-4.5 text-[#16B551]" />
                    <span>Ингредиентный состав блюда</span>
                  </h4>
                  
                  <div className="bg-[#FAFBFB] rounded-[22px] border border-[#EFF2F3] p-1.5 flex flex-col gap-1 shadow-[0_2px_6px_rgba(43,49,55,0.01)]">
                    {selectedDish.ingredients && selectedDish.ingredients.length > 0 ? (
                      selectedDish.ingredients.map((ing, i) => (
                        <div 
                          key={i} 
                          className="flex items-center justify-between py-2 px-3.5 bg-white rounded-[16px] border border-gray-50 shadow-[0_1px_3px_rgba(0,0,0,0.01)]"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${ing.status === "red" ? "bg-red-500" : ing.status === "yellow" ? "bg-yellow-400" : "bg-[#16B551]"}`} />
                            <span className="text-[13.5px] text-[#2B3137] font-semibold">{ing.name}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] text-[#737C86] font-black">{ing.weight}</span>
                            <span className={`text-[9.5px] font-black py-0.5 px-2 rounded-full leading-none ${ing.status === "red" ? "bg-red-50 text-red-500" : ing.status === "yellow" ? "bg-amber-50 text-amber-600" : "bg-[#E8F8EE] text-[#16B551]"}`}>
                              {ing.status === "red" ? "не WFPB" : ing.status === "yellow" ? "умеренно" : "без соли & масла"}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <span className="text-[13px] text-[#737C86] p-4 font-semibold text-center italic">Ингредиенты не указаны</span>
                    )}
                  </div>
                </div>

                {/* VITAMINS METRIC GRID */}
                <div className="mb-6.5">
                  <h4 className="text-[14.5px] font-black text-[#2B3137] mb-3 flex items-center gap-2">
                    <Sparkles className="w-4.5 h-4.5 text-[#16B551]" />
                    <span>Витаминный профиль</span>
                  </h4>
                  <div className="bg-[#FAFBFB] rounded-[24px] border border-[#EFF2F3] p-4 flex flex-col gap-3 shadow-[0_2px_6px_rgba(43,49,55,0.01)]">
                    {nutrientData.vitamins.map((vit, i) => (
                      <div key={i} className="flex flex-col gap-1.5 bg-white p-3 rounded-[16px] border border-gray-50 shadow-[0_1px_3px_rgba(0,0,0,0.01)]">
                        <div className="flex items-center justify-between text-[13px] font-bold">
                          <span className="text-[#2B3137] font-semibold">{vit.name}</span>
                          <span className="text-[#15803D] font-black">{vit.value}% <span className="text-[#8E9B9C] text-[10px] font-bold">от нормы</span></span>
                        </div>
                        <div className="w-full bg-[#EBF0F1] h-1.5 rounded-full overflow-hidden mt-0.5">
                          <div 
                            className="bg-gradient-to-r from-[#16B551] to-[#10D150] h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, vit.value)}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-[#737C86] font-medium leading-none mt-0.5">{vit.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* MINERALS / MICROELEMENTS METRIC GRID */}
                <div className="mb-6.5">
                  <h4 className="text-[14.5px] font-black text-[#2B3137] mb-3 flex items-center gap-2">
                    <Activity className="w-4.5 h-4.5 text-[#16B551]" />
                    <span>Микроэлементы и аминокислоты</span>
                  </h4>
                  <div className="bg-[#FAFBFB] rounded-[24px] border border-[#EFF2F3] p-4 flex flex-col gap-3 shadow-[0_2px_6px_rgba(43,49,55,0.01)]">
                    {nutrientData.minerals.map((min, i) => (
                      <div key={i} className="flex flex-col gap-1.5 bg-white p-3 rounded-[16px] border border-gray-50 shadow-[0_1px_3px_rgba(0,0,0,0.01)]">
                        <div className="flex items-center justify-between text-[13px] font-bold">
                          <span className="text-[#2B3137] font-semibold">{min.name}</span>
                          <span className="text-[#15803D] font-black">{min.value}% <span className="text-[#8E9B9C] text-[10px] font-bold">от нормы</span></span>
                        </div>
                        <div className="w-full bg-[#EBF0F1] h-1.5 rounded-full overflow-hidden mt-0.5">
                          <div 
                            className="bg-gradient-to-r from-[#16B551] to-[#10D150] h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, min.value)}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-[#737C86] font-medium leading-none mt-0.5">{min.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CHARACTER ANNA'S PRIVATE EXPERT WFPB COACH VIEW — hidden for book recipes */}
                {!selectedDish.isBookRecipe && <div className={`bg-gradient-to-r ${isClean ? "from-[#F0FDF4] to-[#ECFDF5]" : "from-[#FFFDF2] to-[#FFFBE6]"} rounded-[26px] p-5 sm:p-5.5 flex flex-col gap-4 text-left shadow-[0_8px_24px_rgba(22,181,81,0.03)] relative overflow-hidden mb-2`}>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-b from-[#10D150]/6 to-transparent rounded-full blur-2xl pointer-events-none" />
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Circular Avatar area of Anna */}
                      <div className="relative shrink-0 select-none">
                        <div className="w-[48px] h-[48px] rounded-full overflow-hidden shadow-md border border-brand-green-mint/30 relative bg-white">
                          <img 
                            src={resolveAvatarForCompliance(violationCount, selectedDish.ingredients.length).src}
                            alt="Анна — Советник WFPB" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className={`absolute -bottom-0.5 -right-0.5 w-[15px] h-[15px] rounded-full border border-white flex items-center justify-center text-[8.5px] ${isClean ? "bg-[#10D150]" : "bg-amber-500"}`}>
                          {isClean ? "🌱" : "💡"}
                        </span>
                      </div>

                      <div className="flex flex-col">
                        <span className="text-[15.5px] text-[#15803D] font-extrabold leading-none">
                          Анна
                        </span>
                        <span className="text-[11px] text-text-muted font-bold mt-0.5 leading-none">
                          Советник WFPB
                        </span>
                      </div>
                    </div>

                    <span className="px-3 py-1.5 rounded-xl bg-white/80 border border-gray-100 text-[11px] font-black text-text-dark shrink-0 shadow-[0_2px_6px_rgba(0,0,0,0.015)]">
                      {isClean ? "Идеально! 🥬" : "Рекомендация 💡"}
                    </span>
                  </div>

                  <div className="text-[13.5px] sm:text-[14px] text-[#2B3137] font-semibold leading-relaxed font-sans space-y-3">
                    {(selectedDish.annaComment || "").split("\n").map((para, pIdx) => {
                      if (!para.trim()) return <div key={pIdx} className="h-2" />;
                      
                      // Convert markdown **text** to <strong> and keep normal text
                      const parts = para.split(/(\*\*.*?\*\*)/g);
                      return (
                        <p key={pIdx}>
                          {parts.map((part, partIdx) => {
                            if (part.startsWith("**") && part.endsWith("**")) {
                              return (
                                <strong key={partIdx} className="font-extrabold text-[#15803D]">
                                  {part.slice(2, -2)}
                                </strong>
                              );
                            }
                            return part;
                          })}
                        </p>
                      );
                    })}
                  </div>
                </div>
                }

                {/* Book recipe flip card */}
                {selectedDish.isBookRecipe && selectedDish.bookRecipeRef && (() => {
                  const ref = selectedDish.bookRecipeRef!;
                  const backData = 
                    ref.type === "compliment" ? complimentsBackData.find(d => d.id === `compliment_${ref.id}`) :
                    ref.type === "breakfast" ? breakfastBackData.find(d => d.id === `breakfast_${ref.id}`) :
                    ref.type === "lunch" ? lunchBackData.find(d => d.id === `lunch_${ref.id}`) :
                    ref.type === "dinner" ? dinnerBackData.find(d => d.id === `dinner_${ref.id}`) :
                    ref.type === "recipe_of_day" ? recipeDayBackData.find(d => d.id === `recipe_day_${ref.id}`) :
                    ref.type === "must_have" ? mustHaveBackData.find(d => d.id === `must_have_${ref.id}`) :
                    null;
                  const imgSrc = getRecipeImagePath(ref.emotionalName, ref.technicalName);
                  const fontStyle = { fontFamily: '"Calibri", "Candara", sans-serif' };
                  return (
                    <div className="relative w-full" style={{ aspectRatio: "9 / 16", perspective: "1200px", ...fontStyle }}>
                      <div className="w-full h-full rounded-2xl overflow-hidden" style={{ backfaceVisibility: "hidden" }}>
                        {imgSrc ? (
                          <img src={imgSrc} alt="" className="w-full h-full object-cover" draggable={false} />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center">
                            <span className="text-5xl opacity-40">🍽</span>
                          </div>
                        )}
                      </div>
                      {backData && (
                        <div className="p-4 bg-white rounded-2xl mt-2 overflow-y-auto max-h-[300px]" style={{ scrollbarWidth: "none" }}>
                          <h4 className="text-[16px] font-bold text-gray-800 mb-2" style={fontStyle}>Ингредиенты:</h4>
                          <ul className="text-[14px] font-normal text-gray-700 space-y-1 list-disc list-inside" style={fontStyle}>
                            {backData.ingredients.map((item: string, i: number) => {
                              const isH = item.trim().endsWith(":") && !/[\d]+[.\s]*(г|мл|шт|ч|л|ст|зуб|пуч|горст|щепот|капл|дол|куб|ломт|лист|стебл|пер|пач|бан)/i.test(item);
                              if (isH) return <h5 key={i} className="text-[15px] font-bold text-gray-800 mt-3 mb-1.5" style={fontStyle}>{item}</h5>;
                              return <li key={i}>{item}</li>;
                            })}
                          </ul>
                          <h4 className="text-[16px] font-bold text-gray-800 mt-4 mb-2" style={fontStyle}>Способ приготовления:</h4>
                          <p className="text-[14px] font-normal text-gray-700 leading-relaxed whitespace-pre-line" style={fontStyle}>{backData.instructions}</p>
                          {backData.kbju.length > 0 && (
                            <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1.5">
                              {backData.kbju.map((item: string, i: number) => {
                                const [label, value] = item.includes(":") ? item.split(":") : [item, ""];
                                return (
                                  <div key={i} className="flex items-baseline gap-1 text-[14px]" style={fontStyle}>
                                    <span className="text-gray-400 font-normal">{label.trim()}:</span>
                                    <span className="text-gray-800 font-semibold">{value.trim()}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingDish && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#2B3137]/45 backdrop-blur-xs flex items-end justify-center z-50 p-3.5"
            onClick={() => setEditingDish(null)}
          >
            <motion.div
              initial={{ y: "100%", scale: 0.98 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: "100%", scale: 0.98 }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="w-full bg-white rounded-t-[36px] rounded-b-[28px] max-h-[85%] overflow-y-auto shadow-2xl flex flex-col text-left text-[#2B3137] border border-gray-100 p-6"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <span className="text-[11px] font-black uppercase text-[#16B551] tracking-wider block">
                    Первая настройка блюда
                  </span>
                  <h3 className="text-[19px] font-black text-[#2B3137] leading-tight mt-0.5">
                    Выберите категорию
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingDish(null)}
                  className="w-9 h-9 rounded-full bg-[#FAFBFB] flex items-center justify-center text-[#737C86] hover:bg-gray-100 active:scale-95 transition-all cursor-pointer border border-[#EFF2F3]"
                >
                  <X className="w-5 h-5 shrink-0" />
                </button>
              </div>

              {/* Informative description block with meal preview */}
              <div className="bg-[#FAFBFB] rounded-2xl p-3.5 border border-[#EFF2F3] mb-5 flex gap-3.5 items-center">
                <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden shrink-0 border border-gray-200/60 flex items-center justify-center">
                  <img src={editingDish.image} alt={editingDish.name} className="w-full h-full object-cover" />
                </div>
                <div>
                  <h4 className="text-[14px] font-extrabold text-[#2B3137] leading-tight">
                    {editingDish.name}
                  </h4>
                  <p className="text-[11.5px] text-[#737C86] font-semibold mt-0.5 leading-normal">
                    Укажите категорию для правильного долгосрочного учёта в рационе.
                  </p>
                </div>
              </div>

              {/* Dropdown / Selection Pill Grid */}
              <div className="mb-4">
                <span className="text-[11px] text-[#737C86] font-black uppercase tracking-wider block mb-2">
                  Выбрать из существующих категорий
                </span>
                <div className="flex flex-wrap gap-2 p-2 bg-[#FAFBFB] rounded-2xl border border-[#EFF2F3] max-h-[150px] overflow-y-auto">
                  {categories.map((cat) => {
                    const isSelected = selectedCatVal === cat && customCategory === "";
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setSelectedCatVal(cat);
                          setCustomCategory("");
                        }}
                        className={`py-2 px-3.5 rounded-[12px] text-[12.5px] font-bold transition-all border cursor-pointer ${
                          isSelected
                            ? "bg-[#E8F8EE] border-[#10D150] text-[#16B551] shadow-[0_2px_8px_rgba(22,181,81,0.08)] scale-[1.02]"
                            : "bg-white border-[#EFF2F3] text-[#737C86] hover:bg-gray-50"
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom input path */}
              <div className="mb-6">
                <span className="text-[11px] text-[#737C86] font-black uppercase tracking-wider block mb-2">
                  или создать свою категорию
                </span>
                <input
                  type="text"
                  placeholder="Введите название новой категории, напр. Перекусы"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="w-full bg-[#FAFBFB] border border-[#EFF2F3] text-[#2B3137] placeholder-[#8E9B9C] focus:border-[#16B551] focus:bg-white text-[13.5px] font-semibold py-3 px-4 rounded-xl outline-none transition-all duration-200"
                />
              </div>

              {/* Save changes button */}
              <button
                type="button"
                onClick={() => {
                  const finalCat = customCategory.trim() ? customCategory.trim() : selectedCatVal;
                  if (!finalCat) return; // guard
                  
                  onSaveDishCategory(editingDish.id, finalCat);
                  setActiveCategory(finalCat); // Auto scroll/switch tab
                  setEditingDish(null);
                }}
                className="w-full py-3.5 bg-[#16B551] hover:bg-[#10D150] text-white text-[14.5px] font-black rounded-xl cursor-pointer shadow-[0_4px_14px_rgba(22,181,81,0.2)] hover:shadow-[0_6px_18px_rgba(22,181,81,0.25)] transition-all duration-300 text-center flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <span>Сохранить изменения</span>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* STICKY FIXED TAB BOTTOM APP BAR */}
      <div className="w-full shrink-0 absolute bottom-0 left-0 right-0 z-30">
        <BottomBar 
          onHomeClick={onNavigateHome}
          onDiaryClick={onNavigateDiary}
          onAnalyticsClick={onNavigateProgress}
          activeTab="my-day" 
        />
      </div>

    </div>
  );
}
