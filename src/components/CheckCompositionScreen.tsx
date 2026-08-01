import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ChevronLeft, 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  Minus, 
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
import { getIngredientImage } from "../utils/ingredientMapper";
import ingrGreen from "../assets/ingredients/ingr_green.webp";
import ingrRed from "../assets/ingredients/ingr_red.webp";
import { checkWFPB } from "../utils/wfpbRules";
import { matchDBStatus } from "../utils/wfpbMatch";
import { useAppStore } from "../store/useAppStore";
import { clientLogger } from "../utils/clientLogger";

const annaAvatarSrc = resolveAvatar({ toneGroup: 'reminder_caution', intent: 'caution' }).src;

interface CheckCompositionScreenProps {
  onBack?: () => void;
  initialIngredients?: any[];
  onAnalyzeComplete: (cards: any[]) => void;
  dayNotes?: Record<number, { text: string; time: string }[]>;
  currentDayIndex: number;
  screen?: string;
  onOpenCalendar?: () => void;
}

// Full ingredient details with short name mappings for cards
interface IngredientOption {
  fullName: string;
  shortName: string;
  image: string;
  subcategory?: string;
}

interface IngredientCard {
  id: string;
  fullName: string;
  shortName: string;
  image: string;
  weight?: number; // undefined means not yet confirmed with a specified weight
  status: "green" | "error" | "blue"; // strictly green or red, blue is for non-food warning!
  manuallyAllowed?: boolean;
}



