import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ChevronLeft, 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  Trash2, 
  Check, 
  Sparkles,
  X,
  AlertTriangle
} from "lucide-react";
import { getTelegramInitData } from "../utils/telegramClient";
import BottomBar from "./BottomBar";
import CalendarButton from "./CalendarButton";
import { resolveAvatar } from "../utils/annaAvatarResolver";
import { getIngredientImage, imageMap } from "../utils/ingredientMapper";
import { INGREDIENT_CATEGORY_MAP, isSpiceIngredient } from "../utils/ingredientCategoryMap";
import { normalize, resolveAgainstIndex } from "../utils/ingredientMappingCore";
import {
  buildStrictIndex,
  isNutritionComplete,
  resolveIngredientStrict,
  resolveIngredientWithFallback,
} from "../utils/ingredientResolver";
import ingrGreen from "../assets/ingredients/ingr_green.webp";
import ingrRed from "../assets/ingredients/ingr_red.webp";
import greylogo from "../assets/images/greylogo.webp";
import categorySoup from "../assets/categories/category_soup.webp";
import categorySalad from "../assets/categories/category_salad.webp";
import categoryMain from "../assets/categories/category_main.webp";
import categoryDrink from "../assets/categories/category_drink.webp";
import categorySmoothie from "../assets/categories/category_smoothie.webp";
import categorySnack from "../assets/categories/category_snack.webp";
import categorySauce from "../assets/categories/category_sauce.webp";
import categoryDessert from "../assets/categories/category_dessert.webp";
import categoryBakery from "../assets/categories/category_bakery.webp";
import logoSprout from "../assets/images/buttons/logo.webp";
import { checkWFPB } from "../utils/wfpbRules";
import { matchDBStatus } from "../utils/wfpbMatch";
import { useAppStore, type FoodCacheItem } from "../store/useAppStore";
import { clientLogger } from "../utils/clientLogger";
import type { MealSource } from "../services/aiLayer";

const annaAvatarSrc = resolveAvatar({ toneGroup: 'reminder_caution', intent: 'caution' }).src;

// 9 dish categories for the "Из того, что есть" module (image left + text right, pastel background)
interface DishCategoryOption {
  key: string;
  image: string;
  color: string;
}

const DISH_CATEGORIES: DishCategoryOption[] = [
  { key: "Первые блюда", image: categorySoup, color: "#FFF0E5" },
  { key: "Салаты", image: categorySalad, color: "#EBF5EA" },
  { key: "Вторые блюда", image: categoryMain, color: "#FDF5E6" },
  { key: "Напитки", image: categoryDrink, color: "#E8F4F8" },
  { key: "Смузи", image: categorySmoothie, color: "#E2F0E9" },
  { key: "Закуски", image: categorySnack, color: "#F5EEF8" },
  { key: "Соусы", image: categorySauce, color: "#FCE4E4" },
  { key: "Десерты", image: categoryDessert, color: "#F5E6ED" },
  { key: "Выпечка", image: categoryBakery, color: "#FFF6DB" },
];

// Активная палитра табов справочника ингредиентов в панели «Заменить ингредиент».
const CATEGORY_TAB_ACTIVE_STYLES: Record<string, { bg: string; text: string; shadow: string }> = {
  "Бобовые":                       { bg: "#DDF4E4", text: "#176B3A", shadow: "#92CFA6" },
  "Злаки и псевдозлаки":           { bg: "#FFF1CC", text: "#8A5A00", shadow: "#E6C16B" },
  "Орехи и кокосовая стружка":     { bg: "#F4E3D0", text: "#87542E", shadow: "#D6A77E" },
  "Семена":                        { bg: "#EEE2F6", text: "#68427D", shadow: "#C49AD7" },
  "Специи и сухие ингредиенты":    { bg: "#FBE0D2", text: "#9A3D1F", shadow: "#E6A37E" },
  "Свежие продукты":               { bg: "#DCEFF1", text: "#1D6870", shadow: "#8FC8CD" },
};
const CATEGORY_TAB_INACTIVE = { bg: "#F7F9FA", text: "#66717B", shadow: "#DCE3E7" };

interface CheckCompositionScreenProps {
  onBack?: () => void;
  initialIngredients?: any[];
  onAnalyzeComplete: (cards: any[], meta?: { mealSource?: MealSource | null; dishCategory?: string | null }) => void;
  dayNotes?: Record<number, { text: string; time: string }[]>;
  currentDayIndex: number;
  screen?: string;
  onOpenCalendar?: () => void;
  mealSource?: MealSource | null;
  dishCategory?: string | null;
  onDishCategoryChange?: (category: string | null) => void;
}

// Выбираемая опция — строится ИСКЛЮЧИТЕЛЬНО из реальной записи FoodCacheItem.
// Никаких статических лейблов без foodItemId в UI выбора не существует.
interface SelectableFoodOption {
  foodItemId: string; // FoodCacheItem.id
  label: string; // FoodCacheItem.nameRu (canonical)
  searchHaystack: string; // normalized nameRu + nameEn
  wfpbStatus: "green" | "forbidden";
  imageSrc: string;
  subcategory?: string;
}

interface IngredientCard {
  id: string;
  fullName: string;
  shortName: string;
  image: string;
  weight?: number;
  // "unrecognized" — название не сопоставлено с FoodItem strict-resolver'ом.
  // Логически НЕ равно "blue": blue зарезервирован за non-food/несъедобным сценарием.
  status: "green" | "error" | "blue" | "unrecognized";
  manuallyAllowed?: boolean;
  dbKey?: string; // resolved normalized DB nameRu key (from ingredientMappingCore)
  fdcId?: number;
  enteredName?: string; // исходное пользовательское название (технически, не показывается)
  foodItemId?: string; // стабильная runtime identity — FoodItem.id
  canonicalName?: string; // FoodItem.nameRu
  resolutionStatus?: "resolved" | "unresolved";
  // Карточка из фото-распознавания: рендерится сразу по rich-данным Qwen.
  // Совпадение с FoodItem только обогащает display-safe поля; отсутствие
  // совпадения НЕ переводит карточку в unrecognized и не создаёт записей.
  scanRecognized?: boolean;
}



// WFPB-табы нижней панели — ТОЛЬКО навигация. Опции строятся исключительно
// из реальных FoodItem записей foodCache (см. greenFoodOptions ниже).
const WFPB_TAB_CATEGORIES = [
  "Бобовые",
  "Злаки и псевдозлаки",
  "Орехи и кокосовая стружка",
  "Семена",
  "Специи и сухие ингредиенты",
  "Свежие продукты",
] as const;

type WfpbTab = (typeof WFPB_TAB_CATEGORIES)[number];

// Нормализованные перестановки порядка слов (2–4 слова, ≤ 24 вариантов).
// Зеркалирует серверный generateWordPermutations: «масло подсолнечное» ↔
// «подсолнечное масло». Для 1 слова и длиннее 4 слов — пустой массив.
function generateWordPermutations(name: string): string[] {
  const words = normalize(name).split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 4) return [];
  const results: string[] = [];
  const seen = new Set<string>();
  const permute = (prefix: string[], rest: string[]) => {
    if (rest.length === 0) {
      const joined = prefix.join(" ");
      if (!seen.has(joined)) {
        seen.add(joined);
        results.push(joined);
      }
      return;
    }
    for (let i = 0; i < rest.length; i++) {
      permute([...prefix, rest[i]], [...rest.slice(0, i), ...rest.slice(i + 1)]);
    }
  };
  permute([], words);
  return results;
}

// Изображение для реальной FoodItem записи. Шаг 1 — существующий
// getIngredientImage (exact/модификаторы/усечение/алиасы). Шаг 2 — fallback
// для записей без точного образа: каждый словоформ ввода должен быть покрыт
// каким-то словом ключа imageMap (точное совпадение, локальная таблица
// эквивалентных словоформ или общий префикс ≥ 4). Ключи, не покрывающие ВСЕ
// слова ввода, отбрасываются — это исключает нерелевантные миниатюры.
const FOOD_WORD_IMAGE_HINTS: Record<string, string[]> = {
  // «крупа гречневая» / «гречневая …» ↔ ассет «гречка.webp»
  "гречневая": ["гречка"],
  "гречневый": ["гречка"],
};

function resolveFoodItemImage(nameRu: string): string | null {
  const direct = getIngredientImage(nameRu);
  if (direct) return direct;
  const inputWords = normalize(nameRu).split(/\s+/).filter(Boolean);
  if (inputWords.length === 0) return null;

  let bestKey: string | null = null;
  let bestScore = 0;
  for (const key of Object.keys(imageMap)) {
    const keyWords = key.split(/\s+/);
    let totalScore = 0;
    let fullyCovered = true;
    for (const iw of inputWords) {
      const forms = [iw, ...(FOOD_WORD_IMAGE_HINTS[iw] || [])];
      let wordScore = 0;
      for (const form of forms) {
        for (const kw of keyWords) {
          if (form === kw) {
            wordScore = Math.max(wordScore, 100 + form.length);
          } else {
            const minLen = Math.min(form.length, kw.length);
            if (minLen < 4) continue;
            let lcp = 0;
            while (lcp < minLen && form[lcp] === kw[lcp]) lcp++;
            if (lcp >= 4) wordScore = Math.max(wordScore, lcp);
          }
        }
      }
      // Слово ввода не покрыто ни одной формой — ключ нерелевантен.
      if (wordScore === 0) {
        fullyCovered = false;
        break;
      }
      totalScore += wordScore;
    }
    if (fullyCovered && totalScore > bestScore) {
      bestScore = totalScore;
      bestKey = key;
    }
  }
  if (bestKey) return imageMap[bestKey];

  // Последняя ступень: доверенная таблица словоформ. Полное покрытие не
  // сработало (напр., «крупа» не встречается в ключах), но словоформа
  // однозначно указывает на семейство продуктов («гречневая» → «гречка»).
  for (const iw of inputWords) {
    const hinted = FOOD_WORD_IMAGE_HINTS[iw]?.find(h => imageMap[normalize(h)]);
    if (hinted) return imageMap[normalize(hinted)];
  }
  return null;
}

// Initial state simulating highly intelligent real-time AI computer vision recognition
const INITIAL_CARDS: IngredientCard[] = [
  { 
    id: "quinoa", 
    fullName: "Киноа", 
    shortName: "Киноа", 
    image: "",
    status: "green"
  },
  { 
    id: "chickpeas", 
    fullName: "Нут", 
    shortName: "Нут", 
    image: "", 
    status: "green" 
  },
  { 
    id: "cucumber", 
    fullName: "Огурцы грунтовые хрустящие с пупырышками", 
    shortName: "Огурцы", 
    image: "", 
    status: "green" 
  },
  { 
    id: "greens", 
    fullName: "Шпинат молодой нежный сочные листья", 
    shortName: "Шпинат", 
    image: "", 
    status: "green" 
  },
  { 
    id: "sauce", 
    fullName: "Кунжут белый неочищенный сырой", 
    shortName: "Кунжут", 
    image: "", 
    status: "green" 
  },
  { 
    id: "meat", 
    fullName: "Кусочки запечённого мяса говядины с солью", 
    shortName: "Мясо с солью", 
    image: "", 
    status: "error" // Prohibited/danger animal + salt status
  },
];

const MOCK_NON_FOOD_CARDS: IngredientCard[] = [
  {
    id: "keys",
    fullName: "Связка металлических ключей на стальном кольце",
    shortName: "Ключи",
    weight: 45,
    status: "blue",
    image: ""
  },
  {
    id: "eyeglasses",
    fullName: "Очки для чтения в чёрной пластиковой оправе",
    shortName: "Очки",
    weight: 28,
    status: "blue",
    image: ""
  },
  {
    id: "ceramic_mug",
    fullName: "Керамическая чашка для кофе (пустая)",
    shortName: "Чашка",
    weight: 310,
    status: "blue",
    image: ""
  }
];

// Dynamically run programmatic loop to guarantee every catalog item has its custom premium image populated
INITIAL_CARDS.forEach(c => {
  if (!c.image) {
    c.image = getIngredientImage(c.shortName || c.fullName) || '';
  }
});

MOCK_NON_FOOD_CARDS.forEach(c => {
  if (!c.image) {
    c.image = getIngredientImage(c.shortName || c.fullName) || '';
  }
});

// Autocomplete-подсказки под инпутом имени/уточнения: ТОЛЬКО реальные
// FoodItem записи foodCache (green и красные). Правдивые состояния:
// загрузка / база недоступна / ничего не найдено. Пустой запрос — список скрыт.
function FoodAutocompleteList({
  loading,
  loaded,
  suggestions,
  query,
  onSelect,
}: {
  loading: boolean;
  loaded: boolean;
  suggestions: { item: FoodCacheItem; isRed: boolean }[];
  query: string;
  onSelect: (opt: { foodItemId: string; label: string; wfpbStatus: "green" | "forbidden" }) => void;
}) {
  if (!loading && !query.trim()) return null;
  if (loading) {
    return (
      <div className="bg-white border border-[#EFF2F3] rounded-[14px] px-3 py-2 text-[12px] text-[#A1B0B8] font-semibold text-left">
        Справочник продуктов загружается…
      </div>
    );
  }
  if (!loaded) {
    return (
      <div className="bg-white border border-[#EFF2F3] rounded-[14px] px-3 py-2 text-[12px] text-[#A1B0B8] font-semibold text-left">
        База продуктов временно недоступна
      </div>
    );
  }
  if (suggestions.length === 0) {
    return (
      <div className="bg-white border border-[#EFF2F3] rounded-[14px] px-3 py-2 text-[12px] text-[#A1B0B8] font-semibold text-left">
        Ничего не найдено в базе продуктов
      </div>
    );
  }
  return (
    <div className="bg-white border border-[#EFF2F3] shadow-[0_12px_28px_rgba(43,49,55,0.12)] rounded-[16px] max-h-[200px] overflow-y-auto flex flex-col z-40">
      {suggestions.map(({ item, isRed }) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect({
            foodItemId: item.id,
            label: item.nameRu,
            wfpbStatus: isRed ? "forbidden" : "green",
          })}
          className="w-full hover:bg-[#F3F9F4] rounded-[10px] px-2.5 py-1.5 flex items-center gap-2 text-left transition-colors duration-150 cursor-pointer text-[13px] font-semibold text-[#2B3137]"
        >
          <span
            aria-hidden="true"
            className={`w-2 h-2 rounded-full shrink-0 ${isRed ? "bg-red-500" : "bg-emerald-500"}`}
          />
          <span className={`truncate ${isRed ? "text-red-600" : ""}`}>{item.nameRu}</span>
        </button>
      ))}
    </div>
  );
}