// Full WFPB non-salt database categories exactly matching user's content
const INGREDIENTS_DATABASE: Record<string, IngredientOption[]> = {
  "Бобовые": [
    { fullName: "Чечевица коричневая", shortName: "Чечевица коричневая", image: "" },
    { fullName: "Чечевица красная", shortName: "Чечевица красная", image: "" },
    { fullName: "Нут", shortName: "Нут", image: "" },
    { fullName: "Фасоль красная", shortName: "Фасоль красная", image: "" },
    { fullName: "Фасоль белая", shortName: "Фасоль белая", image: "" },
    { fullName: "Горох зелёный", shortName: "Горох зелёный", image: "" },
    { fullName: "Маш", shortName: "Маш", image: "" },
    { fullName: "Соевые бобы", shortName: "Соевые бобы", image: "" },
    { fullName: "Темпе", shortName: "Темпе", image: "" },
    { fullName: "Тофу натуральный", shortName: "Тофу", image: "" },
    { fullName: "Фасоль адзуки", shortName: "Фасоль адзуки", image: "" },
    { fullName: "Фасоль лима", shortName: "Фасоль лима", image: "" },
    { fullName: "Фасоль пестрая", shortName: "Фасоль пестрая", image: "" },
    { fullName: "Фасоль черная", shortName: "Фасоль черная", image: "" },
    { fullName: "Чечевица зеленая", shortName: "Чечевица зеленая", image: "" },
    { fullName: "Горошек", shortName: "Горошек", image: "" },
    { fullName: "Фасоль", shortName: "Фасоль", image: "" }
  ],
  "Злаки и псевдозлаки": [
    { fullName: "Овсяные хлопья", shortName: "Овсяные хлопья", image: "" },
    { fullName: "Зелёная гречка", shortName: "Зелёная гречка", image: "" },
    { fullName: "Киноа", shortName: "Киноа", image: "" },
    { fullName: "Пшено", shortName: "Пшено", image: "" },
    { fullName: "Амарант", shortName: "Амарант", image: "" },
    { fullName: "Рис бурый", shortName: "Рис бурый", image: "" },
    { fullName: "Рис чёрный", shortName: "Рис чёрный", image: "" },
    { fullName: "Сорго", shortName: "Сорго", image: "" },
    { fullName: "Кукуруза", shortName: "Кукуруза", image: "" },
    { fullName: "Булгур", shortName: "Булгур", image: "" },
    { fullName: "Перловка", shortName: "Перловка", image: "" },
    { fullName: "Полба", shortName: "Полба", image: "" }
  ],
  "Орехи и кокосовая стружка": [
    { fullName: "Кешью", shortName: "Кешью", image: "" },
    { fullName: "Миндаль", shortName: "Миндаль", image: "" },
    { fullName: "Грецкие орехи", shortName: "Грецкие орехи", image: "" },
    { fullName: "Кокосовая стружка", shortName: "Кокосовая стружка", image: "" },
    { fullName: "Бразильский орех", shortName: "Бразильский орех", image: "" },
    { fullName: "Кедровые орехи", shortName: "Кедровые орехи", image: "" },
    { fullName: "Макадамия", shortName: "Макадамия", image: "" },
    { fullName: "Пекан", shortName: "Пекан", image: "" },
    { fullName: "Фисташки", shortName: "Фисташки", image: "" },
    { fullName: "Фундук", shortName: "Фундук", image: "" }
  ],
  "Семена": [
    { fullName: "Лён", shortName: "Лён", image: "" },
    { fullName: "Чиа", shortName: "Чиа", image: "" },
    { fullName: "Подсолнечник", shortName: "Подсолнечник", image: "" },
    { fullName: "Тыква", shortName: "Тыква", image: "" },
    { fullName: "Кунжут", shortName: "Кунжут", image: "" },
    { fullName: "Конопляные семена", shortName: "Конопляные семена", image: "" },
    { fullName: "Мак", shortName: "Мак", image: "" },
    { fullName: "Семена", shortName: "Семена", image: "" }
  ],
  "Специи и сухие ингредиенты": [
    { fullName: "Агар-агар", shortName: "Агар-агар", image: "" },
    { fullName: "Яблочный уксус", shortName: "Яблочный уксус", image: "" },
    { fullName: "Какао-порошок", shortName: "Какао-порошок", image: "" },
    { fullName: "Куркума", shortName: "Куркума", image: "" },
    { fullName: "Чёрный перец", shortName: "Чёрный перец", image: "" },
    { fullName: "Корица", shortName: "Корица", image: "" },
    { fullName: "Имбирь", shortName: "Имбирь", image: "" },
    { fullName: "Паприка", shortName: "Паприка", image: "" },
    { fullName: "Кардамон", shortName: "Кардамон", image: "" },
    { fullName: "Кориандр", shortName: "Кориандр", image: "" },
    { fullName: "Кайенский перец", shortName: "Кайенский перец", image: "" },
    { fullName: "Тмин", shortName: "Тмин", image: "" },
    { fullName: "Псиллиум", shortName: "Псиллиум", image: "" },
    { fullName: "Ваниль", shortName: "Ваниль", image: "" },
    { fullName: "Тимьян", shortName: "Тимьян", image: "" },
    { fullName: "Лавровый лист", shortName: "Лавровый лист", image: "" },
    { fullName: "Сода", shortName: "Сода", image: "" },
    { fullName: "Горчица", shortName: "Горчица", image: "" },
    { fullName: "Зира", shortName: "Зира", image: "" },
    { fullName: "Кленовый сироп", shortName: "Кленовый сироп", image: "" },
    { fullName: "Кокосовый сахар", shortName: "Кокосовый сахар", image: "" },
    { fullName: "Копченая паприка", shortName: "Копченая паприка", image: "" },
    { fullName: "Льняная мука", shortName: "Льняная мука", image: "" },
    { fullName: "Нутрицевтические дрожжи", shortName: "Нутрицевтические дрожжи", image: "" },
    { fullName: "Орегано", shortName: "Орегано", image: "" },
    { fullName: "Розмарин", shortName: "Розмарин", image: "" },
    { fullName: "Соевый соус тамари", shortName: "Соевый соус тамари", image: "" },
    { fullName: "Уксус бальзамический", shortName: "Уксус бальзамический", image: "" },
    { fullName: "Какао", shortName: "Какао", image: "" },
    { fullName: "Мука (тесто)", shortName: "Мука", image: "" },
    { fullName: "Специи", shortName: "Специи", image: "" }
  ],
  "Свежие продукты": [
    // Подкатегория: Овощи
    { fullName: "Батат", shortName: "Батат", image: "", subcategory: "Овощи" },
    { fullName: "Капуста белокочанная", shortName: "Капуста", image: "", subcategory: "Овощи" },
    { fullName: "Морковь", shortName: "Морковь", image: "", subcategory: "Овощи" },
    { fullName: "Свёкла", shortName: "Свёкла", image: "", subcategory: "Овощи" },
    { fullName: "Лук репчатый", shortName: "Лук репчатый", image: "", subcategory: "Овощи" },
    { fullName: "Чеснок", shortName: "Чеснок", image: "", subcategory: "Овощи" },
    { fullName: "Помидоры", shortName: "Помидоры", image: "", subcategory: "Овощи" },
    { fullName: "Огурцы", shortName: "Огурцы", image: "", subcategory: "Овощи" },
    { fullName: "Болгарский перец", shortName: "Болгарский перец", image: "", subcategory: "Овощи" },
    { fullName: "Острый перец", shortName: "Перец чили", image: "", subcategory: "Овощи" },
    { fullName: "Цветная капуста", shortName: "Цветная капуста", image: "", subcategory: "Овощи" },
    { fullName: "Кабачок", shortName: "Кабачок", image: "", subcategory: "Овощи" },
    { fullName: "Баклажан", shortName: "Баклажан", image: "", subcategory: "Овощи" },
    { fullName: "Сельдерей", shortName: "Сельдерей", image: "", subcategory: "Овощи" },
    { fullName: "Тыква", shortName: "Тыква", image: "", subcategory: "Овощи" },
    { fullName: "Авокадо", shortName: "Авокадо", image: "", subcategory: "Овощи" },
    { fullName: "Артишоки", shortName: "Артишоки", image: "", subcategory: "Овощи" },
    { fullName: "Брокколи", shortName: "Брокколи", image: "", subcategory: "Овощи" },
    { fullName: "Дайкон", shortName: "Дайкон", image: "", subcategory: "Овощи" },
    { fullName: "Кале", shortName: "Кале", image: "", subcategory: "Овощи" },
    { fullName: "Капуста брюссельская", shortName: "Капуста брюссельская", image: "", subcategory: "Овощи" },
    { fullName: "Капуста краснокочанная", shortName: "Капуста краснокочанная", image: "", subcategory: "Овощи" },
    { fullName: "Капуста пекинская", shortName: "Капуста пекинская", image: "", subcategory: "Овощи" },
    { fullName: "Капуста савойская", shortName: "Капуста савойская", image: "", subcategory: "Овощи" },
    { fullName: "Картофель", shortName: "Картофель", image: "", subcategory: "Овощи" },
    { fullName: "Квашеная капуста", shortName: "Квашеная капуста", image: "", subcategory: "Овощи" },
    { fullName: "Кольраби", shortName: "Кольраби", image: "", subcategory: "Овощи" },
    { fullName: "Корень куркумы", shortName: "Корень куркумы", image: "", subcategory: "Овощи" },
    { fullName: "Корень сельдерея", shortName: "Корень сельдерея", image: "", subcategory: "Овощи" },
    { fullName: "Лук красный", shortName: "Лук красный", image: "", subcategory: "Овощи" },
    { fullName: "Лук-порей", shortName: "Лук-порей", image: "", subcategory: "Овощи" },
    { fullName: "Мангольд", shortName: "Мангольд", image: "", subcategory: "Овощи" },
    { fullName: "Редис", shortName: "Редис", image: "", subcategory: "Овощи" },
    { fullName: "Редька зеленая", shortName: "Редька зеленая", image: "", subcategory: "Овощи" },
    { fullName: "Репа", shortName: "Репа", image: "", subcategory: "Овощи" },
    { fullName: "Цукини", shortName: "Цукини", image: "", subcategory: "Овощи" },

    // Подкатегория: Фрукты и ягоды
    { fullName: "Яблоки", shortName: "Яблоки", image: "", subcategory: "Фрукты и ягоды" },
    { fullName: "Груши", shortName: "Груши", image: "", subcategory: "Фрукты и ягоды" },
    { fullName: "Бананы", shortName: "Бананы", image: "", subcategory: "Фрукты и ягоды" },
    { fullName: "Апельсины", shortName: "Апельсины", image: "", subcategory: "Фрукты и ягоды" },
    { fullName: "Лимоны", shortName: "Лимоны", image: "", subcategory: "Фрукты и ягоды" },
    { fullName: "Ягоды", shortName: "Ягоды", image: "", subcategory: "Фрукты и ягоды" },
    { fullName: "Финики", shortName: "Финики", image: "", subcategory: "Фрукты и ягоды" },
    { fullName: "Абрикосы", shortName: "Абрикосы", image: "", subcategory: "Фрукты и ягоды" },
    { fullName: "Ананас", shortName: "Ананас", image: "", subcategory: "Фрукты и ягоды" },
    { fullName: "Гранат", shortName: "Гранат", image: "", subcategory: "Фрукты и ягоды" },
    { fullName: "Грейпфрут", shortName: "Грейпфрут", image: "", subcategory: "Фрукты и ягоды" },
    { fullName: "Инжир", shortName: "Инжир", image: "", subcategory: "Фрукты и ягоды" },
    { fullName: "Киви", shortName: "Киви", image: "", subcategory: "Фрукты и ягоды" },
    { fullName: "Лайм", shortName: "Лайм", image: "", subcategory: "Фрукты и ягоды" },
    { fullName: "Манго", shortName: "Манго", image: "", subcategory: "Фрукты и ягоды" },
    { fullName: "Персики", shortName: "Персики", image: "", subcategory: "Фрукты и ягоды" },
    { fullName: "Голубика", shortName: "Голубика", image: "", subcategory: "Фрукты и ягоды" },
    { fullName: "Малина", shortName: "Малина", image: "", subcategory: "Фрукты и ягоды" },

    // Подкатегория: Зелень и прочее
    { fullName: "Петрушка", shortName: "Петрушка", image: "", subcategory: "Зелень и прочее" },
    { fullName: "Укроп", shortName: "Укроп", image: "", subcategory: "Зелень и прочее" },
    { fullName: "Руккола", shortName: "Руккола", image: "", subcategory: "Зелень и прочее" },
    { fullName: "Шпинат", shortName: "Шпинат", image: "", subcategory: "Зелень и прочее" },
    { fullName: "Зелёный лук", shortName: "Зелёный лук", image: "", subcategory: "Зелень и прочее" },
    { fullName: "Базилик", shortName: "Базилик", image: "", subcategory: "Зелень и прочее" },
    { fullName: "Нори", shortName: "Нори", image: "", subcategory: "Нори // Водоросли" },
    { fullName: "Шампиньоны", shortName: "Шампиньоны", image: "", subcategory: "Грибы" },
    { fullName: "Мисо-паста", shortName: "Мисо-паста", image: "", subcategory: "Соименитые" },
    { fullName: "Кинза", shortName: "Кинза", image: "", subcategory: "Зелень и прочее" },
    { fullName: "Микрозелень любая", shortName: "Микрозелень", image: "", subcategory: "Зелень и прочее" },
    { fullName: "Мята", shortName: "Мята", image: "", subcategory: "Зелень и прочее" },
    { fullName: "Сушеные грибы шиитаке", shortName: "Грибы шиитаке", image: "", subcategory: "Грибы" },
    { fullName: "Тархун", shortName: "Тархун", image: "", subcategory: "Зелень и прочее" },
    { fullName: "Вода", shortName: "Вода", image: "", subcategory: "Зелень и прочее" },
    { fullName: "Соус", shortName: "Соус", image: "", subcategory: "Зелень и прочее" }
  ]
 };

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

Object.keys(INGREDIENTS_DATABASE).forEach(category => {
  INGREDIENTS_DATABASE[category].forEach(item => {
    if (!item.image) {
      item.image = getIngredientImage(item.shortName || item.fullName) || '';
    }
  });
});

// Checks if the typed or chosen name complies with strict WFPB salt-free, oil-free guidelines
export default function CheckCompositionScreen({
  initialIngredients = [],
  onAnalyzeComplete,
  currentDayIndex,
  onBack: propsOnBack,
  dayNotes: propsDayNotes,
  screen: propsScreen,
  onOpenCalendar: propsOnOpenCalendar,
}: CheckCompositionScreenProps) {
  const setScreen = useAppStore((s) => s.setScreen);
  const onBack = propsOnBack || (() => setScreen("what-i-eat"));
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

  // Checks compliance: DB wfpbStatus (exact nameRu match) is authoritative,
  // text heuristics apply only when the product is not in the base.
  const checkIsCompliant = (name: string): boolean => {
    const dbStatus = matchDBStatus(name, foodCache);
    if (dbStatus) return dbStatus !== "forbidden";
    return checkWFPB(name).compliant;
  };
  // Start with a premium AI computer vision loading state
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(true);
  
  const [cards, setCards] = useState<IngredientCard[]>(() => {
    if (initialIngredients && initialIngredients.length > 0) {
      return initialIngredients;
    }
    return INITIAL_CARDS;
  });
  // Initially no card is selected, meaning edit panel is closed
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null); 
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
      setIsDropdownOpen(false);
      return;
    }

    const card = cards.find(c => c.id === selectedCardId);
    if (card) {
      setEditedFullName(card.fullName);
      setEditedShortName(card.shortName);
      setEditedImage(card.image);
      setEditedWeight(card.weight || 100);
      setIsDropdownOpen(false);

      // Find which category this ingredient might belong in, to preset active tab
      let foundCategory = "Бобовые";
      let foundSub = "Все";
      for (const [category, items] of Object.entries(INGREDIENTS_DATABASE)) {
        const matchingItem = items.find(i => i.fullName === card.fullName || i.shortName === card.shortName);
        if (matchingItem) {
          foundCategory = category;
          if (matchingItem.subcategory) {
            foundSub = matchingItem.subcategory as any;
          }
          break;
        }
      }
      setActiveCategory(foundCategory);
      if (foundCategory === "Свежие продукты") {
        setActiveSubcategory(foundSub as any);
      }
    }
  }, [selectedCardId, cards]);

  const activeCard = selectedCardId === "add-new" 
    ? { id: "add-new", fullName: editedFullName, shortName: editedShortName, image: editedImage, status: "green" as const } 
    : cards.find(c => c.id === selectedCardId);

  // Save changes of current ingredient card
  const handleSaveIngredient = () => {
    if (!selectedCardId) return;

    const trimmedName = editedShortName.trim() || editedFullName.trim();
    if (!trimmedName || trimmedName === "Выберите ингредиент") {
      showToast("Пожалуйста, выберите или введите название ингредиента 🌱");
      return;
    }

    const isCompliant = checkIsCompliant(trimmedName) && checkIsCompliant(editedFullName);

    if (selectedCardId === "add-new") {
      // Adding a brand new card to the list
      const newCard: IngredientCard = {
        id: `custom-${Date.now()}`,
        fullName: editedFullName,
        shortName: trimmedName,
        image: editedImage || "https://images.unsplash.com/photo-1547058886-f6d8174f85e4?auto=format&fit=crop&q=80&w=150",
        weight: editedWeight,
        status: isCompliant ? "green" : "error"
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
            status: isCompliant ? "green" : "error",
            manuallyAllowed: isCompliant ? undefined : false
          };
        }
        return c;
      }));
      showToast(`Сохранено: ${trimmedName} — ${editedWeight} г 🌱`);
    }

    // Auto-close the panel after saving successfully
    setSelectedCardId(null);
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
  const incrementWeight = () => setEditedWeight(w => w + 10);
  const decrementWeight = () => setEditedWeight(w => Math.max(10, w - 10));

  // Change active ingredient options from selected list
  const handleSelectOption = (opt: IngredientOption) => {
    setEditedFullName(opt.fullName);
    setEditedShortName(opt.shortName);
    setEditedImage(opt.image);
    setIsDropdownOpen(false);
  };

  // Main CTA: Finish checkup & analyze
  const handleRunAnalysis = () => {
    // Audit ingredients before closing
    const containsErrors = cards.some(c => c.status === "error" && !c.manuallyAllowed);
    if (containsErrors) {
      showToast("Пожалуйста, замените сомнительные ингредиенты (подсвеченные красным) для чистоты WFPB! ❌");
      return;
    }

    showToast("Анализ состава успешно проверен! Переходим к разбору... 🌿");
    setTimeout(() => {
      onAnalyzeComplete(cards);
    }, 1200);
  };

  // Switch category tabs
  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    setIsDropdownOpen(false);
    setActiveSubcategory("Все");
    const firstOpt = INGREDIENTS_DATABASE[cat]?.[0];
    if (firstOpt) {
      handleSelectOption(firstOpt);
    }
  };

  // Return formatted array of ingredients with subcategory filters
  const getFilteredOptions = () => {
    const list = INGREDIENTS_DATABASE[activeCategory] || [];
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
            <div className="w-7 h-7 rounded-full bg-[#16B551] flex items-center justify-center text-white shrink-0">
              <Sparkles className="w-4 h-4 stroke-[2]" />
            </div>
            <p 
              className="text-[13px] text-[#15803D] font-bold leading-normal"
              style={{ fontFamily: '"Calibri", sans-serif' }}
            >
              Система распознала рецепт по фото и сопоставила ингредиенты с базой правил WFPB рациона 🌱
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
            const isSelected = c.id === selectedCardId;
            const isRed = c.status === "error";
            const isBlue = c.status === "blue";
            const hasGreenCheck = (c.weight || c.manuallyAllowed) && !isRed && !isBlue;

            const selectionRing = isSelected 
              ? "ring-2 ring-emerald-500 scale-[1.03]"
              : "";

            const ingredientImageUrl = getIngredientImage(c.shortName || c.fullName);

            return (
              <div
                key={c.id}
                onClick={() => setSelectedCardId(c.id)}
                className={`flex flex-col items-center justify-start gap-1 p-2 cursor-pointer transition-all duration-300 relative ${selectionRing}`}
              >
                {/* Status badge at top right */}
                {isRed ? (
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
                  isRed
                    ? 'drop-shadow-[0_4px_8px_rgba(239,68,68,0.35)]'
                    : isBlue
                    ? 'drop-shadow-[0_4px_8px_rgba(59,130,246,0.3)]'
                    : hasGreenCheck
                    ? 'drop-shadow-[0_4px_8px_rgba(22,181,81,0.3)]'
                    : ''
                }`}>
                  {ingredientImageUrl ? (
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
                    isRed ? "text-red-600" : "text-gray-800"
                  }`}>
                    {c.shortName}
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
                  ? "bg-[#ECFDF5] border-[#16B551] text-[#16B551] ring-2 ring-emerald-500"
                  : "border-[#C2D8C9] text-[#16B551] hover:border-[#16B551]"
              }`}
            >
              <Plus className="w-7 h-7 stroke-[2.5]" />
              <span className="text-[13px] font-black">Добавить</span>
            </div>
          )}
        </div>

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
                className={`rounded-[26px] border p-4.5 flex flex-col gap-4 text-left relative ${
                  activeCard.status === "error" || (selectedCardId !== "add-new" && cards.find(x => x.id === selectedCardId)?.status === "error")
                    ? "bg-[#FFF8F8] border-[#FCA5A5] shadow-[0_8px_24px_rgba(239,68,68,0.04)]" 
                    : "bg-white border-[#EFF2F3] shadow-[0_8px_24px_rgba(43,49,55,0.04)]"
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

                {/* Dynamic alert warning if non-compliant ingredient is bound */}
                {(!checkIsCompliant(editedShortName) || !checkIsCompliant(editedFullName)) && (
                  <div className="bg-red-50 border border-red-200 rounded-[14px] p-2.5 flex items-start gap-2 text-[12.5px] text-red-800 leading-tight">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-extrabold text-red-900 block mb-0.5">Содержит запрещенные продукты!</strong>
                      Правила WFPB полностью исключают продукты животного происхождения, соль и любые масла. Карточка останется красной до замены на разрешенный ингредиент.
                    </div>
                  </div>
                )}

                {/* INPUT FIELD FOR EDITING NAME DIRECTLY */}
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
                    }}
                    className="w-full bg-white border border-[#EFF2F3] rounded-[16px] px-4 py-2.5 text-[14.5px] font-bold text-[#2B3137] focus:outline-none focus:border-[#16B551] shadow-[inset_0_1px_2px_rgba(0,0,0,0.015)]"
                  />
                </div>

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
                          src={getIngredientImage(editedShortName || editedFullName) || ''} 
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

                      {getFilteredOptions().map((opt, oIdx) => (
                        <button
                          key={oIdx}
                          type="button"
                          onClick={() => handleSelectOption(opt)}
                          className="w-full hover:bg-[#F3F9F4] rounded-[12px] p-2 flex items-center gap-2.5 text-left transition-colors duration-150 cursor-pointer text-[#2B3137] text-[13.5px] font-semibold"
                        >
                          <div className="w-6 h-6 shrink-0 flex items-center justify-center">
                            <img 
                              src={getIngredientImage(opt.shortName || opt.fullName) || ''} 
                              alt={opt.shortName} 
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
                            <span className="font-extrabold text-[13.5px] leading-tight text-[#2B3137]">{opt.fullName}</span>
                            {opt.subcategory && (
                              <span className="text-[9.5px] text-[#A1B0B8] font-bold leading-none mt-0.5">{opt.subcategory}</span>
                            )}
                          </div>
                        </button>
                      ))}
                      {getFilteredOptions().length === 0 && (
                        <span className="text-[12px] text-[#A1B0B8] py-4 text-center block font-semibold">Список пуст</span>
                      )}
                    </div>
                  )}
                </div>

                {/* INTERACTIVE COMPREHENSIVE CATEGORY CHIPS */}
                <div className="flex flex-col gap-1 text-left select-none">
                  <label className="text-[12px] text-[#737C86] font-bold" style={{ fontFamily: '"Calibri", sans-serif' }}>
                    Категория справочника
                  </label>
                  <div className="w-full overflow-x-auto scrollbar-none flex gap-1.5 py-0.5 max-w-[340px] select-none shrink-0">
                    {Object.keys(INGREDIENTS_DATABASE).map((categoryName) => {
                      const isActive = activeCategory === categoryName;
                      return (
                        <button
                          key={categoryName}
                          type="button"
                          onClick={() => handleCategoryChange(categoryName)}
                          className={`px-3 py-1.5 rounded-full text-[12.5px] font-extrabold tracking-tight whitespace-nowrap transition-all duration-200 cursor-pointer ${
                            isActive 
                              ? "bg-[#ECFDF5] text-[#16B551] border border-[#16B551] shadow-sm" 
                              : "bg-white hover:bg-[#FAFAFA] text-[#737C86] border border-[#EFF2F3]"
                          }`}
                          style={{ fontFamily: '"Calibri", sans-serif' }}
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

                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={editedWeight}
                      onChange={(e) => setEditedWeight(Math.max(1, parseInt(e.target.value, 10) || 0))}
                      className="flex-1 bg-white border border-[#EFF2F3] rounded-[16px] px-4 py-2.5 text-center text-[16px] font-black text-[#2B3137] shadow-[inset_0_1px_2px_rgba(0,0,0,0.01)] focus:outline-none focus:border-[#16B551]"
                    />

                    <button
                      type="button"
                      onClick={decrementWeight}
                      className="w-11 h-11 bg-white hover:bg-red-50 border border-[#EFF2F3] shadow-sm rounded-[16px] flex items-center justify-center text-red-500 hover:text-red-700 active:scale-90 transition-transform cursor-pointer shrink-0"
                    >
                      <Minus className="w-4 h-4 stroke-[2.5]" />
                    </button>

                    <button
                      type="button"
                      onClick={incrementWeight}
                      className="w-11 h-11 bg-white hover:bg-emerald-50 border border-[#EFF2F3] shadow-sm rounded-[16px] flex items-center justify-center text-[#16B551] hover:text-[#0A8F3B] active:scale-90 transition-transform cursor-pointer shrink-0"
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </div>
                </div>

                {/* ADDITIONAL ACTIONS FOR WFPB COMPLIANCE ACTIONS */}
                {selectedCardId !== "add-new" && (cards.find(x => x.id === selectedCardId)?.status === "error" || cards.find(x => x.id === selectedCardId)?.manuallyAllowed) && (
                  <div className="flex gap-2.5 mt-1 mb-1">
                    <button
                      type="button"
                      onClick={() => {
                        const targetId = selectedCardId;
                        setCards(prev => prev.map(c => {
                          if (c.id === targetId) {
                            return {
                              ...c,
                              manuallyAllowed: !c.manuallyAllowed,
                              weight: c.weight || 100
                            };
                          }
                          return c;
                        }));
                        const targetCard = cards.find(c => c.id === targetId);
                        const willBeAllowed = !targetCard?.manuallyAllowed;
                        showToast(willBeAllowed ? "Ингредиент разрешён вручную 💚" : "Отменено ручное одобрение ⚠️");
                        setSelectedCardId(null);
                      }}
                      className={`flex-1 py-2.5 rounded-[18px] text-[13.5px] font-black cursor-pointer border transition-all duration-200 flex items-center justify-center gap-1.5 active:scale-95 ${
                        cards.find(x => x.id === selectedCardId)?.manuallyAllowed
                          ? "bg-[#E8F8EE] border-[#10D150] text-[#16B551]"
                          : "bg-white hover:bg-[#F2FCF6] border-[#EFF2F3] text-[#16B551] hover:border-[#10D150]"
                      }`}
                    >
                      <Check className="w-4 h-4 stroke-[2.5]" />
                      <span>{cards.find(x => x.id === selectedCardId)?.manuallyAllowed ? "Разрешено" : "Разрешить"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const targetId = selectedCardId;
                        setCards(prev => prev.filter(c => c.id !== targetId));
                        setSelectedCardId(null);
                        showToast("Ингредиент удалён из состава 🍃");
                      }}
                      className="flex-1 bg-[#FFF5F5] hover:bg-[#FFF1F1] border border-red-200 text-red-600 rounded-[18px] py-2.5 font-bold transition-all duration-200 active:scale-95 text-[13.5px] cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Trash2 className="w-4 h-4 shrink-0" />
                      <span>Удалить</span>
                    </button>
                  </div>
                )}

                {/* CONFIRM / SAVE ACTIONS */}
                <div className="flex gap-2.5 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedCardId(null)}
                    className="flex-1 bg-white hover:bg-[#FAFAFA] border border-[#EFF2F3] rounded-[18px] py-2.5 font-bold text-[#737C86] transition-all duration-200 active:scale-95 text-[14.5px] cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveIngredient}
                    className="flex-1 bg-gradient-to-b from-[#10D150] via-[#16B551] to-[#0A8F3B] hover:brightness-[1.04] rounded-[18px] py-2.5 font-bold text-white shadow-md transition-all duration-200 active:scale-95 text-[14.5px] cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4 text-white stroke-[2.5]" />
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
              className="w-full bg-gradient-to-b from-[#10D150] via-[#16B551] to-[#0A8F3B] hover:brightness-[1.03] rounded-[22px] py-4 px-6 font-bold text-white shadow-[0_8px_20px_rgba(22,181,81,0.25),_inset_0_2.5px_4px_rgba(255,255,255,0.45),_0_-2.5px_0_rgba(8,91,36,0.45)_inset] flex items-center justify-center gap-2 relative overflow-hidden transition-all duration-300 hover:scale-[1.02] active:scale-[0.97] text-[17px] cursor-pointer select-none mb-2"
            >
              {/* Glossy glare highlight on button */}
              <div className="absolute top-[1.8px] left-5 right-5 h-[28%] rounded-full bg-gradient-to-b from-white/35 to-transparent pointer-events-none" />
              
              <Sparkles className="w-[18px] h-[18px] text-white animate-pulse" />
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