// Checks if the typed or chosen name complies with strict WFPB salt-free, oil-free guidelines
export default function CheckCompositionScreen({
  initialIngredients = [],
  onAnalyzeComplete,
  currentDayIndex,
  onBack: propsOnBack,
  dayNotes: propsDayNotes,
  screen: propsScreen,
  onOpenCalendar: propsOnOpenCalendar,
  mealSource,
  dishCategory,
  onDishCategoryChange,
}: CheckCompositionScreenProps) {
  const setScreen = useAppStore((s) => s.setScreen);
  const onBack = propsOnBack || (() => setScreen(mealSource === "from-what-is" ? "my-day" : "what-i-eat"));
  const dayNotes = propsDayNotes || {};
  const screen = propsScreen || useAppStore((s) => s.screen);
  const onOpenCalendar = propsOnOpenCalendar || (() => {});
  // Base of products for authoritative wfpbStatus lookup
  const foodCache = useAppStore((s) => s.foodCache);
  const foodCacheLoading = useAppStore((s) => s.foodCacheLoading);
  const fetchFoodCache = useAppStore((s) => s.fetchFoodCache);

  useEffect(() => {
    if (foodCache.length === 0 && !foodCacheLoading) fetchFoodCache();
  }, []);

  // Индекс канонических ключей БД (нормализованные nameRu) — для резолва dbKey
  // теми же правилами нечёткого маппинга, что и картинки/статусы.
  const dbKeyIndex = React.useMemo(
    () => new Set(foodCache.map(i => normalize(i.nameRu))),
    [foodCache]
  );

  // Checks compliance: DB wfpbStatus (exact nameRu match) is authoritative,
  // text heuristics apply only when the product is not in the base.
  const checkIsCompliant = (name: string): boolean => {
    const dbStatus = matchDBStatus(name, foodCache);
    if (dbStatus) return dbStatus !== "forbidden";
    return checkWFPB(name).compliant;
  };

  // Strict-индексы полной FoodItem-базы (включая forbidden) для identity.
  const strictIndex = React.useMemo(
    () => buildStrictIndex(foodCache),
    [foodCache]
  );

  // Индекс принадлежности продуктов табам: normalized label → {таб, подкатегория}.
  // INGREDIENT_CATEGORY_MAP используется ТОЛЬКО как фильтр/группировка реальных
  // FoodItem записей; сам по себе он не создаёт видимых опций.
  const categoryTabIndex = React.useMemo(() => {
    const m = new Map<string, { tab: WfpbTab; sub?: string }>();
    for (const [cat, labels] of Object.entries(INGREDIENT_CATEGORY_MAP)) {
      let tab = cat as WfpbTab;
      let sub: string | undefined;
      if (cat.startsWith("Свежие продукты - ")) {
        tab = "Свежие продукты";
        sub = cat.slice("Свежие продукты - ".length);
      }
      for (const label of labels) {
        const key = normalize(label);
        if (key && !m.has(key)) m.set(key, { tab, sub });
      }
    }
    return m;
  }, []);

  // Выбираемые опции WFPB-табов: только реальные green + nutritionComplete
  // FoodItem записи, отнесённые к табу через categoryTabIndex. Записи без
  // категории в табах не изобретаются и не подменяются статикой.
  const greenFoodOptionsByTab = React.useMemo(() => {
    const byTab: Record<string, SelectableFoodOption[]> = {};
    for (const tab of WFPB_TAB_CATEGORIES) byTab[tab] = [];
    if (foodCache.length === 0) return byTab;
    for (const item of foodCache) {
      if (item.wfpbStatus !== "green" || !isNutritionComplete(item)) continue;
      const grp = categoryTabIndex.get(normalize(item.nameRu));
      if (!grp) continue;
      (byTab[grp.tab] || (byTab[grp.tab] = [])).push({
        foodItemId: item.id,
        label: item.nameRu,
        searchHaystack: `${normalize(item.nameRu)} ${normalize(item.nameEn || "")}`.trim(),
        wfpbStatus: "green",
        imageSrc: resolveFoodItemImage(item.nameRu) || ingrGreen,
        subcategory: grp.sub,
      });
    }
    for (const tab of Object.keys(byTab)) {
      byTab[tab].sort((a, b) => a.label.localeCompare(b.label, "ru"));
    }
    return byTab;
  }, [foodCache, categoryTabIndex]);

  // Полный пул для autocomplete: ВСЕ реальные nutritionally complete FoodItem
  // записи — и зелёные, и красные. Красный результат выбираем и оставляем
  // красным с существующим ручным «Разрешить».
  const completeFoodItems = React.useMemo(
    () => foodCache.filter(item => isNutritionComplete(item)),
    [foodCache]
  );

  // Однократная строгая идентификация карточек после загрузки foodCache:
  // hit → resolved (foodItemId + canonicalName); miss → unrecognized.
  // Статусы "blue"/non-food не трогаются.
  const cardsIdentityAppliedRef = useRef(false);
  useEffect(() => {
    if (foodCache.length === 0 || cardsIdentityAppliedRef.current) return;
    cardsIdentityAppliedRef.current = true;
    setCards(prev => prev.map(c => {
      if (c.status === "blue") return c; // non-food — вне nutrition domain
      if (c.foodItemId && c.resolutionStatus === "resolved") return c;
      const r =
        resolveIngredientWithFallback(c.shortName || "", foodCache, strictIndex) ||
        resolveIngredientWithFallback(c.fullName || "", foodCache, strictIndex);
      if (r.ok && r.nutritionComplete) {
        // Статус назначает ТОЛЬКО приложение по реальной FoodItem записи
        // (read-only обогащение display-safe полей: каноническое имя, статус,
        // изображение). Для scan-карточек морфологический маппер изображений
        // приоритетнее generic-fallback распознавания.
        const resolvedStatus: "green" | "error" = r.wfpbStatus === "forbidden" ? "error" : "green";
        return {
          ...c,
          enteredName: c.enteredName ?? c.fullName ?? c.shortName,
          status: resolvedStatus,
          image: c.scanRecognized
            ? (resolveFoodItemImage(r.canonicalName) || c.image)
            : (c.image || resolveFoodItemImage(r.canonicalName) || (resolvedStatus === "error" ? ingrRed : ingrGreen)),
          foodItemId: r.foodItemId,
          canonicalName: r.canonicalName,
          resolutionStatus: "resolved" as const,
        };
      }
      // Промах resolver'а:
      // — scan-карточка остаётся узнанной rich-карточкой распознавания
      //   (никакой деградации в unrecognized, никакой записи в FoodItem);
      // — ручной ввод из каталога/редактирования помечается unrecognized
      //   и идёт через существующий refine-flow.
      if (c.scanRecognized) {
        return {
          ...c,
          enteredName: c.enteredName ?? c.shortName ?? c.fullName,
        };
      }
      return {
        ...c,
        enteredName: c.enteredName ?? c.shortName ?? c.fullName,
        status: "unrecognized" as const,
        resolutionStatus: "unresolved" as const,
        foodItemId: undefined,
        canonicalName: undefined,
      };
    }));
  }, [foodCache, strictIndex]);

  // Refine-состояние для unrecognized-карточки («Уточните название ингредиента»).
  const [refineName, setRefineName] = useState<string>("");
  const [refineError, setRefineError] = useState<boolean>(false);
  // Явно выбранный реальный FoodItem (autocomplete или WFPB-таб).
  // Никогда не представлен одной строкой: только тройка id/canonical/status.
  const [selectedFood, setSelectedFood] = useState<{
    foodItemId: string;
    canonicalName: string;
    wfpbStatus: "green" | "forbidden";
    image?: string;
  } | null>(null);
  // Текст autocomplete-запроса под инпутами имени/уточнения.
  const [suggestQuery, setSuggestQuery] = useState<string>("");
  // Start with a premium AI computer vision loading state
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(true);
  
  const [cards, setCards] = useState<IngredientCard[]>(() => {
    if (initialIngredients && initialIngredients.length > 0) {
      // Нейтральные карточки-кандидаты: сырые названия + вес. Никаких
      // эвристических переименований и никаких входящих статусов от
      // распознавания — identity/status/image назначает строгий resolver ниже.
      return initialIngredients.map(ing => ({
        ...ing,
        fullName: ing.fullName || "",
        shortName: ing.shortName || ""
      }));
    }
    return INITIAL_CARDS;
  });
  // Initially no card is selected, meaning edit panel is closed
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  // Draft выбора сбрасывается при смене редактируемой карточки,
  // чтобы выбранный продукт не «перетёк» в другую карточку.
  useEffect(() => {
    setSelectedFood(null);
    setSuggestQuery("");
  }, [selectedCardId]);
  const [activeCategory, setActiveCategory] = useState<string>("Бобовые");
  
  // Custom subcategory for "Свежие продукты" tab
  const [activeSubcategory, setActiveSubcategory] = useState<"Все" | "Овощи" | "Фрукты и ягоды" | "Зелень и прочее">("Все");

  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Editing form states
  const [editedFullName, setEditedFullName] = useState<string>("");
  const [editedShortName, setEditedShortName] = useState<string>("");
  const [editedImage, setEditedImage] = useState<string>("");
  const [editedWeight, setEditedWeight] = useState<number>(100);
  // Draft вручную разрешённого статуса: коммитится только по «Подтвердить».
  const [draftManuallyAllowed, setDraftManuallyAllowed] = useState<boolean>(false);

  // Ref для горизонтального scroll-контейнера категорий справочника.
  const categoryTabsScrollRef = useRef<HTMLDivElement>(null);

  // Desktop wheel → горизонтальная прокрутка ленты категорий.
  // Нативный listener с passive:false (React onWheel пассивен) привязывается
  // только к самой ленте. На границах ленты wheel не перехватывается —
  // страница продолжает прокручиваться нативно. Touch swipe не затронут
  // (touch-action: pan-x остаётся на элементе).
  useEffect(() => {
    const el = categoryTabsScrollRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return; // нет горизонтального overflow — нативный скролл страницы
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (!delta) return;
      const atStart = el.scrollLeft <= 0;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
      if ((delta < 0 && atStart) || (delta > 0 && atEnd)) return; // край в направлении жеста — не блокируем страницу
      e.preventDefault();
      const reduceMotion =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const next = Math.max(0, Math.min(el.scrollWidth - el.clientWidth, el.scrollLeft + delta));
      el.scrollTo({ left: next, behavior: reduceMotion ? "auto" : "smooth" });
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  // Специи и сухие ингредиенты: дробная граммовка (шаг/минимум 0.5 г, старт 5 г).
  const spiceMode = isSpiceIngredient(editedFullName) || isSpiceIngredient(editedShortName);
  const WEIGHT_STEP = spiceMode ? 0.5 : 10;
  const WEIGHT_FLOOR = spiceMode ? 0.5 : 10;
  const round1 = (v: number) => Math.round(v * 10) / 10;

  // Trigger simulated AI scanning process
  const [isPulsing, setIsPulsing] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const visibleItems = cards.map(c => ({
      name: c.fullName || c.shortName,
      weight_g: c.weight || 100,
      safety_status: c.status // "green" | "error" (red) | "blue"
    }));

    (window as any).currentScreenContext = {
      screen_id: "check-composition",
      screen_title: "Корректировка состава и веса ингредиентов",
      current_day: currentDayIndex,
      active_tab: activeCategory,
      current_subscreen: activeSubcategory,
      selected_item: selectedCardId ? cards.find(c => c.id === selectedCardId)?.fullName : null,
      visible_items: visibleItems,
      current_status: isAnalyzing ? "Идёт тонкая молекулярная оценка и калибровка состава..." : "Распознанные компоненты блюда выведены на экран",
      modal_data: selectedCardId ? {
        editing_ingredient: editedFullName,
        configured_weight: editedWeight,
        is_safe_wfpb: cards.find(c => c.id === selectedCardId)?.status !== "error"
      } : null
    };

    return () => {
      if ((window as any).currentScreenContext?.screen_id === "check-composition") {
        delete (window as any).currentScreenContext;
      }
    };
  }, [currentDayIndex, cards, selectedCardId, activeCategory, activeSubcategory, isAnalyzing, editedFullName, editedWeight]);

  useEffect(() => {
    const t = setTimeout(() => {
      setIsAnalyzing(false);
    }, 1600);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!isAnalyzing) {
      setIsPulsing(true);
      const timer = setTimeout(() => {
        setIsPulsing(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isAnalyzing]);

  const isNonFoodMode = cards.some(c => c.status === "blue");

  const [dynamicSarcasticReply, setDynamicSarcasticReply] = useState<string>("");
  const [isLoadingReply, setIsLoadingReply] = useState<boolean>(false);

  useEffect(() => {
    const blueCards = cards.filter(c => c.status === "blue");
    if (blueCards.length > 0) {
      setIsLoadingReply(true);
      fetch("/api/anna-sarcastic-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Telegram-Init-Data": getTelegramInitData() },
        body: JSON.stringify({ items: blueCards.map(c => c.shortName || c.fullName) })
      })
      .then(res => {
        if (!res.ok) throw new Error("Server responded with error code");
        return res.json();
      })
      .then(data => {
        if (data && data.message) {
          setDynamicSarcasticReply(data.message);
        }
      })
      .catch(err => {
        console.error("Error loading dynamic sarcastic comment from server:", err);
      })
      .finally(() => {
        setIsLoadingReply(false);
      });
    } else {
      setDynamicSarcasticReply("");
    }
  }, [cards]);

  const getAnnaSarcasticReply = () => {
    if (isLoadingReply) {
      return "Анна удивлённо рассматривает кадр и подбирает слова... ✍️";
    }
    if (dynamicSarcasticReply) {
      return dynamicSarcasticReply;
    }
    const blueCards = cards.filter(c => c.status === "blue");
    const itemsStr = blueCards.map(c => `«${c.shortName}»`).join(" и ");
    return `Ой, какая необычная тарелка! Система распознала здесь ${itemsStr || "непищевые вещи"}. Конечно, в них рекордно мало калорий и полностью отсутствует соль, но боюсь, даже крепкая эмаль зубов и WFPB-философия не справятся с их усвоением! Кажется, ты пытаешься пообедать несъедобными предметами. Давай оставим это для декора или быта, а для здоровых сосудов и эндотелия выберем чистую растительную пищу. Пожалуйста, вернись назад и загрузи фото настоящего полезного блюдо! 💚`;
  };

  // Synchronise form states when selectedCardId switches
  useEffect(() => {
    if (!selectedCardId) return;

    if (selectedCardId === "add-new") {
      setEditedFullName("Выберите ингредиент");
      setEditedShortName("");
      setEditedImage("https://images.unsplash.com/photo-1547058886-f6d8174f85e4?auto=format&fit=crop&q=80&w=150");
      setEditedWeight(100);
      setDraftManuallyAllowed(false);
      setIsDropdownOpen(false);
      setRefineName("");
      setRefineError(false);
      return;
    }

    const card = cards.find(c => c.id === selectedCardId);
    if (card) {
      setEditedFullName(card.fullName);
      setEditedShortName(card.shortName);
      setEditedImage(card.image);
      setEditedWeight(card.weight || 100);
      setDraftManuallyAllowed(card.manuallyAllowed === true);
      setIsDropdownOpen(false);
      // Поле уточнения — только для unrecognized-карточки.
      setRefineName(card.status === "unrecognized" ? (card.enteredName || "") : "");
      setRefineError(false);

      // Preset активного таба по принадлежности имени карточки категории
      // (categoryTabIndex — фильтр реальных FoodItem, не источник опций).
      const grp = categoryTabIndex.get(
        normalize(card.canonicalName || card.fullName || card.shortName)
      );
      setActiveCategory(grp?.tab ?? "Бобовые");
      if ((grp?.tab ?? "Бобовые") === "Свежие продукты") {
        setActiveSubcategory((grp?.sub as typeof activeSubcategory) ?? "Все");
      } else {
        setActiveSubcategory("Все");
      }
    }
  }, [selectedCardId, cards]);

  const activeCard = selectedCardId === "add-new" 
    ? { id: "add-new", fullName: editedFullName, shortName: editedShortName, image: editedImage, status: "green" as const } 
    : cards.find(c => c.id === selectedCardId);

  // Save changes of current ingredient card
  const handleSaveIngredient = () => {
    if (!selectedCardId) return;

    const targetCard = cards.find(c => c.id === selectedCardId);

    // Unrecognized-карточка: обычное «Подтвердить» сохраняет ТОЛЬКО вес.
    // Имя, статус и identity меняет исключительно «Подтвердить ингредиент»
    // (handleConfirmIngredient). Legacy-эвристики здесь запрещены.
    if (selectedCardId !== "add-new" && targetCard?.status === "unrecognized") {
      setCards(prev => prev.map(c =>
        c.id === selectedCardId ? { ...c, weight: editedWeight } : c
      ));
      showToast(`Сохранено: вес ${editedWeight} г 🌱`);
      setSelectedCardId(null);
      return;
    }

    const trimmedName = editedShortName.trim() || editedFullName.trim();
    if (!trimmedName || trimmedName === "Выберите ингредиент") {
      showToast("Пожалуйста, выберите или введите название ингредиента 🌱");
      return;
    }

    // Identity должна соответствовать актуальному имени карточки.
    // Регрессия-фикс: имя считается изменённым ТОЛЬКО если оно отличается
    // от ВСЕХ имён карточки (canonicalName, fullName, shortName).
    // Описательные имена («Баранина мелко рубленая» → canonical «баранина»)
    // и изменения веса/разрешения НЕ должны перезапускать resolver — иначе
    // resolved красная карточка теряла foodItemId и становилась серой.
    const sameAsAnyOwnName = targetCard != null &&
      [targetCard.canonicalName, targetCard.fullName, targetCard.shortName]
        .some(n => n != null && normalize(trimmedName) === normalize(n));
    const nameChanged = selectedCardId === "add-new" ||
      (targetCard != null && !sameAsAnyOwnName);
    let identity: Pick<IngredientCard, "foodItemId" | "canonicalName" | "resolutionStatus" | "status"> | null = null;
    if (selectedFood) {
      // Явно выбран реальный FoodItem: применяем напрямую по foodItemId,
      // без текстового resolver. Красный FoodItem остаётся красным.
      const fi = foodCache.find(i => i.id === selectedFood.foodItemId);
      if (fi && isNutritionComplete(fi)) {
        identity = {
          foodItemId: fi.id,
          canonicalName: fi.nameRu,
          resolutionStatus: "resolved",
          status: fi.wfpbStatus === "forbidden" ? ("error" as const) : ("green" as const),
        };
      }
    }
    if (!identity && selectedCardId !== "add-new" && !nameChanged && targetCard && (targetCard.foodItemId || targetCard.scanRecognized)) {
      // Уже узнанная карточка (FoodItem-совпадение или rich-распознавание):
      // identity сохраняется как есть при неизменном имени,
      // повторный resolver-прогон не выполняется.
      identity = {
        foodItemId: targetCard.foodItemId,
        canonicalName: targetCard.canonicalName,
        resolutionStatus: targetCard.resolutionStatus,
        status: targetCard.status as "green" | "error",
      };
    } else {
      const r =
        resolveIngredientWithFallback(trimmedName, foodCache, strictIndex) ||
        resolveIngredientWithFallback(editedFullName.trim(), foodCache, strictIndex);
      identity = r.ok && r.nutritionComplete
        ? {
            foodItemId: r.foodItemId,
            canonicalName: r.canonicalName,
            resolutionStatus: "resolved" as const,
            status: r.wfpbStatus === "forbidden" ? ("error" as const) : ("green" as const),
          }
        : {
            foodItemId: undefined,
            canonicalName: undefined,
            resolutionStatus: "unresolved" as const,
            status: "unrecognized" as const,
          };
    }

    const isCompliant = checkIsCompliant(trimmedName) && checkIsCompliant(editedFullName);
    // Draft «Разрешить» учитывается единственный раз — здесь, при Подтвердить.
    // Разделение модели: status = объективный WFPB-статус продукта
    // (только isCompliant); manuallyAllowed = отдельный флаг допуска
    // к анализу и НИКОГДА не влияет на status/визуальный WFPB-статус.
    if (selectedCardId === "add-new") {
      // Adding a brand new card to the list
      const isUnrecognized = identity.resolutionStatus === "unresolved";
      const newCard: IngredientCard = {
        id: `custom-${Date.now()}`,
        fullName: editedFullName,
        shortName: trimmedName,
        image: isUnrecognized
          ? greylogo
          : (editedImage || (isCompliant ? ingrGreen : ingrRed)),
        weight: editedWeight,
        status: isUnrecognized ? "unrecognized" : (identity.status as "green" | "error"),
        manuallyAllowed: !isCompliant && draftManuallyAllowed ? true : undefined,
        enteredName: trimmedName,
        foodItemId: identity.foodItemId,
        canonicalName: identity.canonicalName,
        resolutionStatus: identity.resolutionStatus,
      };

      setCards(prev => [...prev, newCard]);
      showToast(`Добавлен: ${trimmedName} — ${editedWeight} г 🌱`);
    } else {
      // Modifying an existing card
      setCards(prev => prev.map(c => {
        if (c.id === selectedCardId) {
          return {
            ...c,
            fullName: editedFullName,
            shortName: trimmedName,
            image: editedImage,
            weight: editedWeight,
            status: identity!.status as "green" | "error",
            manuallyAllowed: !isCompliant && draftManuallyAllowed ? true : undefined,
            foodItemId: identity!.foodItemId,
            canonicalName: identity!.canonicalName,
            resolutionStatus: identity!.resolutionStatus,
            enteredName: c.enteredName ?? c.fullName,
          };
        }
        return c;
      }));
      showToast(`Сохранено: ${trimmedName} — ${editedWeight} г 🌱`);
    }

    // Auto-close the panel after saving successfully
    setSelectedCardId(null);
  };

  // «Подтвердить ингредиент»: единственный путь unrecognized → resolved.
  const handleConfirmIngredient = () => {
    const card = cards.find(c => c.id === selectedCardId);
    if (!card || card.status !== "unrecognized") return;

    const text = refineName.trim();
    if (!text) {
      setRefineError(true);
      return;
    }

    // A. Явно выбран реальный FoodItem (autocomplete / WFPB-таб): применяем
    // его напрямую по foodItemId, без текстового resolver. Реальный красный
    // FoodItem остаётся красным (error) и требует существующего «Разрешить».
    if (selectedFood) {
      const fi = foodCache.find(i => i.id === selectedFood.foodItemId);
      if (fi && isNutritionComplete(fi)) {
        const canonical = fi.nameRu;
        const newStatus: "green" | "error" = fi.wfpbStatus === "forbidden" ? "error" : "green";
        setCards(prev => prev.map(c =>
          c.id === card.id
            ? {
                ...c,
                fullName: canonical,
                shortName: canonical,
                // Изображение выбранной FoodItem-опции (imageSrc), fallback —
                // морфологический resolveFoodItemImage, затем цветовой плейсхолдер.
                image:
                  selectedFood.image ||
                  resolveFoodItemImage(canonical) ||
                  (newStatus === "error" ? ingrRed : ingrGreen),
                status: newStatus,
                foodItemId: fi.id,
                canonicalName: canonical,
                resolutionStatus: "resolved" as const,
                manuallyAllowed: undefined,
              }
            : c
        ));
        setRefineError(false);
        setRefineName("");
        setSuggestQuery("");
        setSelectedFood(null);
        setSelectedCardId(null);
        showToast(`Ингредиент распознан: ${canonical} 🌿`);
        return;
      }
      // Невалидный FoodItem — падаем в существующий текстовый путь ниже (B).
    }

    // B. Ручной ввод текста без явного выбора FoodItem:
    // существующая цепочка exact → alias → keyword → miss.
    const r = resolveIngredientWithFallback(text, foodCache, strictIndex);

    // Miss (включая FoodItem с пустым nutrition profile): остаёмся в
    // unrecognized, сохраняем введённый текст технически, показываем ошибку.
    if (!r.ok || !r.nutritionComplete) {
      setCards(prev => prev.map(c =>
        c.id === card.id
          ? {
              ...c,
              enteredName: text,
              status: "unrecognized" as const,
              resolutionStatus: "unresolved" as const,
              foodItemId: undefined,
              canonicalName: undefined,
            }
          : c
      ));
      setRefineError(true);
      return;
    }

    const newStatus: "green" | "error" = r.wfpbStatus === "forbidden" ? "error" : "green";
    setCards(prev => prev.map(c =>
      c.id === card.id
        ? {
            ...c,
            fullName: r.canonicalName,
            shortName: r.canonicalName,
            image: getIngredientImage(r.canonicalName) || (newStatus === "error" ? ingrRed : ingrGreen),
            status: newStatus,
            foodItemId: r.foodItemId,
            canonicalName: r.canonicalName,
            resolutionStatus: "resolved" as const,
            manuallyAllowed: undefined,
          }
        : c
    ));
    setRefineError(false);
    setRefineName("");
    setSelectedCardId(null);
    showToast(`Ингредиент распознан: ${r.canonicalName} 🌿`);
  };

  // Helper to remove any ingredient
  const handleRemoveIngredient = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCards(prev => prev.filter(c => c.id !== id));
    if (selectedCardId === id) {
      setSelectedCardId(null);
    }
    showToast("Ингредиент удалён из блюда 🍃");
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // Weight counting
  const incrementWeight = () => setEditedWeight(w => round1(w + WEIGHT_STEP));
  const decrementWeight = () => setEditedWeight(w => Math.max(WEIGHT_FLOOR, round1(w - WEIGHT_STEP)));

  // Press-and-hold repeat: одиночный шаг на pointerdown, затем repeat
  // через 350 мс и далее каждые 100 мс до pointerup/leave/cancel/blur/unmount.
  const weightHoldRef = useRef<{
    timeout: ReturnType<typeof setTimeout> | null;
    interval: ReturnType<typeof setInterval> | null;
  }>({ timeout: null, interval: null });
  const clearWeightHold = () => {
    if (weightHoldRef.current.timeout !== null) {
      clearTimeout(weightHoldRef.current.timeout);
      weightHoldRef.current.timeout = null;
    }
    if (weightHoldRef.current.interval !== null) {
      clearInterval(weightHoldRef.current.interval);
      weightHoldRef.current.interval = null;
    }
  };
  const startWeightHold = (step: number) => {
    clearWeightHold();
    setEditedWeight(w => (step > 0 ? round1(w + step) : Math.max(WEIGHT_FLOOR, round1(w + step))));
    weightHoldRef.current.timeout = setTimeout(() => {
      weightHoldRef.current.interval = setInterval(() => {
        setEditedWeight(w => (step > 0 ? round1(w + step) : Math.max(WEIGHT_FLOOR, round1(w + step))));
      }, 100);
    }, 350);
  };
  useEffect(() => {
    const handleWindowBlur = () => clearWeightHold();
    window.addEventListener("blur", handleWindowBlur);
    return () => {
      window.removeEventListener("blur", handleWindowBlur);
      clearWeightHold();
    };
  }, []);

  // Применение явно выбранного реального FoodItem: сразу фиксирует
  // selected-food state (id + canonical + статус) и заполняет видимое поле
  // имени canonical-именем. Никогда не представлен только текстом.
  const applySelectedFood = (
    opt: Pick<SelectableFoodOption, "foodItemId" | "label" | "wfpbStatus">
  ) => {
    // Изображение — через resolveFoodItemImage (getIngredientImage + морфологический
    // fallback по imageMap), чтобы записи без точного образа получали релевантную
    // миниатюру вместо generic-логотипа.
    const image =
      resolveFoodItemImage(opt.label) ||
      (opt.wfpbStatus === "forbidden" ? ingrRed : ingrGreen);
    setSelectedFood({
      foodItemId: opt.foodItemId,
      canonicalName: opt.label,
      wfpbStatus: opt.wfpbStatus,
      image,
    });
    setEditedFullName(opt.label);
    setEditedShortName(opt.label);
    setEditedImage(image);
    // Для unrecognized-карточки выбор наполняет поле уточнения:
    // статус изменит только «Подтвердить ингредиент».
    if (activeCard?.status === "unrecognized") {
      setRefineName(opt.label);
      setRefineError(false);
    }
    // Стартовый вес специи при первом выборе — 5 г вместо дефолтных 100 г.
    // Условие editedWeight === 100 не перезаписывает вручную введённую массу.
    if (isSpiceIngredient(opt.label) && editedWeight === 100) {
      setEditedWeight(5);
    }
    setSuggestQuery("");
    setIsDropdownOpen(false);
  };

  // Выбор опции из WFPB-таба (все табовые опции — реальные green FoodItem).
  const handleSelectOption = (opt: SelectableFoodOption) => {
    applySelectedFood(opt);
  };

  // Autocomplete-подсказки: все nutritionally complete FoodItem записи,
  // green и красные. Ранжирование: startsWith → contains → перестановки порядка
  // слов → короче label → алфавит. Результаты по всем вариантам запроса
  // мержатся с дедупликацией по foodItemId.
  const suggestions = React.useMemo<{ item: FoodCacheItem; isRed: boolean }[]>(() => {
    const q = normalize(suggestQuery);
    if (!q || completeFoodItems.length === 0) return [];
    // Прямой запрос + его word-order перестановки (2–4 слова).
    const queries = [q, ...generateWordPermutations(q).filter(p => p !== q)];
    type Hit = { item: FoodCacheItem; rank: number };
    const hits = new Map<string, Hit>();
    for (const item of completeFoodItems) {
      const ru = normalize(item.nameRu);
      const hay = `${ru} ${normalize(item.nameEn || "")}`;
      let rank: number | null = null;
      for (const query of queries) {
        let r: number | null = null;
        if (ru.startsWith(query) || hay.startsWith(query)) r = ru.startsWith(query) ? 0 : 1;
        else if (ru.includes(query) || hay.includes(query)) r = query === q ? 2 : 3;
        if (r !== null && (rank === null || r < rank)) rank = r;
      }
      if (rank !== null) hits.set(item.id, { item, rank });
    }
    const sorted = [...hits.values()].sort((a, b) =>
      a.rank - b.rank ||
      a.item.nameRu.length - b.item.nameRu.length ||
      a.item.nameRu.localeCompare(b.item.nameRu, "ru")
    );
    return sorted.slice(0, 20).map(h => ({
      item: h.item,
      isRed: h.item.wfpbStatus === "forbidden",
    }));
  }, [suggestQuery, completeFoodItems]);

  // Selected dish category (plate grid) for the "Из того, что есть" module
  const [selectedDishCategory, setSelectedDishCategory] = useState<string | null>(dishCategory || null);

  const handleDishCategorySelect = (category: string) => {
    setSelectedDishCategory(category);
    onDishCategoryChange?.(category);
  };

  // Main CTA: Finish checkup & analyze
  const handleRunAnalysis = () => {
    // Блокеры: unrecognized/unresolved всегда; распознанный forbidden/error —
    // до ручного «Разрешить» (manuallyAllowed === true).
    if (!canAnalyze) {
      const unresolvedCards = cards.filter(
        c => !c.scanRecognized && (!c.foodItemId || c.resolutionStatus !== "resolved")
      );
      const notAllowedRed = cards.filter(
        c => c.status === "error" && c.manuallyAllowed !== true &&
             Boolean(c.foodItemId) && c.resolutionStatus === "resolved"
      );
      if (unresolvedCards.length > 0) {
        showToast(
          `Нераспознанные ингредиенты: ${unresolvedCards
            .map(b => b.enteredName || b.shortName || b.fullName)
            .join(", ")}. Уточните названия.`
        );
        setSelectedCardId(unresolvedCards[0].id);
      } else if (notAllowedRed.length > 0) {
        showToast(
          `Подтвердите ингредиенты, не соответствующие WFPB: ${notAllowedRed
            .map(b => b.shortName || b.fullName)
            .join(", ")}.`
        );
        setSelectedCardId(notAllowedRed[0].id);
      }
      return;
    }

    showToast("Анализ состава успешно проверен! Переходим к разбору... 🌿");
    setTimeout(() => {
      const enriched = cards.map(c => {
        // Новый путь: identity передаётся по FoodItem.id; dbKey = каноническое имя.
        if (c.foodItemId && c.resolutionStatus === "resolved") {
          return {
            ...c,
            dbKey: normalize(c.canonicalName || c.shortName || ""),
            fdcId: undefined,
          };
        }
        // Legacy fallback для старых payload без foodItemId.
        const dbKey = resolveAgainstIndex(c.shortName || "", dbKeyIndex) || resolveAgainstIndex(c.fullName || "", dbKeyIndex);
        const hit = dbKey ? foodCache.find(i => normalize(i.nameRu) === dbKey) : undefined;
        return {
          ...c,
          dbKey: dbKey || undefined,
          fdcId: hit?.fdcId ?? undefined,
        };
      });
      onAnalyzeComplete(enriched, { mealSource, dishCategory: selectedDishCategory });
    }, 1200);
  };

  // Switch category tabs
  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    setIsDropdownOpen(false);
    setActiveSubcategory("Все");
    const firstOpt = greenFoodOptionsByTab[cat]?.[0];
    if (firstOpt) {
      handleSelectOption(firstOpt);
    }
  };

  // Опции активного WFPB-таба: реальные green FoodItem записи.
  const getFilteredOptions = (): SelectableFoodOption[] => {
    const list = greenFoodOptionsByTab[activeCategory] || [];
    if (activeCategory === "Свежие продукты" && activeSubcategory !== "Все") {
      return list.filter(item => item.subcategory === activeSubcategory);
    }
    return list;
  };

  // Pre-load simulator view
  if (isAnalyzing) {
    return (
      <div 
        className="w-full flex flex-col items-center justify-center min-h-[828px] bg-gradient-to-b from-[#F7FBF8] to-[#FAFBFB] p-6 text-center" 
        id="ai-recognition-loader"
      >
        <div className="relative w-28 h-28 mb-6 flex items-center justify-center">
          {/* Pulsating green rings represent radar/CV camera detection */}
          <div className="absolute inset-x-0 inset-y-0 bg-[#16B551]/10 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
          <div className="absolute inset-x-2 inset-y-2 bg-[#16B551]/15 rounded-full animate-pulse" />
          <div className="relative w-20 h-20 bg-white border-2 border-[#16B551] rounded-full flex items-center justify-center shadow-[0_12px_24px_rgba(22,181,81,0.18)]">
            <Sparkles className="w-9 h-9 text-[#16B551]" />
          </div>
        </div>
        <h3 className="text-[21px] font-black text-[#2B3137] mb-2" style={{ fontFamily: '"Calibri", sans-serif' }}>
          Компьютерное зрение Системы
        </h3>
        <p className="text-[14.5px] text-[#737C86] max-w-[280px] leading-[1.35] font-semibold" style={{ fontFamily: '"Calibri", sans-serif' }}>
          Распознаём ингредиенты по фото и проверяем их по канонам цельного WFPB рациона...
        </p>
      </div>
    );
  }

  const isControlPassed = !cards.some(c => c.status === "error");

  // Единый action guard для «Сделать анализ»:
  // - пустой состав блокирует;
  // - категория обязательна (BUILD 1);
  // - unrecognized/unresolved ингредиент блокирует всегда; ИСКЛЮЧЕНИЕ —
  //   scan-карточка: она уже узнана распознаванием и пригодна к анализу
  //   как в прежнем рабочем photo-flow (identity по возможности обогащается
  //   read-only совпадением с FoodItem, но не требуется);
  // - forbidden/error требует ручного «Разрешить» (manuallyAllowed === true).
  const canAnalyze = cards.every(
    card =>
      card.scanRecognized
        ? card.status !== "error" || card.manuallyAllowed === true
        : Boolean(card.foodItemId) &&
          card.resolutionStatus === "resolved" &&
          (card.status !== "error" || card.manuallyAllowed === true)
  );
  const mainActionDisabled =
    cards.length === 0 ||
    !dishCategory ||
    !canAnalyze;

  return (
    <div className="w-full flex flex-col justify-between min-h-[828px] bg-[#FAFBFB] relative" id="check-composition-screen">
      
      {/* Scrollable Container with healthy wellness negative spaces */}
      <div className="flex-1 flex flex-col px-5 pt-2 pb-6">
        
        {/* UPPER TITLE BAR */}
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={onBack}
            className="w-11 h-11 bg-white hover:bg-[#FAFAFA] border border-[#EFF2F3] shadow-[0_4px_10px_rgba(43,49,55,0.03)] rounded-[16px] flex items-center justify-center transition-all duration-200 cursor-pointer active:scale-95 select-none"
          >
            <ChevronLeft className="w-5 h-5 text-[#2B3137] stroke-[2.5]" />
          </button>

          <h1 
            className="text-[22px] sm:text-[23px] font-extrabold text-[#2B3137] text-center"
            style={{ fontFamily: '"Calibri", sans-serif' }}
          >
            Проверьте состав
          </h1>

          <CalendarButton 
            dayNotes={dayNotes}
            currentDayIndex={currentDayIndex}
            screen={screen}
            onClick={onOpenCalendar}
            className="w-11 h-11 rounded-[16px] opacity-0 pointer-events-none select-none"
          />
        </div>

        {/* ANALYZING FEEDBACK BADGE */}
        {isNonFoodMode ? (
          <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-[18px] p-3 mb-5 flex items-center gap-2.5 shadow-sm text-left animate-[fadeIn_0.3s_ease]">
            <div className="w-7 h-7 rounded-full bg-[#1e40af] flex items-center justify-center text-white shrink-0">
              <AlertTriangle className="w-4 h-4 stroke-[2]" />
            </div>
            <p 
              className="text-[13px] text-[#1e40af] font-bold leading-normal"
              style={{ fontFamily: '"Calibri", sans-serif' }}
            >
              Внимание: на снимке распознаны посторонние несъедобные объекты! ⚠️
            </p>
          </div>
        ) : (
          <div className="bg-[#ECFDF5] border border-[#D1F7E2] rounded-[18px] p-3 mb-5 flex items-center gap-2.5 shadow-sm text-left">
            <img
              src={logoSprout}
              alt="Логотип приложения"
              className="w-8 h-8 shrink-0 object-contain"
            />
            <p
              className="text-[13px] text-[#15803D] font-bold leading-normal"
              style={{ fontFamily: '"Calibri", sans-serif' }}
            >
              {mealSource === "from-what-is" ? (
                <>
                  Соберите блюдо из выбранных ингредиентов.
                  <br />
                  Проверьте название и вес каждого продукта перед расчётом.
                </>
              ) : (
                <>Система распознала рецепт по фото и сопоставила ингредиенты с базой правил WFPB рациона</>
              )}
            </p>
          </div>
        )}

        {/* SECTION HEADER: РАСПОЗНАНО */}
        <div className="flex items-center justify-between mb-3 text-left">
          <h2 
            className="text-[18px] font-black text-[#2B3137]"
            style={{ fontFamily: '"Calibri", sans-serif' }}
          >
            {isNonFoodMode ? "Распознанные предметы" : "Распознанные ингредиенты"}
          </h2>
          {isNonFoodMode ? (
            <span 
              className="text-[11.5px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider block border bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE]"
              style={{ fontFamily: '"Calibri", sans-serif' }}
            >
              Несъедобно
            </span>
          ) : (
            <motion.span 
              className={`text-[11.5px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider block border transition-colors duration-300 ${
                isControlPassed 
                  ? "bg-[#E8F8EE] text-[#16B551] border-[#D1F7E2]" 
                  : "bg-[#FFF5F5] text-red-600 border-[#FCA5A5]"
              }`}
              style={{ fontFamily: '"Calibri", sans-serif' }}
              animate={isPulsing ? {
                scale: [1, 1.05, 1],
                opacity: [0.9, 1, 0.9]
              } : { scale: 1, opacity: 1 }}
              transition={isPulsing ? {
                duration: 1.0,
                repeat: Infinity,
                ease: "easeInOut"
              } : undefined}
            >
              WFPB-контроль
            </motion.span>
          )}
        </div>

        {/* COMPOSITION CARD GRID INCLUDING "+" BUTTON CARD */}
        <div className="grid grid-cols-3 gap-y-6 gap-x-4 mb-5">
          {cards.map((c) => {
            // WFPB-статус — только классификация (status). manuallyAllowed
            // является допуском к анализу и не участвует в визуальных флагах.
            const isRed = c.status === "error";
            const isBlue = c.status === "blue";
            // Unrecognized: серый логотип + голубое свечение/бейдж.
            // Логически отлично от blue (non-food) и от error.
            const isUnrecognized = c.status === "unrecognized";
            const hasGreenCheck = !isRed && !isBlue && !isUnrecognized && !!c.weight;

            const ingredientImageUrl = getIngredientImage(c.shortName || c.fullName);

            return (
              <div
                key={c.id}
                onClick={() => setSelectedCardId(c.id)}
                className="flex flex-col items-center justify-start gap-1 p-2 cursor-pointer transition-all duration-300 relative"
              >
                {/* Status badge at top right */}
                {isUnrecognized ? (
                  <div className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center z-10">
                    <X className="w-3 h-3 text-white stroke-[3]" />
                  </div>
                ) : isRed ? (
                  <div className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center z-10">
                    <X className="w-3 h-3 text-white stroke-[3]" />
                  </div>
                ) : isBlue ? (
                  <div className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center z-10">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                ) : hasGreenCheck ? (
                  <div className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-brand-green-pure rounded-full flex items-center justify-center z-10">
                    <Check className="w-3 h-3 text-white stroke-[3]" />
                  </div>
                ) : null}

                {/* Image with status drop-shadow */}
                <div className={`w-16 h-16 flex items-center justify-center shrink-0 ${
                  isUnrecognized
                    ? 'drop-shadow-[0_4px_8px_rgba(59,130,246,0.35)]'
                    : isRed
                    ? 'drop-shadow-[0_4px_8px_rgba(239,68,68,0.35)]'
                    : isBlue
                    ? 'drop-shadow-[0_4px_8px_rgba(59,130,246,0.3)]'
                    : hasGreenCheck
                    ? 'drop-shadow-[0_4px_8px_rgba(22,181,81,0.3)]'
                    : ''
                }`}>
                  {isUnrecognized ? (
                    <img
                      src={greylogo}
                      alt="Ингредиент не распознан"
                      className="w-full h-full object-contain opacity-80"
                    />
                  ) : ingredientImageUrl ? (
                    <img
                      src={ingredientImageUrl}
                      alt={c.shortName}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (!target.dataset.fallback) {
                          target.dataset.fallback = "1";
                          target.src = isRed ? ingrRed : ingrGreen;
                        }
                      }}
                    />
                  ) : (
                    <img
                      src={isRed ? ingrRed : ingrGreen}
                      alt={c.shortName}
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>

                {/* Text Block */}
                <div className="flex flex-col items-center justify-center w-full">
                  <span className={`text-xs md:text-sm font-medium text-center leading-tight ${
                    isRed ? "text-red-600" : isUnrecognized ? "text-blue-600" : "text-gray-800"
                  }`}>
                    {isUnrecognized ? "Ингредиент не распознан" : c.shortName}
                  </span>
                  
                  {/* Weight display */}
                  {c.weight ? (
                    <span className="text-[11px] font-extrabold mt-0.5 text-gray-500">
                      {c.weight} г
                    </span>
                  ) : (
                    <span className={`text-[9.5px] mt-0.5 font-semibold ${
                      isRed ? "text-red-500 animate-pulse" : "text-gray-400"
                    }`}>
                      {isRed ? "заменить ⚠️" : "введите вес"}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* ADD INGREDIENT EMPTY "+" CARD */}
          {!isNonFoodMode && (
            <div
              onClick={() => setSelectedCardId("add-new")}
              className={`flex flex-col items-center justify-center gap-1 p-2 cursor-pointer min-h-[100px] rounded-[22px] border-2 border-dashed transition-all duration-300 hover:scale-[1.02] ${
                selectedCardId === "add-new"
                  ? "bg-[#ECFDF5] border-[#16B551] text-[#16B551]"
                  : "border-[#C2D8C9] text-[#16B551] hover:border-[#16B551]"
              }`}
            >
              <Plus className="w-7 h-7 stroke-[2.5]" />
              <span className="text-[13px] font-black">Добавить</span>
            </div>
          )}
        </div>

        {/* DISH CATEGORY SELECTOR: 3x3 PASTEL PLATES (единый ручной выбор категории для обоих источников состава) */}
        {!isNonFoodMode && (
          <div className="mb-5" id="dish-category-selector">
            <div className="flex items-center justify-between mb-1 text-left">
              <h2
                className="text-[18px] font-black text-[#2B3137]"
                style={{ fontFamily: '"Calibri", sans-serif' }}
              >
                Категория блюда
              </h2>
              {selectedDishCategory && (
                <span
                  className="text-[10.5px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider block border bg-[#E8F8EE] text-[#16B551] border-[#D1F7E2]"
                  style={{ fontFamily: '"Calibri", sans-serif' }}
                >
                  {selectedDishCategory}
                </span>
              )}
            </div>
            <p
              className="text-[12px] text-[#737C86] font-medium leading-snug mb-2.5 text-left"
              style={{ fontFamily: '"Calibri", sans-serif' }}
            >
              Выберите, к какому типу относится ваше блюдо, чтобы продолжить анализ
            </p>

            <div className="grid grid-cols-3 gap-2">
              {DISH_CATEGORIES.map((cat) => {
                const isSelected = selectedDishCategory === cat.key;
                return (
                  <div
                    key={cat.key}
                    onClick={() => handleDishCategorySelect(cat.key)}
                    className={`relative flex items-center gap-1 rounded-[14px] px-1 py-1 overflow-hidden cursor-pointer select-none border-none transition-[transform,box-shadow] duration-[120ms] ease-out shadow-[0_3px_0_rgba(0,0,0,0.12)] active:translate-y-[2px] active:shadow-[0_1px_0_rgba(0,0,0,0.12)] ${
                      isSelected
                        ? "outline-2 outline-offset-0 outline-[rgba(22,181,81,0.34)]"
                        : "ring-0"
                    } ${selectedDishCategory && !isSelected ? "opacity-60" : "opacity-100"}`}
                    style={{ backgroundColor: cat.color }}
                  >
                    {isSelected && (
                      <div className="absolute right-1 top-1/2 -translate-y-1/2 w-[18px] h-[18px] bg-brand-green-pure rounded-full flex items-center justify-center z-10 shadow-sm">
                        <Check className="w-[10px] h-[10px] text-white stroke-[3]" />
                      </div>
                    )}

                    <div className="w-8 h-8 shrink-0 flex items-center justify-center">
                      <img
                        src={cat.image}
                        alt={cat.key}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain"
                      />
                    </div>

                    <span
                      className="flex-1 min-w-0 whitespace-nowrap overflow-hidden text-[9.5px] font-extrabold tracking-tight text-[#2B3137] leading-none"
                      style={{ fontFamily: '"Calibri", sans-serif' }}
                    >
                      {cat.key}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SLIDING GLASS EDIT ACCORDION: ONLY VISIBLE WHEN A CARD IS ACTIVE */}
        <AnimatePresence>
          {selectedCardId && activeCard && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: 15 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: 15 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden mb-5 shrink-0"
            >
              <div
                className={`rounded-[26px] border-none p-4.5 flex flex-col gap-4 text-left relative ${
                  activeCard.status === "error" || (selectedCardId !== "add-new" && cards.find(x => x.id === selectedCardId)?.status === "error")
                    ? "bg-[#FFF8F8] shadow-[0_8px_24px_rgba(239,68,68,0.04)]"
                    : "bg-white shadow-[0_8px_24px_rgba(43,49,55,0.04)]"
                }`}
              >
                {/* Curved specular highlight highlight overlay */}
                <div className="absolute top-[1px] left-5 right-5 h-[15%] rounded-full bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />

                {/* Edit Header */}
                <div className="flex items-center justify-between pb-1 border-b border-[#EFF2F3]">
                  <div className="flex flex-col text-left">
                    <span 
                      className="text-[11px] text-[#A1B0B8] font-black uppercase tracking-wider block"
                      style={{ fontFamily: '"Calibri", sans-serif' }}
                    >
                      {selectedCardId === "add-new" ? "Добавление" : "Редактирование"}
                    </span>
                    <span 
                      className="text-[16.5px] font-extrabold text-[#2B3137] tracking-tight"
                      style={{ fontFamily: '"Calibri", sans-serif' }}
                    >
                      {selectedCardId === "add-new" ? "Добавить ингредиент" : "Заменить ингредиент"}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedCardId(null)}
                    className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors text-gray-500 cursor-pointer"
                  >
                    <X className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>

                {/* Dynamic alert warning if non-compliant ingredient is bound.
                    Для unrecognized не показываем WFPB-warning — статус ещё неизвестен. */}
                {activeCard?.status !== "unrecognized" && (!checkIsCompliant(editedShortName) || !checkIsCompliant(editedFullName)) && (
                  <div className="bg-red-50 border border-red-200 rounded-[14px] p-2.5 flex items-start gap-2 text-[12.5px] text-red-800 leading-tight">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-extrabold text-red-900 block mb-0.5">Содержит запрещенные продукты!</strong>
                      Правила WFPB полностью исключают продукты животного происхождения, соль и любые масла. Карточка останется красной до замены на разрешенный ингредиент.
                    </div>
                  </div>
                )}

                {/* INPUT FIELD FOR EDITING NAME DIRECTLY.
                    Для unrecognized — единственное поле «Уточните название ингредиента»
                    с кнопкой «Подтвердить ингредиент» (strict resolver по полной базе). */}
                {activeCard?.status === "unrecognized" ? (
                  <div className="flex flex-col gap-1.5 text-left">
                    <label
                      className="text-[12px] text-[#737C86] font-bold"
                      style={{ fontFamily: '"Calibri", sans-serif' }}
                    >
                      Уточните название ингредиента
                    </label>
                    <input
                      type="text"
                      value={refineName}
                      placeholder="Например: Баранина"
                      onChange={(e) => {
                        setRefineName(e.target.value);
                        // Ручной ввод текста отменяет явный выбор FoodItem:
                        // применяется resolver по актуальному тексту.
                        setSelectedFood(null);
                        setSuggestQuery(e.target.value);
                        if (refineError) setRefineError(false);
                      }}
                      className={`w-full bg-white rounded-[16px] px-4 py-2.5 text-[14.5px] font-bold text-[#2B3137] focus:outline-none border transition-colors duration-200 ${
                        refineError
                          ? "border-[#3B82F6] shadow-[0_0_0_3px_rgba(59,130,246,0.15)]"
                          : "border-[#EFF2F3] focus:border-[#3B82F6] shadow-[inset_0_1px_2px_rgba(0,0,0,0.015)]"
                      }`}
                    />
                    {/* AUTOCOMPLETE: реальные FoodItem записи, green и красные */}
                    <FoodAutocompleteList
                      loading={foodCacheLoading}
                      loaded={foodCache.length > 0}
                      suggestions={suggestions}
                      query={suggestQuery}
                      onSelect={(opt) => applySelectedFood({
                        foodItemId: opt.foodItemId,
                        label: opt.label,
                        wfpbStatus: opt.wfpbStatus,
                      })}
                    />
                    {refineError && (
                      <p className="text-[12.5px] text-[#2563EB] font-semibold leading-snug">
                        Ингредиент не найден в базе. Проверьте название и попробуйте снова.
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={handleConfirmIngredient}
                      className="w-full h-12 mt-1 rounded-[14px] text-[14px] font-bold border-none bg-[#EEF2F5] text-[#4B5560] shadow-[0_3px_0_#B8C0C7] transition-[transform,box-shadow] duration-150 active:translate-y-[2px] active:shadow-[0_1px_0_#B8C0C7] cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-4 h-4 stroke-[2.5]" />
                      <span>Подтвердить ингредиент</span>
                    </button>
                  </div>
                ) : (
                <div className="flex flex-col gap-1 text-left">
                  <label 
                    className="text-[12px] text-[#737C86] font-bold"
                    style={{ fontFamily: '"Calibri", sans-serif' }}
                  >
                    Название ингредиента
                  </label>
                  <input
                    type="text"
                    value={editedShortName}
                    placeholder="Например: Петрушка"
                    onChange={(e) => {
                      setEditedShortName(e.target.value);
                      setEditedFullName(e.target.value);
                      // Ручной ввод текста отменяет явный выбор FoodItem.
                      setSelectedFood(null);
                      setSuggestQuery(e.target.value);
                    }}
                    className="w-full bg-white border border-[#EFF2F3] rounded-[16px] px-4 py-2.5 text-[14.5px] font-bold text-[#2B3137] focus:outline-none focus:border-[#16B551] shadow-[inset_0_1px_2px_rgba(0,0,0,0.015)]"
                  />
                  {/* AUTOCOMPLETE: реальные FoodItem записи, green и красные */}
                  <FoodAutocompleteList
                    loading={foodCacheLoading}
                    loaded={foodCache.length > 0}
                    suggestions={suggestions}
                    query={suggestQuery}
                    onSelect={(opt) => applySelectedFood({
                      foodItemId: opt.foodItemId,
                      label: opt.label,
                      wfpbStatus: opt.wfpbStatus,
                    })}
                  />
                </div>
                )}

                {/* SELECT FROM CATEGORY DIRECTORY */}
                <div className="flex flex-col gap-1.5 relative text-left">
                  <label 
                    className="text-[12px] text-[#737C86] font-bold"
                    style={{ fontFamily: '"Calibri", sans-serif' }}
                  >
                    Выбрать из справочника WFPB
                  </label>

                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full bg-white hover:bg-[#FAFAFA] border border-[#EFF2F3] rounded-[16px] px-4 py-3 flex items-center justify-between text-left text-[14.5px] font-black text-[#2B3137] shadow-sm cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden pr-2">
                      <div className="w-5 h-5 shrink-0 flex items-center justify-center">
                        <img 
                          src={getIngredientImage(editedShortName || editedFullName) || ingrGreen} 
                          alt="selected" 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain" 
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (!target.dataset.fallback) {
                              target.dataset.fallback = "1";
                              target.src = ingrGreen;
                            }
                          }}
                        />
                      </div>
                      <span className="truncate">{editedFullName || "Выберите ингредиент из списка"}</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-[#737C86] shrink-0 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`} />
                  </button>

                  {/* DROP DOWN OVERLAY OF DICTIONARY SELECTION */}
                  {isDropdownOpen && (
                    <div className="absolute top-[100%] left-0 right-0 mt-1 bg-white border border-[#EFF2F3] shadow-[0_12px_28px_rgba(43,49,55,0.12)] rounded-[20px] p-2.5 z-50 max-h-[240px] overflow-y-auto flex flex-col gap-1">
                      
                      {/* Interactive Section indicator if category has multiple subcategories like "Свежие продукты" */}
                      {activeCategory === "Свежие продукты" && (
                        <div className="flex flex-wrap gap-1 border-b border-gray-100 pb-2 mb-1.5">
                          {["Все", "Овощи", "Фрукты и ягоды", "Зелень и прочее"].map((subKey) => (
                            <button
                              key={subKey}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveSubcategory(subKey as any);
                              }}
                              className={`px-2 py-1 rounded-full text-[11px] font-black uppercase transition-colors ${
                                activeSubcategory === subKey
                                  ? "bg-[#16B551] text-white"
                                  : "bg-gray-100 hover:bg-gray-200 text-[#737C86]"
                              }`}
                            >
                              {subKey}
                            </button>
                          ))}
                        </div>
                      )}

                      {getFilteredOptions().map((opt) => (
                        <button
                          key={opt.foodItemId}
                          type="button"
                          onClick={() => handleSelectOption(opt)}
                          className="w-full hover:bg-[#F3F9F4] rounded-[12px] p-2 flex items-center gap-2.5 text-left transition-colors duration-150 cursor-pointer text-[#2B3137] text-[13.5px] font-semibold"
                        >
                          <div className="w-6 h-6 shrink-0 flex items-center justify-center">
                            <img
                              src={opt.imageSrc}
                              alt={opt.label}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                if (!target.dataset.fallback) {
                                  target.dataset.fallback = "1";
                                  target.src = ingrGreen;
                                }
                              }}
                            />
                          </div>
                          <div className="truncate flex flex-col">
                            <span className="font-extrabold text-[13.5px] leading-tight text-[#2B3137]">{opt.label}</span>
                            {opt.subcategory && (
                              <span className="text-[9.5px] text-[#A1B0B8] font-bold leading-none mt-0.5">{opt.subcategory}</span>
                            )}
                          </div>
                        </button>
                      ))}
                      {(foodCacheLoading ? (
                        <span className="text-[12px] text-[#A1B0B8] py-4 text-center block font-semibold">Справочник загружается…</span>
                      ) : getFilteredOptions().length === 0 && (
                        <span className="text-[12px] text-[#A1B0B8] py-4 text-center block font-semibold">Список пуст</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* INTERACTIVE COMPREHENSIVE CATEGORY CHIPS */}
                <div className="flex flex-col gap-1 text-left select-none">
                  <label className="text-[12px] text-[#737C86] font-bold" style={{ fontFamily: '"Calibri", sans-serif' }}>
                    Категория справочника
                  </label>
                  <div
                    ref={categoryTabsScrollRef}
                    className="w-full min-w-0 overflow-x-auto overflow-y-hidden scrollbar-none flex flex-nowrap gap-1.5 py-0.5 select-none [touch-action:pan-x]"
                  >
                    {WFPB_TAB_CATEGORIES.map((categoryName) => {
                      const isActive = activeCategory === categoryName;
                      const tabStyle = CATEGORY_TAB_ACTIVE_STYLES[categoryName];
                      return (
                        <button
                          key={categoryName}
                          type="button"
                          onClick={() => handleCategoryChange(categoryName)}
                          className="shrink-0 flex-none px-3 py-1.5 rounded-full text-[12.5px] font-extrabold tracking-tight whitespace-nowrap border-none transition-[transform,box-shadow] duration-150 cursor-pointer active:translate-y-[1px]"
                          style={{
                            backgroundColor: isActive ? tabStyle.bg : CATEGORY_TAB_INACTIVE.bg,
                            color: "#4B5560",
                            boxShadow: "0 2px 0 #B8C0C7",
                            fontFamily: '"Calibri", sans-serif',
                          }}
                        >
                          {categoryName}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* PHYSICAL WEIGHT stepper Counter */}
                <div className="flex flex-col gap-1.5 text-left">
                  <label 
                    className="text-[12px] text-[#737C86] font-bold"
                    style={{ fontFamily: '"Calibri", sans-serif' }}
                  >
                    Вес введённого ингредиента (г)
                  </label>

                  <div className="grid grid-cols-[56px_minmax(0,1fr)_56px] gap-3 items-center">
                    <button
                      type="button"
                      onPointerDown={() => startWeightHold(-WEIGHT_STEP)}
                      onPointerUp={clearWeightHold}
                      onPointerLeave={clearWeightHold}
                      onPointerCancel={clearWeightHold}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          decrementWeight();
                        }
                      }}
                      className="w-14 h-14 rounded-2xl text-[28px] font-medium bg-[#F7F9FA] text-[#16B551] border-none shadow-[0_3px_0_#B8C0C7] active:translate-y-[2px] active:shadow-[0_1px_0_#B8C0C7] transition-[transform,box-shadow] duration-150 cursor-pointer select-none leading-none touch-none"
                      aria-label="Уменьшить вес"
                    >
                      −
                    </button>

                    <input
                      type="number"
                      min={spiceMode ? 0.5 : 1}
                      step={spiceMode ? 0.5 : 1}
                      value={editedWeight}
                      onChange={(e) => {
                        if (spiceMode) {
                          // Decimal-safe: запятая → точка, дроби от 0.5 г.
                          const v = parseFloat(e.target.value.replace(",", "."));
                          setEditedWeight(Number.isFinite(v) && v >= 0.5 ? round1(v) : 0.5);
                        } else {
                          setEditedWeight(Math.max(1, parseInt(e.target.value, 10) || 0));
                        }
                      }}
                      className="w-full min-w-0 h-14 border-none rounded-2xl px-2 text-center text-[23px] font-bold text-[#3E4852] bg-[#F7F9FA] shadow-[inset_0_0_0_1px_#E3E8EB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#16B551]"
                    />

                    <button
                      type="button"
                      onPointerDown={() => startWeightHold(WEIGHT_STEP)}
                      onPointerUp={clearWeightHold}
                      onPointerLeave={clearWeightHold}
                      onPointerCancel={clearWeightHold}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          incrementWeight();
                        }
                      }}
                      className="w-14 h-14 rounded-2xl text-[28px] font-medium bg-[#F7F9FA] text-[#16B551] border-none shadow-[0_3px_0_#B8C0C7] active:translate-y-[2px] active:shadow-[0_1px_0_#B8C0C7] transition-[transform,box-shadow] duration-150 cursor-pointer select-none leading-none touch-none"
                      aria-label="Увеличить вес"
                    >
                      +
                    </button>
                  </div>

                  {spiceMode && (
                    <p className="text-[11px] text-[#737C86] font-semibold" style={{ fontFamily: '"Calibri", sans-serif' }}>
                      Для специй: 1 щепотка ≈ 0.5 г
                    </p>
                  )}
                </div>

                {/* ADDITIONAL ACTIONS FOR WFPB COMPLIANCE ACTIONS.
                    Для unrecognized «Разрешить» не показывается: статус ещё не определён. */}
                {selectedCardId !== "add-new" && cards.find(x => x.id === selectedCardId)?.status !== "unrecognized" && (cards.find(x => x.id === selectedCardId)?.status === "error" || draftManuallyAllowed || cards.find(x => x.id === selectedCardId)?.manuallyAllowed) && (
                  <div className="mt-1 mb-1">
                    {/* Draft-only: не коммитит карточку и не закрывает панель.
                        Применение — только по «Подтвердить». */}
                    <button
                      type="button"
                      onClick={() => setDraftManuallyAllowed(true)}
                      disabled={draftManuallyAllowed}
                      className={`w-full h-12 rounded-[14px] text-[14px] font-bold border-none cursor-pointer flex items-center justify-center gap-1.5 transition-[transform,box-shadow] duration-150 ${
                        draftManuallyAllowed
                          ? "bg-[#BFE8CD] text-[#4B5560] shadow-[0_3px_0_#B8C0C7] cursor-default"
                          : "bg-[#EEF2F5] text-[#4B5560] shadow-[0_3px_0_#B8C0C7] active:translate-y-[2px] active:shadow-[0_1px_0_#B8C0C7]"
                      }`}
                    >
                      {draftManuallyAllowed && <Check className="w-4 h-4 stroke-[2.5]" />}
                      <span>{draftManuallyAllowed ? "Разрешено" : "Разрешить"}</span>
                    </button>
                  </div>
                )}

                {/* CONFIRM / SAVE ACTIONS — edit-mode: Удалить / Отмена / Подтвердить; add-new: без Delete */}
                <div className="flex gap-2.5 mt-1.5">
                  {selectedCardId !== "add-new" && (
                    <button
                      type="button"
                      onClick={() => {
                        const targetId = selectedCardId;
                        setCards(prev => prev.filter(c => c.id !== targetId));
                        setSelectedCardId(null);
                        showToast("Ингредиент удалён из состава 🍃");
                      }}
                      className="flex-1 h-12 rounded-[14px] text-[14px] font-bold border-none bg-[#FCE7EA] text-[#4B5560] shadow-[0_3px_0_#B8C0C7] transition-[transform,box-shadow] duration-150 active:translate-y-[2px] active:shadow-[0_1px_0_#B8C0C7] cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Trash2 className="w-4 h-4 shrink-0" />
                      <span>Удалить</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedCardId(null)}
                    className="flex-1 h-12 rounded-[14px] text-[14px] font-bold border-none bg-[#EEF2F5] text-[#4B5560] shadow-[0_3px_0_#B8C0C7] transition-[transform,box-shadow] duration-150 active:translate-y-[2px] active:shadow-[0_1px_0_#B8C0C7] cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveIngredient}
                    className="flex-1 h-12 rounded-[14px] text-[14px] font-bold border-none bg-[#DDF4E4] text-[#4B5560] shadow-[0_3px_0_#B8C0C7] transition-[transform,box-shadow] duration-150 active:translate-y-[2px] active:shadow-[0_1px_0_#B8C0C7] cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>Подтвердить</span>
                  </button>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* INSTRUCTIONAL TIP IF NO PANEL ACTIVE */}
        {!selectedCardId && !isNonFoodMode && (
          <div className="bg-[#FAFBFB] p-4 text-center rounded-[20px] border border-dashed border-[#D1E7DD] mb-5">
            <p className="text-[13px] text-[#737C86] leading-snug font-medium" style={{ fontFamily: '"Calibri", sans-serif' }}>
              💡 Нажмите на любую карточку выше, чтобы подтвердить, отредактировать её название, вес или заменить ингредиент 🌱
            </p>
          </div>
        )}

        {/* ANNA'S BLUE HUMOROUS/SARCASTIC BLOCK FOR NON-FOOD SCENARIO */}
        {isNonFoodMode && !selectedCardId && (
          <div 
            className="bg-[#EFF6FF] rounded-[24px] p-4.5 flex gap-4 pr-6 mb-5 text-left shadow-[0_4px_16px_rgba(59,130,246,0.03)] relative overflow-hidden animate-[fadeIn_0.3s_ease]" 
            id="anna-nonfood-sarcastic-block"
          >
            {/* Soft glowing ambient blue light */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-b from-[#3B82F6]/5 to-transparent rounded-full blur-xl pointer-events-none" />
            
            {/* Avatar area of Anna with a pulsing blue badge */}
            <div className="relative shrink-0 select-none">
              <div className="w-[48px] h-[48px] rounded-full overflow-hidden shadow-md border border-blue-200 relative">
                <img 
                  src={annaAvatarSrc}
                  alt="Анна — Советник WFPB" 
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-[14px] h-[14px] bg-[#2563EB] rounded-full border border-white shadow-sm flex items-center justify-center">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
              </span>
            </div>

            {/* Sarcastic witty response */}
            <div className="flex flex-col gap-1 w-full relative z-10">
              <div className="flex flex-col">
                <span 
                  className="text-[14.5px] text-[#2563EB] font-extrabold leading-none"
                  style={{ fontFamily: '"Calibri", sans-serif' }}
                >
                  Анна
                </span>
                <span 
                  className="text-[11px] text-text-muted font-bold mt-0.5 leading-none"
                  style={{ fontFamily: '"Calibri", sans-serif' }}
                >
                  Советник WFPB
                </span>
              </div>
              <p 
                className="text-[13.5px] text-[#1E3A8A] font-medium leading-[1.4]"
                style={{ fontFamily: '"Calibri", sans-serif' }}
              >
                {getAnnaSarcasticReply()}
              </p>
            </div>
          </div>
        )}

        {/* BOTTOM REAL ACTION BUTTON */}
        <div className="mt-auto pt-2">
          {isNonFoodMode ? (
            <button
              type="button"
              onClick={onBack}
              className="w-full bg-gradient-to-b from-[#3B82F6] via-[#2563EB] to-[#1D4ED8] hover:brightness-[1.03] rounded-[22px] py-4 px-6 font-bold text-white shadow-[0_8px_20px_rgba(37,99,235,0.2),_inset_0_2.5px_4px_rgba(255,255,255,0.35)] flex items-center justify-center gap-2 relative overflow-hidden transition-all duration-300 hover:scale-[1.02] active:scale-[0.97] text-[17px] cursor-pointer select-none mb-2"
            >
              <div className="absolute top-[1.8px] left-5 right-5 h-[28%] rounded-full bg-gradient-to-b from-white/35 to-transparent pointer-events-none" />
              <span style={{ fontFamily: '"Calibri", sans-serif' }}>Понятно</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleRunAnalysis}
              disabled={mainActionDisabled}
              className={`border-none mx-auto h-[54px] px-4 font-bold flex items-center justify-center text-center transition-all duration-200 text-[15px] select-none mb-2 ${
                mainActionDisabled
                  ? "bg-[#D8DDE2] text-white/80 shadow-none cursor-not-allowed"
                  : "bg-[#BFE8CD] text-[#4B5560] shadow-[0_4px_0_#B8C0C7] active:translate-y-[3px] active:shadow-[0_1px_0_#B8C0C7] cursor-pointer"
              }`}
              style={{
                width: "min(320px, calc(100% - 48px))",
                borderRadius: 16,
                fontFamily: '"Calibri", sans-serif',
              }}
            >
              <span style={{ fontFamily: '"Calibri", sans-serif' }}>Сделать анализ</span>
            </button>
          )}
        </div>

      </div>

      {/* DYNAMIC NOTIFICATIONS / TOAST SYSTEM */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="absolute bottom-[90px] left-5 right-5 bg-black/85 backdrop-blur-md px-4 py-3 rounded-[16px] text-white text-[13.5px] font-semibold text-center border border-white/10 shadow-[0_8px_24px_rgba(0,0,0,0.25)] z-[100] flex items-center justify-center gap-2"
          >
            <span style={{ fontFamily: '"Calibri", sans-serif' }} className="leading-tight">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FIXED BOTTOM NAVIGATION BAR */}
      <div className="w-full shrink-0">
        <BottomBar onHomeClick={onBack} activeTab="add-food" />
      </div>

    </div>
  );
}
