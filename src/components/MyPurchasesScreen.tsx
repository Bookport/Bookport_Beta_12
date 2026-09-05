import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Camera, 
  Search, 
  Barcode, 
  ArrowLeft, 
  Plus, 
  Check, 
  Loader2, 
  Sparkles, 
  ShoppingBag, 
  X, 
  Trash2, 
  Heart, 
  ExternalLink, 
  RefreshCw, 
  AlertTriangle, 
  Info, 
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ChevronRight
} from "lucide-react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import BottomBar from "./BottomBar";
import { resolveAvatar } from "../utils/annaAvatarResolver";
import { useAppStore } from "../store/useAppStore";
import { api } from "../utils/api";
import { clientLogger } from "../utils/clientLogger";
import iconFlame from "../assets/images/icone/1.webp";
import iconPeas from "../assets/images/icone/2.webp";
import iconAvocado from "../assets/images/icone/3.webp";
import iconGrains from "../assets/images/icone/4.webp";

const annaAvatarSrc = resolveAvatar({ toneGroup: 'reminder_caution', intent: 'caution' }).src;

// Supported interface for open food facts product data
interface OFFProduct {
  code: string;
  product_name?: string;
  product_name_ru?: string;
  brands?: string;
  image_front_url?: string;
  image_ingredients_url?: string;
  image_nutrition_url?: string;
  ingredients_text?: string;
  ingredients_text_ru?: string;
  ingredients_tags?: string[];
  allergens_tags?: string[];
  traces_tags?: string[];
  additives_tags?: string[];
  labels_tags?: string[];
  ecoscore_grade?: string;
  nutrition_grades?: string;
  nova_group?: number | string;
  categories?: string;
  stores?: string;
  nutriments?: {
    "energy-kcal_100g"?: number;
    "energy-kj_100g"?: number;
    proteins_100g?: number;
    fat_100g?: number;
    carbohydrates_100g?: number;
    sugars_100g?: number;
    sodium_100g?: number;
    salt_100g?: number;
    fiber_100g?: number;
    calcium_100g?: number;
    iron_100g?: number;
    magnesium_100g?: number;
    potassium_100g?: number;
    zinc_100g?: number;
    "vitamin-c_100g"?: number;
    "vitamin-d_100g"?: number;
  };
}

interface PersonalShoppingItem {
  id: string;
  name: string;
  brand?: string;
  image?: string;
  barcode?: string;
  checked: boolean;
  verdictStatus: "green" | "orange" | "red";
  addedAt: number;
}

interface PurchasesScreenProps {
  onBack?: () => void;
  dayNotes?: Record<number, { text: string; time: string }[]>;
  currentDayIndex: number;
  screen?: string;
  onOpenCalendar?: () => void;
  userName?: string;
}

// Popular sample barcodes for dry-run testing inside sandbox or on desktop 
const SAMPLE_BARCODES = [
  { name: "Овсяные хлопья Ясно Солнышко", code: "4601140003046", desc: "Чистый цельный продукт" },
  { name: "Растительное молоко Nemoloko Миндальное", code: "4600676008688", desc: "Без сахара, легкий WFPB" },
  { name: "Хлебцы ржаные бородинские", code: "4604313010168", desc: "Цельные злаки без сахара" },
  { name: "Шоколад горький 85% (Бабаевский)", code: "4600080350438", desc: "С добавлением сахара" }
];

// Rich local, high-quality fallback products dictionary to guarantee offline search works gracefully for standard queries
const LOCAL_FALLBACK_PRODUCTS: OFFProduct[] = [
  {
    code: "4600234123412",
    product_name_ru: "Леденцы фруктовые Sula без сахара",
    product_name: "Sula Fruit Lollipops Sugar Free",
    brands: "Sula / Зула",
    image_front_url: "https://images.unsplash.com/photo-1581798459219-318e76aecc7b?w=200&auto=format&fit=crop&q=60",
    ingredients_text_ru: "подсластитель изомальт, регулятор кислотности лимонная кислота, сорбитовый сироп, натуральный ароматизатор лимон, витамин С",
    ingredients_text: "isomalt, citric acid, sorbitol, natural flavoring lemon, vitamin c",
    nutrition_grades: "b",
    nova_group: 3
  },
  {
    code: "4600080234111",
    product_name_ru: "Карамель леденцовая Барбарис со вкусом барбариса",
    product_name: "Barberry Lollipops with barberry flavor",
    brands: "Рот Фронт",
    image_front_url: "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=200&auto=format&fit=crop&q=60",
    ingredients_text_ru: "сахар, патока карамельная, регулятор кислотности лимонная кислота, краситель кармин, ароматизатор барбарис",
    ingredients_text: "sugar, starch syrup, citric acid, carmine color, flavor barberry",
    nutrition_grades: "d",
    nova_group: 4
  },
  {
    code: "4600676008688",
    product_name_ru: "Напиток овсяный классический Nemoloko",
    product_name: "Oat Milk Classic Nemoloko",
    brands: "Nemoloko",
    image_front_url: "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=200&auto=format&fit=crop&q=60",
    ingredients_text_ru: "вода, овсяная мука, сольйодированная",
    ingredients_text: "water, oat flour, iodized salt",
    nutrition_grades: "a",
    nova_group: 1
  },
  {
    code: "4601140003046",
    product_name_ru: "Овсяные хлопья Ясно Солнышко",
    product_name: "Oat Flakes Hercules Extra 3",
    brands: "Ясно Солнышко",
    image_front_url: "https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=200&auto=format&fit=crop&q=60",
    ingredients_text_ru: "хлопья овсяные овес",
    ingredients_text: "oat flakes",
    nutrition_grades: "a",
    nova_group: 1
  },
  {
    code: "4607123456789",
    product_name_ru: "Тофу соевый органический классический сыр",
    product_name: "Organic Tofu Classic",
    brands: "ВкусВилл",
    image_front_url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&auto=format&fit=crop&q=60",
    ingredients_text_ru: "соевые бобы, вода питьевая, коагулянт магния хлорид",
    ingredients_text: "soybeans, water, magnesium chloride",
    nutrition_grades: "a",
    nova_group: 1
  },
  {
    code: "4604313010168",
    product_name_ru: "Хлебцы бородинские ржаные цельнозерновые",
    product_name: "Borodinsky Rye Crispbreads",
    brands: "Dr. Korner",
    image_front_url: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200&auto=format&fit=crop&q=60",
    ingredients_text_ru: "смесь ржаная цельнозерновая, кориандр дробленый, соль пищевая",
    ingredients_text: "whole grain rye mixture, coriander, salt",
    nutrition_grades: "a",
    nova_group: 1
  },
  {
    code: "4600080350438",
    product_name_ru: "Шокола Бабаевский горький элитный 85% какао",
    product_name: "Elite Dark Chocolate 85%",
    brands: "Бабаевский",
    image_front_url: "https://images.unsplash.com/photo-1548907040-4d42b52145ca?w=200&auto=format&fit=crop&q=60",
    ingredients_text_ru: "какао тертое, сахар, какао-порошок, масло какао, соевый лецитин эмульгатор, ароматизатор натуральный ваниль",
    ingredients_text: "cocoa mass, sugar, cocoa powder, cocoa butter, soy lecithin, vanilla flavor",
    nutrition_grades: "c",
    nova_group: 3
  },
  {
    code: "4607056711823",
    product_name_ru: "Крупа гречневая ядрица быстродействующая гречка",
    product_name: "Buckwheat Groats Fast Cooking",
    brands: "Мистраль",
    image_front_url: "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=200&auto=format&fit=crop&q=60",
    ingredients_text_ru: "крупа гречневая ядрица быстродействующая пропаренная гречиха",
    ingredients_text: "buckwheat organic grain",
    nutrition_grades: "a",
    nova_group: 1
  },
  {
    code: "4600605018313",
    product_name_ru: "Йогурт питьевой Персик Активиа",
    product_name: "Peach Drinking Yogurt Activia",
    brands: "Активиа",
    image_front_url: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=200&auto=format&fit=crop&q=60",
    ingredients_text_ru: "молоко нормализованное, персик, сахар кусковой, сироп глюкозно-фруктозный, пектины стабилизатор, закваска йогуртовая, бифидобактерии",
    ingredients_text: "milk, peach, sugar, glucose syrup, pectin, cultures, bifidus",
    nutrition_grades: "c",
    nova_group: 4
  }
];

// Spell correction dictionary for common food terms in Russian
const RussianCleanMap: Record<string, string> = {
  "авсян": "овсян",
  "какос": "кокос",
  "малак": "молок",
  "тамат": "томат",
  "кифир": "кефир",
  "гричк": "гречк",
  "гречя": "гречк",
  "шпагет": "спагет",
  "спагети": "спагетти",
  "макара": "макаро",
  "макаронн": "макарон",
  "йогурд": "йогурт",
  "иогурт": "йогурт",
  "ягурт": "йогурт",
  "творок": "творог",
  "хлепц": "хлебц",
  "шокалад": "шоколад",
  "шакалад": "шоколад",
  "слифк": "сливк"
};

// Synonym maps to try broader search terms or alternate words if direct search yields few results
const SynonymMap: Record<string, string[]> = {
  "спагетти": ["макароны", "паста"],
  "паста": ["макароны", "спагетти"],
  "макароны": ["спагетти", "паста"],
  "гречка": ["крупа гречневая", "гречневая"],
  "овсяное": ["овсяный", "овсянка"],
  "кокосовое": ["кокосовый", "кокос"],
  "рисовое": ["рисовый", "рис"],
  "миндальное": ["миндальный", "миндаль"],
  "творог": ["творожный", "творок"],
  "кефир": ["кисломолочный"],
  "йогурт": ["йогуртный", "йогурд"],
  "хлеб": ["батон", "булка"],
  "батон": ["хлеб", "булка"],
  "шоколад": ["какао"],
  "масло": ["подсолнечное", "растительное", "сливочное"]
};

// Check if an ingredients text is a valid, readable, non-garbage list
const isIngredientsListValid = (text: string | undefined): boolean => {
  if (!text) return false;
  const pruned = text.trim();
  if (pruned.length < 12) return false;

  const len = pruned.length;
  let digits = 0;
  let symbols = 0;
  for (let i = 0; i < len; i++) {
    const char = pruned[i];
    if (/[0-9]/.test(char)) digits++;
    else if (/[%\/*\\_\[\]+=#@<>|]/.test(char)) symbols++;
  }

  if ((digits + symbols) / len > 0.35) {
    return false;
  }

  const lowercase = pruned.toLowerCase();
  
  if (lowercase.includes("пищевая ценность") && lowercase.includes("белки") && lowercase.includes("жиры") && lowercase.includes("углеводы") && lowercase.length < 200) {
    return false;
  }

  if (lowercase.includes("openfoodfacts") || lowercase.includes("http://") || lowercase.includes("https://")) {
    return false;
  }

  const words = pruned.split(/[\s,.;()]+/).filter(w => w.length > 0);
  if (words.length < 2) return false;

  const singleLettersCount = words.filter(w => w.length === 1).length;
  if (singleLettersCount / words.length > 0.45) {
    return false;
  }

  return true;
};

export default function MyPurchasesScreen({
  currentDayIndex,
  onBack: propsOnBack,
  dayNotes: propsDayNotes,
  screen: propsScreen,
  onOpenCalendar: propsOnOpenCalendar,
  userName: propsUserName,
}: PurchasesScreenProps) {
  const setScreen = useAppStore((s) => s.setScreen);
  const profile = useAppStore((s) => s.userProfile);
  const onBack = propsOnBack || (() => setScreen("my-day"));
  const dayNotes = propsDayNotes || {};
  const screen = propsScreen || useAppStore((s) => s.screen);
  const onOpenCalendar = propsOnOpenCalendar || (() => {});
  const userName = propsUserName || profile.name || "";

  const [activeMode, setActiveMode] = useState<"start" | "scan" | "result">("start");
  const [loading, setLoading] = useState(false);
  const [searchProgress, setSearchProgress] = useState(0); 
  const [searchQuery, setSearchQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false); 
  const [searchResults, setSearchResults] = useState<OFFProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<OFFProduct | null>(null);
  const [manualBarcode, setManualBarcode] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  
  // Добавлен стейт для спойлера (открыт/закрыт)
  const [isShoppingListOpen, setIsShoppingListOpen] = useState(false);

  // === ИНИЦИАЛИЗАЦИЯ И УМНЫЙ ДВОРНИК В LOCAL STORAGE ===
  const [shoppingList, setShoppingList] = useState<PersonalShoppingItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const localData = localStorage.getItem("wfpb_shopping_list");
        if (localData) {
          const parsed = JSON.parse(localData);
          const now = Date.now();
          const sevenDays = 7 * 24 * 60 * 60 * 1000;
          
          // Удаляем зачеркнутые (купленные) и старше 7 дней
          let cleaned = parsed.filter((item: PersonalShoppingItem) => !item.checked && (now - item.addedAt < sevenDays));
          
          // Лимит 50 продуктов
          if (cleaned.length > 50) {
            cleaned = cleaned.slice(0, 50);
          }
          return cleaned;
        }
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("wfpb_shopping_list", JSON.stringify(shoppingList));
    }
  }, [shoppingList]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    (window as any).currentScreenContext = {
      screen_id: "purchases",
      screen_title: "Покупки и Сканирование Баркодов продуктов",
      current_day: currentDayIndex,
      active_tab: activeMode,
      selected_item: selectedProduct ? (selectedProduct.product_name || selectedProduct.code) : null,
      current_status: selectedProduct ? `Проверка WFPB чистоты продукта: ${selectedProduct.product_name || "Без названия"}` : (activeMode === "scan" ? "Используется ИИ-камера для сканирования штрихкода" : "Просмотр каталога супермаркета и покупок"),
      user_input_values: {
        barcode_input: manualBarcode,
        search_query: searchQuery
      },
      active_modal_or_overlay: selectedProduct ? "Паспорт безопасности продукта" : null,
      modal_data: selectedProduct ? {
        barcode: selectedProduct.code,
        ingredients_text: selectedProduct.ingredients_text || "Нет данных",
        brands: selectedProduct.brands,
        categories: selectedProduct.categories,
        nova_group: selectedProduct.nova_group
      } : null
    };

    return () => {
      if ((window as any).currentScreenContext?.screen_id === "purchases") {
        delete (window as any).currentScreenContext;
      }
    };
  }, [currentDayIndex, activeMode, selectedProduct, manualBarcode, searchQuery]);
  
  const [showIngredientsList, setShowIngredientsList] = useState(true);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const [scannerActive, setScannerActive] = useState(false);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = "browser-barcode-viewport";

  const [scanStatus, setScanStatus] = useState<
    "permission-prompt" | "initializing" | "scanning" | "scanned-success" | "searching-db" | "not-found" | "camera-error" | "temp-error"
  >("initializing");

  const [scannedCode, setScannedCode] = useState<string | null>(null);
  
  const timeoutRef = useRef<any>(null);
  const retryTimeoutRef = useRef<any>(null);
  const tempErrorTimeoutRef = useRef<any>(null);
  const startCameraAttemptsCount = useRef<number>(0);
  const hasFoundBarcodeRef = useRef<boolean>(false);

  const stopScanner = async () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    if (tempErrorTimeoutRef.current) clearTimeout(tempErrorTimeoutRef.current);
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (err) {
        console.error("Error stopping scanner", err);
      }
    }
    setScannerActive(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      if (tempErrorTimeoutRef.current) clearTimeout(tempErrorTimeoutRef.current);
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(err => console.error("Unmount cleanup failed", err));
      }
    };
  }, []);

  const handleTopBack = () => {
    if (activeMode !== "start") {
      if (activeMode === "scan") stopScanner();
      setActiveMode("start");
      setSelectedProduct(null);
    } else if (searchResults.length > 0 || searchQuery !== "") {
      setSearchQuery("");
      setSearchResults([]);
      setHasSearched(false);
    } else {
      onBack();
    }
  };

  const startCameraScan = async () => {
    // Интеграция нативного сканера Telegram Mini App
    const tg = (window as any).Telegram?.WebApp;
    if (tg && tg.initData && tg.showScanQrPopup) {
      tg.showScanQrPopup({ text: "Наведите камеру на штрихкод продукта" }, (decodedText: string) => {
        if (decodedText) {
          handleSearchBarcode(decodedText);
          tg.closeScanQrPopup();
        }
      });
      return; // Останавливаем выполнение, чтобы не запускать веб-сканер
    }

    // Резервный веб-сканер для обычных браузеров
    setCameraError(null);
    setScanStatus("initializing");
    setScannedCode(null);
    setScannerActive(true);
    setActiveMode("scan");
    hasFoundBarcodeRef.current = false;
    
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    if (tempErrorTimeoutRef.current) clearTimeout(tempErrorTimeoutRef.current);

    tempErrorTimeoutRef.current = setTimeout(() => {
      setScanStatus("temp-error");
    }, 30000);

    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode(scannerContainerId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E
          ],
          verbose: false
        });
        html5QrCodeRef.current = html5QrCode;

        const config = {
          fps: 24,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const boxWidth = Math.floor(viewfinderWidth * 0.85);
            const boxHeight = Math.floor(boxWidth * 0.35);
            return {
              width: Math.max(240, Math.min(boxWidth, 420)),
              height: Math.max(85, Math.min(boxHeight, 160))
            };
          },
        };

        const onScanSuccess = async (decodedText: string) => {
          if (!decodedText || decodedText.trim() === "") return;
          if (hasFoundBarcodeRef.current) return;
          hasFoundBarcodeRef.current = true;

          if (tempErrorTimeoutRef.current) clearTimeout(tempErrorTimeoutRef.current);

          setScannedCode(decodedText);
          setScanStatus("scanned-success");

          setTimeout(async () => {
            setScanStatus("searching-db");
            try {
              const localMatch = LOCAL_FALLBACK_PRODUCTS.find(p => p.code === decodedText.trim());
              if (localMatch) {
                await stopScanner();
                setSelectedProduct(localMatch);
                setActiveMode("result");
                return;
              }

              const res = await fetch(`https://ru.openfoodfacts.org/api/v2/product/${decodedText.trim()}.json?_t=${Date.now()}`);
              const data = await res.json();
              
              if (data && data.status === 1 && data.product) {
                await stopScanner();
                setSelectedProduct({ code: decodedText, ...data.product });
                setActiveMode("result");
                return;
              } else {
                const resGlobal = await fetch(`https://world.openfoodfacts.org/api/v2/product/${decodedText.trim()}.json?_t=${Date.now()}`);
                const dataGlobal = await resGlobal.json();
                if (dataGlobal && dataGlobal.status === 1 && dataGlobal.product) {
                  await stopScanner();
                  setSelectedProduct({ code: decodedText, ...dataGlobal.product });
                  setActiveMode("result");
                  return;
                }
              }
            } catch (err) {
              console.warn("OpenFoodFacts lookup failed", err);
            }

            await stopScanner();
            setScanStatus("not-found");
          }, 600);
        };

        let cameraIdOrConfig: any = { facingMode: "environment" };
        try {
          const devices = await Html5Qrcode.getCameras();
          if (devices && devices.length > 0) {
            const rearCamera = devices.find(device => {
              const label = device.label.toLowerCase();
              return /back|rear|основная|задняя|environment|triple|dual|camera 0/i.test(label);
            });
            cameraIdOrConfig = rearCamera ? rearCamera.id : devices[0].id;
          }
        } catch (camListErr) {
          console.warn("Direct environment query fallback mode active...", camListErr);
        }

        try {
          await html5QrCode.start(
            cameraIdOrConfig,
            config,
            onScanSuccess,
            () => {}
          );
          setScanStatus("scanning");
          startCameraAttemptsCount.current = 0; 
        } catch (startErr: any) {
          const errorMessage = startErr?.message || String(startErr);
          const isPermissionBlocked = errorMessage.toLowerCase().includes("notallowed") || errorMessage.toLowerCase().includes("permission") || errorMessage.toLowerCase().includes("denied");

          if (isPermissionBlocked) {
            setScanStatus("permission-prompt");
            await stopScanner();
            return;
          }

          if (startCameraAttemptsCount.current < 3) {
            startCameraAttemptsCount.current += 1;
            const backoffDelay = startCameraAttemptsCount.current * 1000 + Math.random() * 150;
            retryTimeoutRef.current = setTimeout(() => {
              startCameraScan();
            }, backoffDelay);
          } else {
            setScanStatus("camera-error");
            setCameraError("Не удалось инициализировать видеокамеру вашего устройства. Проверьте её использование в других приложениях.");
            await stopScanner();
          }
        }

      } catch (err: any) {
        console.error("Critical startCameraScan code block failure", err);
        setScanStatus("camera-error");
        setCameraError(err?.message || "Камера отключена или заблокирована настройками безопасности.");
        await stopScanner();
      }
    }, 150);
  };

  const handleCloseScanner = () => {
    stopScanner();
    setActiveMode("start");
  };

  const handleSearchBarcode = async (barcode: string) => {
    if (!barcode || barcode.trim() === "") return;
    setLoading(true);
    setCameraError(null);
    setActiveMode("result");
    setSelectedProduct(null);
    setShowIngredientsList(true); 

    try {
      const localMatch = LOCAL_FALLBACK_PRODUCTS.find(p => p.code === barcode.trim());
      if (localMatch) {
        setSelectedProduct(localMatch);
        return;
      }

      const res = await fetch(`https://ru.openfoodfacts.org/api/v2/product/${barcode.trim()}.json?_t=${Date.now()}`);
      const data = await res.json();
      
      if (data && data.status === 1 && data.product) {
        setSelectedProduct({ code: barcode, ...data.product });
      } else {
        const resGlobal = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode.trim()}.json?_t=${Date.now()}`);
        const dataGlobal = await resGlobal.json();
        if (dataGlobal && dataGlobal.status === 1 && dataGlobal.product) {
          setSelectedProduct({ code: barcode, ...dataGlobal.product });
        } else {
          setSelectedProduct(null);
        }
      }
    } catch (err) {
      console.warn("Error fetching OFF product data", err);
      setSelectedProduct(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchByName = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setHasSearched(true);
    setSearchResults([]);
    setSearchProgress(15); 

    const fetchOFF = async (q: string, isRu: boolean): Promise<OFFProduct[]> => {
      try {
        const domain = isRu ? "ru" : "world";
        const formattedQuery = encodeURIComponent(q.trim());
        const url = `https://${domain}.openfoodfacts.org/cgi/search.pl?search_terms=${formattedQuery}&search_simple=1&action=process&json=1&page_size=100&_t=${Date.now()}`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) return [];
        const data = await res.json();
        return data.products || [];
      } catch (err) {
        console.warn(`Fetch OFF failed for ${q}`, err);
        return [];
      }
    };

    try {
      const rawQuery = searchQuery.trim().toLowerCase();
      let cleanedQuery = rawQuery;
      
      Object.entries(RussianCleanMap).forEach(([wrong, right]) => {
        cleanedQuery = cleanedQuery.replace(new RegExp(wrong, "g"), right);
      });
      
      const queriesToTry = [cleanedQuery];
      if (cleanedQuery !== rawQuery) {
        queriesToTry.push(rawQuery);
      }

      Object.entries(SynonymMap).forEach(([keyword, synonyms]) => {
        if (cleanedQuery.includes(keyword)) {
          synonyms.forEach(syn => {
            const alternative = cleanedQuery.replace(keyword, syn);
            if (!queriesToTry.includes(alternative)) {
              queriesToTry.push(alternative);
            }
          });
        }
      });

      const words = cleanedQuery.split(/\s+/).filter(w => w.length > 3);
      if (words.length > 1) {
        const twoWords = words.slice(0, 2).join(" ");
        if (!queriesToTry.includes(twoWords)) {
          queriesToTry.push(twoWords);
        }
        words.forEach(word => {
          if (!queriesToTry.includes(word) && queriesToTry.length < 5) {
            queriesToTry.push(word);
          }
        });
      }

      let allProducts: OFFProduct[] = [];
      const seenCodes = new Set<string>();

      const addProducts = (products: OFFProduct[]) => {
        products.forEach(p => {
          if (p && p.code && !seenCodes.has(p.code)) {
            seenCodes.add(p.code);
            allProducts.push(p);
          }
        });
      };

      const matchedLocal = LOCAL_FALLBACK_PRODUCTS.filter(p => {
        const nameRu = (p.product_name_ru || "").toLowerCase();
        const nameEn = (p.product_name || "").toLowerCase();
        const brand = (p.brands || "").toLowerCase();
        return queriesToTry.some(q => 
          nameRu.includes(q) || nameEn.includes(q) || brand.includes(q)
        );
      });
      addProducts(matchedLocal);

      const uniqueQueries = Array.from(new Set(queriesToTry));
      const topQueries = uniqueQueries.slice(0, 3);

      let apiFound = false;
      let attempt = 0;
      const maxAttempts = 4;

      while (attempt < maxAttempts && !apiFound) {
        attempt++;
        setSearchProgress(20 + attempt * 15); 
        
        for (const q of topQueries) {
          const ruProducts = await fetchOFF(q, true);
          if (ruProducts.length > 0) apiFound = true;
          addProducts(ruProducts);
        }

        if (!apiFound) {
          for (const q of topQueries) {
            const worldProducts = await fetchOFF(q, false);
            if (worldProducts.length > 0) apiFound = true;
            addProducts(worldProducts);
          }
        }

        if (apiFound) break; 
        
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }

      if (allProducts.length < 5 && uniqueQueries.length > 3) {
        setSearchProgress(90);
        const remainingQueries = uniqueQueries.slice(3, 6);
        for (const q of remainingQueries) {
           const fallbackResults = await fetchOFF(q, true);
           addProducts(fallbackResults);
        }
      }

      setSearchProgress(100);

      const searchWords = cleanedQuery.split(/\s+/);
      const scoredProducts = allProducts.map(p => {
        let score = 0;
        const nameRu = (p.product_name_ru || "").toLowerCase();
        const nameEn = (p.product_name || "").toLowerCase();
        const brand = (p.brands || "").toLowerCase();

        if (nameRu.includes(cleanedQuery) || nameEn.includes(cleanedQuery)) {
          score += 200;
        }

        searchWords.forEach(word => {
          if (nameRu.includes(word)) score += 40;
          if (nameEn.includes(word)) score += 20;
          if (brand.includes(word)) score += 10;
        });

        if (p.product_name_ru) score += 30;
        if (p.image_front_url) score += 20;

        const ingredients = p.ingredients_text_ru || p.ingredients_text;
        if (ingredients && isIngredientsListValid(ingredients)) {
          score += 15;
        }

        return { product: p, score };
      });

      scoredProducts.sort((a, b) => b.score - a.score);
      setSearchResults(scoredProducts.map(sp => sp.product));

    } catch (err) {
      console.warn("Search warning inside handleSearchByName", err);
    } finally {
      setTimeout(() => {
        setLoading(false);
        setSearchProgress(0);
      }, 400);
    }
  };

  const getAnnasVerdict = (product: OFFProduct) => {
    let rawText = (product.ingredients_text_ru || product.ingredients_text || "").toLowerCase();
    
    const traceMarkers = ["может содержать", "содержит следы", "следы", "следов", "на предприятии", "производится на", "возможно наличие"];
    let cutoff = rawText.length;
    traceMarkers.forEach(marker => {
      const idx = rawText.indexOf(marker);
      if (idx !== -1 && idx < cutoff) cutoff = idx;
    });
    const ingredientsOnly = rawText.substring(0, cutoff);
    
    const searchCorpus = [
      product.product_name_ru,
      product.product_name,
      product.categories,
      ingredientsOnly,
      ...(product.ingredients_tags || [])
    ].filter(Boolean).join(" | ").toLowerCase();

    const foundAnimalIngredients: string[] = [];
    
    const dairyTerms = ["молоко", "молочн", "сухое", "сливки", "сыворотка", "казеин", "лактоза", "масло сливоч", "йогурт", "сыр", "творог", "сметана", "milk", "cheese", "butter", "whey", "dairy", "en:milk"];
    dairyTerms.forEach(term => {
      if (searchCorpus.includes(term)) {
        if (!foundAnimalIngredients.includes("молочные продукты")) foundAnimalIngredients.push("молочные продукты");
      }
    });

    if (searchCorpus.includes("яйц") || searchCorpus.includes("яичн") || searchCorpus.includes("меланж") || searchCorpus.includes("egg") || searchCorpus.includes("en:egg")) {
      if (!foundAnimalIngredients.includes("яйца/яичные продукты")) foundAnimalIngredients.push("яйца/яичные продукты");
    }

    const meatTerms = ["мясо", "куриц", "говяд", "свинин", "птиц", "индейк", "рыб", "шпик", "сало", "бульон", "желатин", "треск", "печень", "лосос", "тунец", "горбуш", "сельдь", "скумбри", "икр", "кревет", "кальмар", "краб", "миди", "шпрот", "meat", "beef", "pork", "chicken", "poultry", "fish", "seafood", "salmon", "cod", "tuna", "en:fish", "en:meat", "dorsch"];
    meatTerms.forEach(term => {
      if (searchCorpus.includes(term)) {
        if (!foundAnimalIngredients.includes("животные белки/жиры (мясо, птица или рыба)")) {
          foundAnimalIngredients.push("животные белки/жиры (мясо, птица или рыба)");
        }
      }
    });

    if (searchCorpus.includes("мед") || searchCorpus.includes("мёд") || searchCorpus.includes("honey") || searchCorpus.includes("en:honey")) {
      if (!foundAnimalIngredients.includes("мёд")) foundAnimalIngredients.push("мёд");
    }

    const isAnimal = foundAnimalIngredients.length > 0;

    const foundOils: string[] = [];
    const oilTerms = ["подсолнеч", "пальм", "рапс", "кокос", "соев", "растительное масло", "рафинирован", "маргарин", " oil ", "öl", "en:oil", "en:palm-oil", "en:sunflower-oil"];
    oilTerms.forEach(term => {
      if (searchCorpus.includes(term)) {
        if (!foundOils.includes("рафинированное масло")) foundOils.push("рафинированное масло");
      }
    });
    const hasRefinedOils = foundOils.length > 0;

    const foundSugars: string[] = [];
    const sugarTerms = ["сахар", "фруктоз", "глюкоз", "сахароз", "сироп", "мальтодекстрин", "sugar", "zucker", "syrup", "en:sugar", "en:syrup"];
    sugarTerms.forEach(term => {
      if (searchCorpus.includes(term)) {
        if (!foundSugars.includes("сахар/сиропы")) foundSugars.push("сахар/сиропы");
      }
    });
    const hasSugar = foundSugars.length > 0;

    const hasSalt = searchCorpus.includes("соль") || searchCorpus.includes("salt") || searchCorpus.includes("salz") || searchCorpus.includes("en:salt");

    const foundAdditives: string[] = [];
    const additiveTerms = ["глутамат", "ароматизатор", "краситель", "консервант", "стабилизатор", "эмульгатор", "е-", " e-", "кислота лимонная", "лецитин"];
    additiveTerms.forEach(term => {
      if (searchCorpus.includes(term)) {
        if (!foundAdditives.includes("технологические добавки")) foundAdditives.push("технологические добавки");
      }
    });
    const hasHeavyAdditives = foundAdditives.length > 0 || Number(product.nova_group) === 4;

    if (isAnimal) {
      const listStr = Array.from(new Set(foundAnimalIngredients)).join(", ");
      return {
        status: "bad" as const,
        title: "Продукт животного происхождения",
        text: `В составе обнаружены компоненты животного происхождения: ${listStr}. Наша система здорового питания «Всё дело в еде!» полностью исключает животные белки и жиры для сохранения эластичности сосудов и поддержки чистой микробиоты. Пожалуйста, выберите альтернативу на 100% растительной основе.`
      };
    }

    if (hasRefinedOils && hasSugar) {
      return {
        status: "bad" as const,
        title: "Рафинированные жиры и сахар",
        text: `В составе одновременно присутствуют рафинированные жиры и добавленный сахар. Такое сочетание изолированных калорий перегружает поджелудочную железу и провоцирует скрытые воспаления. Рекомендую заменить этот продукт цельными злаками, фруктами или орехами.`
      };
    }

    if (hasRefinedOils) {
      return {
        status: "oil-sugar" as const,
        title: "Содержит рафинированные масла",
        text: `В составе присутствует изолированное масло. Согласно правилам WFPB, мы бережём стенки артерий и рекомендуем получать жиры только в их природной оболочке — из семечек, орехов, авокадо, льна или чиа, где они связаны с клетчаткой.`
      };
    }

    if (hasSugar) {
      return {
        status: "oil-sugar" as const,
        title: "Содержит добавленный сахар",
        text: `В списке ингредиентов замечен рафинированный подсластитель. Быстрые изолированные сахара провоцируют резкие инсулиновые колебания. Старайтесь выбирать продукты со сладостью от цельных фиников, кураги или спелых фруктов.`
      };
    }

    if (hasHeavyAdditives) {
      return {
        status: "warning" as const,
        title: "Высокая степень обработки",
        text: `Полностью растительный продукт, однако содержит добавленные компоненты глубокой обработки. Это допустимо как редкое компромиссное решение в пути, но для регулярного рациона лучше отдавать предпочтение минимально обработанным цельным продуктам.`
      };
    }

    if (hasSalt) {
      return {
        status: "warning" as const,
        title: "Присутствует добавленная соль",
        text: "Состав растительный и достаточно простой, но содержит добавленную соль. Избыток натрия задерживает межклеточную влагу и повышает нагрузку на миокард. Попробуйте употреблять этот продукт умеренно или заменить безсолевым аналогом."
      };
    }

    const cleanedIngredientsList = ingredientsOnly.split(/[,.;()]+/);
    const topIngredients = cleanedIngredientsList
      .slice(0, 3)
      .map(i => i.trim())
      .filter(i => i.length > 3 && !i.includes("содержит") && !i.includes("может"));
    
    const ingredientsMention = topIngredients.length > 0 
      ? `на основе цельных растительных компонентов (${topIngredients.join(", ")})`
      : `на основе чистых растительных компонентов`;

    return {
      status: "perfect" as const,
      title: "Идеально чистый WFPB состав!",
      text: `Превосходный выбор! Перед нами абсолютно натуральный продукт ${ingredientsMention}, не содержащий добавленной соли, сахара, рафинированных масел и избыточной химии. Ваши клетки получат чистую пользу, пищевые волокна и ценные нутриенты. Полное одобрение Анны!`
    };
  };

  function mapVerdictStatus(status: "perfect" | "warning" | "oil-sugar" | "bad"): "green" | "orange" | "red" {
    switch (status) {
      case "perfect": return "green";
      case "warning": return "orange";
      case "oil-sugar":
      case "bad":     return "red";
    }
  }

  const handleAddToShoppingList = () => {
    if (!selectedProduct) return;
    
    const ingredients = selectedProduct.ingredients_text_ru || selectedProduct.ingredients_text || "";
    const hasValidIngredients = isIngredientsListValid(ingredients);
    
    const rawVerdict = hasValidIngredients 
      ? getAnnasVerdict(selectedProduct)
      : {
          status: "perfect" as const,
          title: "Состав не указан",
          text: "Справочный состав отсутствует в Open Food Facts. Пожалуйста, ознакомьтесь с этикеткой самостоятельно!"
        };

    const verdictStatus = mapVerdictStatus(rawVerdict.status);

    const newItem: PersonalShoppingItem = {
      id: `shop-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: selectedProduct.product_name_ru || selectedProduct.product_name || "Продукт по штрихкоду",
      brand: selectedProduct.brands,
      image: selectedProduct.image_front_url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=200",
      barcode: selectedProduct.code,
      checked: false,
      verdictStatus,
      addedAt: Date.now()
    };

    setShoppingList(prev => {
      const updated = [newItem, ...prev];
      return updated.slice(0, 50); // Жесткий лимит 50 продуктов
    });

    setToastMessage("Добавлено в список!");
    setToastVisible(true);
    
    // Мгновенный и жесткий сброс поиска, открытие спойлера и возврат в Start
    setTimeout(() => { 
      setToastVisible(false); 
      setSearchQuery("");
      setSearchResults([]);
      setHasSearched(false);
      setIsShoppingListOpen(true);
      setActiveMode("start"); 
      setSelectedProduct(null); 
    }, 1200);

    api("/api/shopping-list", {
      method: "POST",
      body: {
        barcode: newItem.barcode || null,
        name: newItem.name,
        brand: newItem.brand || null,
        imageUrl: newItem.image || null,
        verdictStatus,
      },
    }).catch(() => {});
  };

  const handleToggleItem = (itemId: string) => {
    setShoppingList(prev => prev.map(item =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    ));
    api("/api/shopping-list/" + encodeURIComponent(itemId), {
      method: "PATCH",
      body: { checked: !shoppingList.find(i => i.id === itemId)?.checked },
    }).catch(() => {});
  };

  const handleRemoveItem = (itemId: string) => {
    setShoppingList(prev => prev.filter(item => item.id !== itemId));
    api("/api/shopping-list/" + encodeURIComponent(itemId), {
      method: "DELETE",
    }).catch(() => {});
  };

  const handleClearShoppingList = () => {
    if (window.confirm("Очистить ваш список покупок?")) {
      setShoppingList([]);
      api("/api/shopping-list", { method: "DELETE" }).catch(() => {});
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between h-full relative" id="purchases-screen-viewport">
      
      {/* 1. SCROLLABLE SCREEN CONTENT AREA */}
      <div className="flex-1 overflow-y-auto px-5 pt-3 pb-24 text-left">
        
        {/* Back Button and Screen Action Status Badge */}
        <div className="flex justify-between items-center w-full mb-3 mt-1">
          <button 
            type="button" 
            onClick={handleTopBack}
            className="w-10 h-10 rounded-full border border-gray-150/70 bg-white shadow-xs flex items-center justify-center text-slate-600 hover:text-brand-green-dark cursor-pointer transition-all active:scale-95 outline-none"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
          </button>
          
          <div className="bg-[#EBF5EF] px-3.5 py-1.5 rounded-full border border-[#D5EADF] shadow-xs select-none">
            <span className="text-[11.5px] font-bold text-[#2E6B47] uppercase tracking-[0.11em] font-sans">
              Осознанный выбор
            </span>
          </div>
        </div>

        {/* Screen Typography Header */}
        <div className="flex flex-col text-left mb-5 select-none w-full" id="purchases-title-group">
          <span className="text-[11px] font-bold tracking-[0.14em] text-[#2E6B47] uppercase opacity-75 font-sans leading-none mb-1.5">
            ассистент
          </span>
          <h1 className="text-[25px] sm:text-[27px] font-bold text-[#2E6B47] tracking-tight leading-none mb-1 font-sans">
            Покупки
          </h1>
          <p className="text-[15px] text-text-muted font-medium leading-tight">
            Проверяй продукты и собирай список осознанно
          </p>
        </div>

        {/* ================= MODE: SCANNING ================= */}
        <AnimatePresence mode="wait">
          {activeMode === "scan" && (
            <motion.div 
              key="camera-scanner"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-[#FBFAF7] rounded-[26px] border border-[#E6E1D7] shadow-sm p-4 mb-4 overflow-hidden relative text-left"
            >
              {/* HEADING ACCENT HEADER */}
              <div className="flex justify-between items-center mb-3.5 border-b border-[#E6E1D7]/40 pb-2">
                <span className="text-[13.5px] font-bold text-[#263326] font-sans flex items-center gap-1.5 select-none">
                  <Camera className="w-4.5 h-4.5 text-[#2E6B47]" /> 
                  {scanStatus === "permission-prompt" && "Ожидание разрешения на камеру"}
                  {scanStatus === "initializing" && "Запуск камеры..."}
                  {scanStatus === "scanning" && "Live сканирование..."}
                  {scanStatus === "temp-error" && "Live сканирование..."}
                  {scanStatus === "scanned-success" && "Код считан!"}
                  {scanStatus === "searching-db" && "Поиск товара в базе..."}
                  {scanStatus === "not-found" && "Товар отсутствует"}
                  {scanStatus === "camera-error" && "Сбой работы камеры"}
                </span>
                <button 
                  type="button"
                  onClick={handleCloseScanner}
                  className="w-7 h-7 rounded-full bg-[#E6E1D7]/30 flex items-center justify-center text-[#667064] hover:text-[#263326] transition-all cursor-pointer active:scale-90"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Aiming guidelines Frame Viewport */}
              <div className="w-full h-48 bg-slate-950 rounded-[18px] relative overflow-hidden flex items-center justify-center border border-[#E6E1D7] shadow-inner" id="media-viewport-container">
                <div id={scannerContainerId} className="absolute inset-0 w-full h-full object-cover [&_video]:object-cover [&_video]:w-full [&_video]:h-full" />
                
                {scanStatus !== "scanning" && scanStatus !== "temp-error" && (
                  <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-[2px] z-5 transition-all" />
                )}

                {scanStatus === "permission-prompt" && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center p-5 text-white">
                    <AlertTriangle className="w-7 h-7 text-[#D8A85F] mb-1.5" />
                    <span className="text-[14px] font-bold tracking-tight mb-1">Камере нужен доступ</span>
                    <p className="text-[11.5px] text-slate-300 leading-normal max-w-[240px] mb-3">
                      Пожалуйста, разрешите доступ к камере во всплывающем окне браузера для автоматического сканирования.
                    </p>
                    <button
                      type="button"
                      onClick={startCameraScan}
                      className="bg-[#2E6B47] hover:bg-[#1F4C31] text-white px-4 py-1.5 rounded-xl font-bold text-[12px] tracking-tight transition-all active:scale-95 cursor-pointer shadow-sm"
                    >
                      Предоставить доступ
                    </button>
                  </div>
                )}

                {scanStatus === "initializing" && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center p-4 text-white">
                    <Loader2 className="w-7 h-7 text-[#7BBE8A] animate-spin mb-2" />
                    <span className="text-[13px] font-semibold text-slate-200">Инициализация видеопотока...</span>
                    <span className="text-[10px] text-slate-400 mt-1">Обычно это занимает не больше секунды</span>
                  </div>
                )}

                {(scanStatus === "scanning" || scanStatus === "temp-error" || scanStatus === "scanned-success") && (
                  <div className={`absolute w-[82%] h-[35%] border rounded-[12px] z-10 flex flex-col items-center justify-center transition-all duration-300 pointer-events-none ${
                    scanStatus === "scanned-success"
                      ? "border-[#7BBE8A] bg-[#7BBE8A]/10 shadow-[0_0_15px_rgba(123,190,138,0.5)]"
                      : "border-white/30 bg-transparent"
                  }`} id="barcode-scan-frame">
                    
                    <div className={`absolute top-1.5 left-1.5 w-4 h-4 border-t-2 border-l-2 transition-colors duration-300 ${scanStatus === "scanned-success" ? "border-[#7BBE8A]" : "border-white/85"}`} />
                    <div className={`absolute top-1.5 right-1.5 w-4 h-4 border-t-2 border-r-2 transition-colors duration-300 ${scanStatus === "scanned-success" ? "border-[#7BBE8A]" : "border-white/85"}`} />
                    <div className={`absolute bottom-1.5 left-1.5 w-4 h-4 border-b-2 border-l-2 transition-colors duration-300 ${scanStatus === "scanned-success" ? "border-[#7BBE8A]" : "border-white/85"}`} />
                    <div className={`absolute bottom-1.5 right-1.5 w-4 h-4 border-b-2 border-r-2 transition-colors duration-300 ${scanStatus === "scanned-success" ? "border-[#7BBE8A]" : "border-white/85"}`} />

                    {scanStatus === "scanned-success" ? (
                      <motion.div
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-[#2E6B47] text-white rounded-full p-1.5 shadow-md"
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                      </motion.div>
                    ) : (
                      <div className={`w-[92%] h-[1.5px] transition-all duration-300 bg-[#7BBE8A] shadow-[0_0_8px_#7BBE8A] animate-pulse`} />
                    )}
                  </div>
                )}

                {scanStatus === "scanned-success" && (
                  <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px] flex flex-col items-center justify-center z-25 text-white pointer-events-none">
                    <span className="text-[12.5px] font-bold tracking-wider uppercase text-[#7BBE8A] bg-slate-900/90 px-3.5 py-1 rounded-full border border-[#7BBE8A]/35 shadow-lg mb-1.5">
                      Код считан!
                    </span>
                    <span className="text-[11px] font-mono tracking-wider opacity-90 font-semibold bg-slate-950/70 px-2 py-0.5 rounded border border-white/10">
                      {scannedCode}
                    </span>
                  </div>
                )}

                {scanStatus === "searching-db" && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-white pointer-events-none">
                    <Loader2 className="w-8 h-8 text-[#7BBE8A] animate-spin mb-2" />
                    <span className="text-[13px] font-medium tracking-tight text-slate-100 bg-slate-900/85 px-3.5 py-1.5 rounded-full border border-white/5 shadow-md text-center animate-pulse">
                      Сверка состава в Open Food Facts...
                    </span>
                  </div>
                )}

                {scanStatus === "not-found" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center z-20 text-white p-4">
                    <div className="w-9 h-9 rounded-full bg-amber-500/15 border border-amber-500 text-[#D8A85F] flex items-center justify-center mb-2">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <span className="text-[13px] font-bold text-amber-200 tracking-tight leading-tight mb-1 bg-slate-950/70 px-3 py-1 rounded-lg border border-amber-500/10">
                      Товар отсутствует в реестре
                    </span>
                    <span className="text-[10px] text-slate-450 font-mono bg-slate-950/40 px-2 py-0.5 rounded">
                      Код: {scannedCode}
                    </span>
                  </div>
                )}

                {scanStatus === "camera-error" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center z-20 text-white p-4 text-center">
                    <div className="w-9 h-9 rounded-full bg-[#D98B8B]/25 border border-[#D98B8B] text-[#D98B8B] flex items-center justify-center mb-2">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <span className="text-[13px] font-bold text-[#D98B8B] tracking-tight leading-tight mb-1 bg-slate-950/70 px-3 py-1 rounded-lg">
                      Камера не запущена
                    </span>
                    <span className="text-[10px] text-slate-350 max-w-[220px] leading-tight">
                      Используйте текстовый поиск по названию или введите штрихкод вручную.
                    </span>
                  </div>
                )}

                <div className="absolute bottom-2.5 inset-x-0 mx-auto text-center z-15 pointer-events-none">
                  <span className="text-[9px] uppercase tracking-wider bg-slate-900/90 text-slate-200 font-bold px-3 py-0.5 rounded-full select-none shadow-sm">
                    {scanStatus === "permission-prompt" && "ожидание камерного доступа"}
                    {scanStatus === "initializing" && "настройка фокусного окна"}
                    {scanStatus === "scanning" && "удерживайте штрихкод по центру рамки"}
                    {scanStatus === "temp-error" && "требуется перенаправление луча"}
                    {scanStatus === "scanned-success" && "захват завершен!"}
                    {scanStatus === "searching-db" && "обращение к веб-реестру"}
                    {scanStatus === "not-found" && "продукт не опознан"}
                    {scanStatus === "camera-error" && "сбой устройства"}
                  </span>
                </div>
              </div>

              <div className="bg-[#FBFAF7] border border-[#E6E1D7] rounded-[22px] p-3.5 flex items-start gap-3 text-left mt-3.5 relative overflow-hidden shadow-xs" id="annas-scan-advice">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#2E6B47]/5 to-transparent rounded-full blur-xl pointer-events-none" />
                <div className="relative shrink-0 select-none">
                  <div className="w-[45px] h-[45px] rounded-full overflow-hidden shadow-md border border-[#2E6B47]/20 relative">
                    <img
                      src={annaAvatarSrc}
                      alt="Анна — Советник WFPB"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-[12px] h-[12px] bg-[#10D150] rounded-full border-2 border-white shadow-sm flex items-center justify-center">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                  </span>
                </div>
                <div className="flex-1 flex flex-col gap-0.5">
                  <div className="flex flex-col">
                    <span className="text-[13.5px] font-black text-[#2E6B47] font-sans leading-none">
                      Анна
                    </span>
                    <span className="text-[10px] font-bold text-text-muted mt-0.5 leading-none font-sans">
                      Советник WFPB
                    </span>
                  </div>
                  <p className="text-[12.5px] text-[#263326] font-medium leading-normal mt-0.5 select-none">
                    {scanStatus === "permission-prompt" && "Анна поясняет: «Для автоматического анализа состава продуктов в магазине приложению потребуется доступ к вашей камере. Пожалуйста, разрешите его.»"}
                    {scanStatus === "initializing" && "Анна настраивает линзы: «Пожалуйста, подождите, я активирую видеосенсор вашего устройства для мгновенного считывания...»"}
                    {scanStatus === "scanning" && "Анна держит фокус: «Просто поднесите продукт штрихкодом к камере — система мгновенно распознает его автоматически во весь экран!»"}
                    {scanStatus === "temp-error" && "Анна рекомендует: «Продукт не считывается? Убедитесь, что на упаковке нет бликов, поднесите штрихкод чуть ближе либо разгладьте складки на обертке.»"}
                    {scanStatus === "scanned-success" && "Анна улыбается: «Есть контакт! Код успешно прочитан. Начинаю поиск состава в глобальном облаке...»"}
                    {scanStatus === "searching-db" && "Анна запрашивает архив: «Секунду! Ищу информацию в архивах Open Food Facts. Сейчас мы за секунду раскроем все добавки и консерванты!»"}
                    {scanStatus === "not-found" && "Анна сожалеет: «Штрихкод успешно зафиксирован, но этого конкретного товара нет в базе Open Food Facts. Давайте поищем по текстовому имени продукта!»"}
                    {scanStatus === "camera-error" && "Анна советует: «Что-то помешало запустить видеопоток со смартфона. Ничего страшного! Вы можете ввести цифры под штрихкодом вручную ниже!»"}
                  </p>
                </div>
              </div>

              {(scanStatus === "not-found" || scanStatus === "camera-error" || scanStatus === "temp-error") && (
                <div className="mt-3.5 p-4 bg-[#F6F4EE] rounded-[20px] border border-[#E6E1D7] flex flex-col gap-3 w-full">
                  <span className="text-[13px] font-bold text-[#263326] leading-none">Быстрые действия:</span>
                  <div className="grid grid-cols-2 gap-2.5">
                    {scanStatus !== "camera-error" && (
                      <button
                        type="button"
                        onClick={() => {
                          startCameraScan();
                        }}
                        className="bg-[#2E6B47] hover:bg-[#1f4c31] text-white rounded-xl py-3 px-4 text-center font-bold text-[13px] tracking-tight transition-all active:scale-95 cursor-pointer shadow-sm"
                      >
                        Повторить скан
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        stopScanner();
                        setActiveMode("start");
                      }}
                      className="bg-white border border-[#E6E1D7] hover:bg-slate-50 text-[#263326] rounded-xl py-3 px-4 text-center font-bold text-[13px] tracking-tight transition-all active:scale-95 cursor-pointer shadow-sm"
                    >
                      Искать текстом
                    </button>
                    {scanStatus === "camera-error" && (
                      <button
                        type="button"
                        onClick={() => {
                          startCameraScan();
                        }}
                        className="bg-[#2E6B47] hover:bg-[#1f4c31] text-white rounded-xl py-3 px-4 text-center font-bold text-[13px] tracking-tight transition-all active:scale-95 cursor-pointer shadow-sm"
                      >
                        Перезагрузить
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="border-t border-[#E6E1D7] pt-4 mt-4 w-full">
                <span className="text-[13px] font-bold text-[#667064] block mb-2">Не считывается? Введите штрихкод руками:</span>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Пример: 4600676008688"
                    value={manualBarcode}
                    onChange={(e) => setManualBarcode(e.target.value.replace(/\D/g, ""))}
                    className="flex-1 outline-none text-[15px] px-4 py-2.5 bg-[#FBFAF7] border border-[#E6E1D7] rounded-xl focus:border-[#2E6B47]/60 font-mono transition-all text-[#263326]"
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      if (manualBarcode.trim()) {
                        stopScanner();
                        handleSearchBarcode(manualBarcode);
                      }
                    }}
                    className="bg-[#2E6B47] hover:bg-[#1F4C31] text-white px-5 py-2.5 rounded-xl font-bold text-[14px] tracking-tight cursor-pointer transition-all active:scale-95 shadow-sm"
                  >
                    Поиск
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ================= MAIN INTERACTIVE HOME HUB OF THE SCREEN ================= */}
        {activeMode === "start" && (
          <div className="flex flex-col gap-4 mb-5 w-full">
            
            {/* УМНАЯ СТРОКА ПОИСКА (SMART SEARCH BAR) СО ВСТРОЕННЫМ СКАНЕРОМ */}
            <div className="bg-white rounded-[26px] border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] p-2.5 relative overflow-hidden">
              <div className="flex gap-2.5 relative z-10">
                <div className="flex-1 flex items-center bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 transition-colors focus-within:border-[#2E6B47]/30 focus-within:bg-white">
                  <Search className="w-5 h-5 text-slate-400 shrink-0 mr-2.5" />
                  <input 
                    type="text" 
                    placeholder="Искать продукт или бренд..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setHasSearched(false);
                      if(e.target.value.trim() === '') setSearchResults([]);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleSearchByName()}
                    className="w-full bg-transparent border-none outline-none text-[16px] text-slate-800 placeholder:text-slate-400"
                  />
                  {searchQuery ? (
                    <button 
                      type="button" 
                      onClick={() => {
                        setSearchQuery("");
                        setHasSearched(false);
                        setSearchResults([]);
                      }}
                      className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  ) : (
                    <button 
                      type="button" 
                      onClick={startCameraScan}
                      className="text-[#2E6B47] hover:text-[#1F4C31] transition-colors p-1 rounded-full hover:bg-emerald-50 cursor-pointer"
                    >
                      <Camera className="w-5 h-5" />
                    </button>
                  )}
                </div>
                <button 
                  type="button"
                  onClick={handleSearchByName}
                  disabled={loading || !searchQuery.trim()}
                  className="bg-[#2E6B47] hover:bg-[#1F4C31] text-white px-6 py-3 rounded-2xl font-bold text-[15px] tracking-tight cursor-pointer transition-all active:scale-95 flex items-center justify-center min-w-[90px] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Найти"}
                </button>
              </div>
              
              {/* Прогресс-бар скрытых повторов API */}
              <div 
                className="absolute bottom-0 left-0 h-1.5 bg-gradient-to-r from-[#2E6B47] to-[#16B551] transition-all duration-300 ease-out z-0" 
                style={{ width: `${searchProgress}%`, opacity: searchProgress > 0 ? 1 : 0 }} 
              />
            </div>

            {/* СПОЙЛЕР ВАШЕГО СПИСКА ПОКУПОК (Выводится под строкой поиска, если не пуст) */}
            {!loading && shoppingList.length > 0 && (
              <div className="w-full mt-2 select-none" id="shopping-list-collection">
                <button
                  type="button"
                  onClick={() => setIsShoppingListOpen(!isShoppingListOpen)}
                  className="flex justify-between items-center w-full mb-3 outline-none active:scale-95 transition-transform"
                >
                  <span className="text-[15.5px] font-extrabold text-[#2F4F3F] font-sans tracking-tight flex items-center gap-1.5">
                    <ShoppingBag className="w-4.5 h-4.5 text-[#2E6B47]" /> Мой список ({shoppingList.length})
                    {isShoppingListOpen ? <ChevronUp className="w-4 h-4 text-slate-400 ml-1" /> : <ChevronDown className="w-4 h-4 text-slate-400 ml-1" />}
                  </span>
                  
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClearShoppingList();
                    }}
                    className="text-[11.5px] font-bold text-red-500 hover:text-red-700 cursor-pointer flex items-center gap-0.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Очистить
                  </span>
                </button>

                <AnimatePresence>
                  {isShoppingListOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden flex flex-col gap-2.5"
                    >
                      {shoppingList.map((item) => {
                        const vColor: Record<string, string> = {
                          green: "bg-emerald-50 text-emerald-700",
                          orange: "bg-amber-50 text-amber-700",
                          red: "bg-red-50 text-red-700",
                        };
                        const vLabel: Record<string, string> = {
                          green: "WFPB ✅",
                          orange: "С осторожностью",
                          red: "Не рекомендуется ❌",
                        };
                        
                        return (
                          <div
                            key={item.id}
                            className={`rounded-[22px] p-3 flex items-start gap-2.5 text-left relative overflow-hidden transition-all duration-300 shadow-[0_6px_16px_rgba(46,107,71,0.06),_0_1px_3px_rgba(0,0,0,0.02)] border-[1.5px] border-white ${
                              item.checked
                                ? "bg-[#EBF5EF]/50 opacity-60 grayscale-[0.5]"
                                : "bg-gradient-to-br from-[#F2F8F4] to-[#E9F3EC]"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => handleToggleItem(item.id)}
                              className={`w-6 h-6 rounded-full border flex items-center justify-center cursor-pointer shrink-0 transition-all ${
                                item.checked
                                  ? "bg-[#16B551] border-[#16B551] text-white"
                                  : "bg-white border-slate-200 hover:border-[#16B551]"
                              }`}
                            >
                              {item.checked && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                            </button>

                            <div className="flex-1 flex gap-2 min-w-0">
                              {item.image ? (
                                <img 
                                  src={item.image} 
                                  alt={item.name}
                                  className="w-12 h-12 rounded-xl object-cover shrink-0 shadow-sm border border-white/50"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200/50 flex items-center justify-center text-slate-300 shrink-0 font-sans text-[8px] font-extrabold uppercase">
                                  ФОТО
                                </div>
                              )}
                              <div className="flex flex-col min-w-0">
                                <span className={`text-[13.5px] font-bold text-slate-800 leading-tight ${item.checked ? "line-through text-slate-400" : ""}`}>
                                  {item.name}
                                </span>
                                {item.brand && (
                                  <span className="text-[11px] text-slate-500 leading-none truncate mt-0.5">
                                    {item.brand}
                                  </span>
                                )}

                                <div className="flex items-center gap-1.5 mt-1.5">
                                  <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-full ${vColor[item.verdictStatus] || "bg-emerald-50 text-emerald-700"}`}>
                                    {vLabel[item.verdictStatus] || "Чистый состав"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ml-1 mt-0.5 focus:outline-none"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {cameraError && (
              <div className="bg-amber-50 rounded-[18px] border border-amber-100 p-3 text-amber-900 text-[12.5px] leading-tight flex items-start gap-2.5">
                <AlertTriangle className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1 flex flex-col gap-1 text-left">
                  <span className="font-bold">Доступ ограничен</span>
                  <span>{cameraError} Приложение автоматически переключилось в режим ручного поиска.</span>
                  <div className="flex gap-2.5 mt-1.5">
                    <button 
                      type="button"
                      onClick={() => setCameraError(null)}
                      className="text-amber-700 underline font-semibold text-[11px]"
                    >
                      Скрыть
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* СПИСОК РЕЗУЛЬТАТОВ ПОИСКА */}
            {searchResults.length > 0 ? (
              <>
                <div className="flex justify-between items-center px-1">
                  <span className="text-[12px] font-bold text-text-muted font-mono bg-slate-100 px-2.5 py-1 rounded-lg">
                    Найдено: {searchResults.length}
                  </span>
                  <button 
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSearchResults([]);
                      setHasSearched(false);
                    }}
                    className="text-slate-500 hover:text-[#2E6B47] font-semibold text-[12.5px] transition-colors flex items-center gap-1"
                  >
                    Сбросить
                  </button>
                </div>
                <div className="flex flex-col gap-3 max-h-[440px] overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
                  {searchResults.map((prod, idx) => {
                    const hasFrontImage = !!prod.image_front_url;
                    const validScore = prod.nutrition_grades && !["unknown", "not-applicable"].includes(prod.nutrition_grades.toLowerCase());
                    
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSelectedProduct(prod);
                          setActiveMode("result");
                        }}
                        className="w-full bg-gradient-to-br from-[#FFF9F2] to-[#FFF1DE] rounded-[22px] border border-[#FFE4C4] p-3 shadow-sm flex items-center justify-between text-left group hover:border-[#FFC885] hover:shadow-md transition-all duration-300 cursor-pointer active:scale-[0.98] outline-none"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                          {hasFrontImage ? (
                            <img 
                              src={prod.image_front_url} 
                              alt={prod.product_name_ru || prod.product_name || "Продукт"}
                              className="w-14 h-14 rounded-xl object-cover shrink-0 shadow-sm border border-[#FFE4C4]/50"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-xl bg-orange-50/50 border border-orange-200/50 border-dashed flex items-center justify-center text-orange-300 shrink-0 font-sans text-[10px] font-extrabold uppercase">
                              НЕТ ФОТО
                            </div>
                          )}
                          <div className="flex flex-col min-w-0">
                            <span className="text-[16px] font-bold text-slate-800 leading-tight truncate">
                              {prod.product_name_ru || prod.product_name || "Без названия"}
                            </span>
                            <span className="text-[12px] text-slate-500 leading-none truncate mt-1 font-sans">
                              {prod.brands || "Неизвестный бренд"}
                            </span>
                            
                            <div className="flex gap-1.5 mt-1.5 items-center">
                              {validScore && (
                                <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-sm line-none ${
                                  prod.nutrition_grades === "a" || prod.nutrition_grades === "b"
                                    ? "bg-green-100 text-green-700"
                                    : prod.nutrition_grades === "c"
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-red-100 text-red-700"
                                }`}>
                                  Nutri {prod.nutrition_grades}
                                </span>
                              )}
                              {prod.nova_group && (
                                <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-sm">
                                  Nova {prod.nova_group.toString().toLowerCase() === 'unknown' ? 'Неизвестно' : prod.nova_group}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="w-8 h-8 rounded-full bg-white/60 group-hover:bg-[#FFF] flex items-center justify-center shrink-0 transition-colors shadow-3xs">
                          <ChevronRight className="w-5 h-5 text-orange-300 group-hover:text-orange-500" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              hasSearched && !loading && searchProgress === 0 && (
                <div className="bg-white rounded-[22px] border border-slate-100 p-6 text-center shadow-sm">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                    <Info className="w-6 h-6 stroke-[1.8]" />
                  </div>
                  <span className="text-[14.5px] font-bold text-slate-700 block mb-1">Ничего не найдено</span>
                  <span className="text-[12px] text-text-muted max-w-[250px] mx-auto block leading-normal">
                    База Open Food Facts не вернула результатов. Попробуйте ввести более общее название товара или бренд.
                  </span>
                </div>
              )
            )}
          </div>
        )}

        {/* ================= LOADING PULSING ANIMATION STATE ================= */}
        {loading && (
          <div className="bg-white rounded-[32px] border border-slate-100/80 shadow-md p-10 text-center mb-5 w-full mt-4">
            <Loader2 className="w-9 h-9 text-[#16B551] animate-spin mx-auto mb-4" />
            <span className="text-[15px] font-bold text-slate-800 block mb-1">Соединение с сервером базы...</span>
            <span className="text-[12px] text-text-muted leading-tight block">
              Запрашиваем данные о составе и пищевой ценности из базы Open Food Facts
            </span>
          </div>
        )}

        {/* ================= MODE: RESULT CARD RENDERING (FOUND OR NOT) ================= */}
        {!loading && activeMode === "result" && (
          <div className="w-full">
            {selectedProduct ? (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[32px] border border-slate-100/50 shadow-[0_10px_25px_-5px_rgba(43,49,55,0.04)] overflow-hidden text-left mb-5 w-full relative"
              >
                
                <div className="absolute top-3 right-3 z-20">
                  <button 
                    type="button" 
                    onClick={() => {
                      setActiveMode("start");
                      setSelectedProduct(null);
                    }}
                    className="w-8 h-8 rounded-full bg-slate-900/60 hover:bg-slate-900 text-white flex items-center justify-center backdrop-blur-md shadow-xs transition-colors cursor-pointer active:scale-90"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* 1. PRODUCT IMAGES GALLERY С ЭФФЕКТОМ ГЛУБИНЫ И СТЕКЛА */}
                <div className="w-full bg-[#F8FAFC] relative border-b border-dashed border-slate-100 overflow-hidden">
                  {(() => {
                    const images = [
                      selectedProduct.image_front_url,
                      selectedProduct.image_ingredients_url,
                      selectedProduct.image_nutrition_url
                    ].filter(Boolean) as string[];

                    if (images.length === 0) {
                      return (
                        <div className="w-full h-44 flex flex-col items-center justify-center text-slate-300 p-3 relative z-10">
                          <ShoppingBag className="w-12 h-12 stroke-[1.2] mb-1.5" />
                          <span className="text-[10px] font-extrabold uppercase tracking-widest bg-slate-100 px-2.5 py-1 rounded-full text-slate-400">
                            Нет фото
                          </span>
                        </div>
                      );
                    }

                    return (
                      <>
                        {/* Glassmorphism Background layer */}
                        <div className="absolute inset-0 pointer-events-none">
                           <img 
                             src={images[0]} 
                             className="w-full h-full object-cover blur-3xl opacity-30 scale-110 saturate-150" 
                             alt="" 
                             referrerPolicy="no-referrer"
                           />
                           <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-[#F8FAFC]/90" />
                        </div>

                        <div className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar w-full relative z-10">
                          {images.map((img, idx) => (
                            <div key={idx} className="w-full h-56 shrink-0 snap-center relative flex items-center justify-center p-3 cursor-zoom-in group" onClick={() => setLightboxImage(img)}>
                              <img 
                                src={img} 
                                alt={`Ракурс ${idx + 1}`} 
                                className="h-full w-full object-contain mix-blend-multiply drop-shadow-sm select-none"
                                referrerPolicy="no-referrer"
                              />
                              {images.length > 1 && (
                                <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md shadow-sm text-[10px] font-bold text-slate-600 border border-slate-100 pointer-events-none">
                                  {idx + 1} / {images.length}
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none rounded-t-[32px]">
                                <Search className="w-8 h-8 text-slate-700/50" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    );
                  })()}

                  <div className="absolute bottom-3 left-3 bg-[#EBF5EF] px-2.5 py-1 rounded-lg border border-emerald-50 pointer-events-none z-20">
                    <span className="text-[9px] font-extrabold uppercase text-[#2E6B47] tracking-wider font-sans">
                      Open Food Facts
                    </span>
                  </div>
                </div>

                {/* 2. PRODUCT NAME & BRAND TEXT LIST */}
                <div className="p-4 w-full">
                  <div className="flex flex-col text-left mb-1">
                    <span className="text-[20px] sm:text-[22px] font-bold text-slate-800 leading-snug">
                      {selectedProduct.product_name_ru || selectedProduct.product_name || "Продукт по штрихкоду"}
                    </span>
                  </div>

                  {/* 3. QUICK SYSTEMIC WELLNESS CHIPS/BADGES BLOCK С ДОБАВЛЕННЫМ ВОЗДУХОМ */}
                  <div className="flex flex-wrap gap-2 mb-5 mt-3">
                    
                    {/* ДОБАВЛЕННЫЙ БЕЙДЖ БРЕНДА ПЕРВЫМ В СПИСКЕ */}
                    {selectedProduct.brands && (
                      <div className="px-2 py-1 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-[11px] font-bold flex items-center gap-1">
                        <span>Бренд:</span>
                        <span className="bg-white/80 px-1.5 py-0.5 rounded font-extrabold">{selectedProduct.brands}</span>
                      </div>
                    )}

                    {(() => {
                      const grade = selectedProduct.nutrition_grades?.toLowerCase();
                      const isValidGrade = grade && !['unknown', 'not-applicable'].includes(grade);
                      
                      if (isValidGrade) {
                        return (
                          <div className={`px-2 py-1 rounded-xl flex items-center gap-1.5 border text-[11px] font-bold ${
                            grade === "a" || grade === "b"
                              ? "bg-green-50 border-green-100 text-green-700"
                              : grade === "c"
                                ? "bg-amber-50 border-amber-100 text-amber-700"
                                : "bg-red-50 border-red-100 text-red-700"
                          }`}>
                            <span className="font-extrabold uppercase">Nutri-Score</span>
                            <span className="text-[13px] uppercase tracking-none shrink-0 font-black">
                              {grade}
                            </span>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {selectedProduct.nova_group && (
                      <div className={`px-2 py-1 rounded-xl flex items-center gap-1 border text-[11px] font-bold ${
                        Number(selectedProduct.nova_group) <= 2
                          ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                          : Number(selectedProduct.nova_group) === 3
                            ? "bg-amber-50 border-amber-100 text-amber-700"
                            : "bg-purple-50 border-purple-100 text-purple-700"
                      }`}>
                        <span>NOVA Group</span>
                        <span className="bg-white/90 px-1 rounded font-extrabold">
                          {selectedProduct.nova_group.toString().toLowerCase() === 'unknown' ? 'Неизвестно' : selectedProduct.nova_group}
                        </span>
                      </div>
                    )}

                    <div className="px-2 py-1 rounded-xl bg-[#F0F5FA] border border-slate-100 text-slate-600 text-[11px] font-bold flex items-center gap-1">
                      <span>Штрихкод:</span>
                      <span className="font-mono">{selectedProduct.code}</span>
                    </div>
                  </div>
				  
				  {/* === КОМПАКТНЫЙ ПРЕМИАЛЬНЫЙ БЛОК КБЖУ С ТОНКИМ КОНТУРОМ И ГЛУБОКОЙ ТЕНЬЮ === */}
                  {selectedProduct.nutriments && (Object.keys(selectedProduct.nutriments).length > 0) && (() => {
                    const n = selectedProduct.nutriments as Record<string, any>;
                    
                    const rawKcal = n["energy-kcal_100g"] ?? n["energy-kcal"] ?? n["energy-kcal_value"] ?? n["energy"];
                    const rawKj = n["energy-kj_100g"] ?? n["energy-kj"] ?? n["energy-kj_value"];
                    const calculatedKcal = rawKcal ? Math.round(Number(rawKcal)) : (rawKj ? Math.round(Number(rawKj) / 4.184) : null);

                    const proteins = n["proteins_100g"] ?? n["proteins"] ?? n["proteins_value"];
                    const fat = n["fat_100g"] ?? n["fat"] ?? n["fat_value"];
                    const carbs = n["carbohydrates_100g"] ?? n["carbohydrates"] ?? n["carbohydrates_value"];
                    
                    const fiber = n["fiber_100g"] ?? n["fiber"];
                    const salt = n["salt_100g"] ?? n["salt"] ?? (n["sodium_100g"] ? n["sodium_100g"] * 2.5 : null);
                    const magnesium = n["magnesium_100g"] !== undefined ? Math.round(Number(n["magnesium_100g"]) * 1000) : null;
                    const iron = n["iron_100g"] !== undefined ? Number(Number(n["iron_100g"]) * 1000).toFixed(1) : null;

                    const getProgress = (val: number, max: number) => Math.min(100, Math.max(5, Math.round((val / max) * 100)));

                    return (
                      <div className="flex flex-col gap-2.5 mb-4 w-full select-none">
                        
                        <div className="grid grid-cols-2 gap-3 w-full">
                          
                          <div className="bg-gradient-to-br from-[#FFF9F0] to-[#FFF3E2] rounded-[22px] p-3.5 border border-white shadow-[0_10px_25px_rgba(249,115,22,0.08),_0_2px_6px_rgba(0,0,0,0.02)] flex flex-col justify-between relative overflow-hidden">
                            <div className="flex justify-between items-start">
                              <span className="text-[11px] font-extrabold text-orange-900/60 uppercase tracking-wider">Калорийность</span>
                              <div className="w-14 h-14 flex items-center justify-center -mr-2 -mt-2 drop-shadow-md opacity-95">
                                <img src={iconFlame} alt="Огонь" className="w-full h-full object-contain" />
                              </div>
                            </div>
                            <div className="flex items-baseline gap-1 -mt-2 mb-1">
                              <span className="text-[24px] font-black text-orange-950 tracking-tight leading-none">
                                {calculatedKcal !== null && !isNaN(calculatedKcal) ? calculatedKcal : "—"}
                              </span>
                              <span className="text-[11px] font-bold text-orange-800/60">ккал</span>
                            </div>
                            <div className="w-full bg-orange-200/40 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-orange-500 h-full rounded-full transition-all duration-500" style={{ width: `${calculatedKcal ? getProgress(calculatedKcal, 400) : 0}%` }} />
                            </div>
                          </div>

                          <div className="bg-gradient-to-br from-[#EBF5EF] to-[#E3F2E8] rounded-[22px] p-3.5 border border-white shadow-[0_10px_25px_rgba(46,107,71,0.08),_0_2px_6px_rgba(0,0,0,0.02)] flex flex-col justify-between relative overflow-hidden">
                            <div className="flex justify-between items-start">
                              <span className="text-[11px] font-extrabold text-[#2E6B47]/60 uppercase tracking-wider">Белки</span>
                              <div className="w-14 h-14 flex items-center justify-center -mr-2 -mt-2 drop-shadow-md opacity-95">
                                <img src={iconPeas} alt="Горошек" className="w-full h-full object-contain" />
                              </div>
                            </div>
                            <div className="flex items-baseline gap-1 -mt-2 mb-1">
                              <span className="text-[24px] font-black text-[#1E4A30] tracking-tight leading-none">
                                {proteins !== undefined && !isNaN(Number(proteins)) ? Number(proteins).toFixed(1) : "—"}
                              </span>
                              <span className="text-[11px] font-bold text-[#2E6B47]/60">г</span>
                            </div>
                            <div className="w-full bg-emerald-200/40 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-[#2E6B47] h-full rounded-full transition-all duration-500" style={{ width: `${proteins ? getProgress(Number(proteins), 30) : 0}%` }} />
                            </div>
                          </div>

                          <div className="bg-gradient-to-br from-[#F0F5FA] to-[#E5EFF8] rounded-[22px] p-3.5 border border-white shadow-[0_10px_25px_rgba(59,130,246,0.08),_0_2px_6px_rgba(0,0,0,0.02)] flex flex-col justify-between relative overflow-hidden">
                            <div className="flex justify-between items-start">
                              <span className="text-[11px] font-extrabold text-blue-900/60 uppercase tracking-wider">Жиры</span>
                              <div className="w-14 h-14 flex items-center justify-center -mr-2 -mt-2 drop-shadow-md opacity-95">
                                <img src={iconAvocado} alt="Авокадо" className="w-full h-full object-contain" />
                              </div>
                            </div>
                            <div className="flex items-baseline gap-1 -mt-2 mb-1">
                              <span className="text-[24px] font-black text-blue-950 tracking-tight leading-none">
                                {fat !== undefined && !isNaN(Number(fat)) ? Number(fat).toFixed(1) : "—"}
                              </span>
                              <span className="text-[11px] font-bold text-blue-800/60">г</span>
                            </div>
                            <div className="w-full bg-blue-200/40 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-blue-500 h-full rounded-full transition-all duration-500" style={{ width: `${fat ? getProgress(Number(fat), 70) : 0}%` }} />
                            </div>
                          </div>

                          <div className="bg-gradient-to-br from-[#FDF4F6] to-[#FAECF0] rounded-[22px] p-3.5 border border-white shadow-[0_10px_25px_rgba(244,63,94,0.08),_0_2px_6px_rgba(0,0,0,0.02)] flex flex-col justify-between relative overflow-hidden">
                            <div className="flex justify-between items-start">
                              <span className="text-[11px] font-extrabold text-rose-900/60 uppercase tracking-wider">Углеводы</span>
                              <div className="w-14 h-14 flex items-center justify-center -mr-2 -mt-2 drop-shadow-md opacity-95">
                                <img src={iconGrains} alt="Злаки" className="w-full h-full object-contain" />
                              </div>
                            </div>
                            <div className="flex items-baseline gap-1 -mt-2 mb-1">
                              <span className="text-[24px] font-black text-rose-950 tracking-tight leading-none">
                                {carbs !== undefined && !isNaN(Number(carbs)) ? Number(carbs).toFixed(1) : "—"}
                              </span>
                              <span className="text-[11px] font-bold text-rose-800/60">г</span>
                            </div>
                            <div className="w-full bg-rose-200/40 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-rose-500 h-full rounded-full transition-all duration-500" style={{ width: `${carbs ? getProgress(Number(carbs), 80) : 0}%` }} />
                            </div>
                          </div>

                        </div>

                        {(fiber !== undefined || salt !== undefined || magnesium !== null || iron !== null) && (
                          <div className="grid grid-cols-4 gap-2 w-full pt-0.5">
                            
                            <div className="bg-gradient-to-br from-[#F2F8F4] to-[#E9F3EC] rounded-2xl p-2.5 border border-white shadow-[0_6px_16px_rgba(46,107,71,0.06),_0_1px_3px_rgba(0,0,0,0.02)] flex flex-col justify-center items-center text-center">
                              <span className="text-[10px] font-extrabold text-emerald-800/60 uppercase tracking-wider mb-0.5">Клетчатка</span>
                              <span className="text-[15px] font-black text-emerald-950">{fiber !== undefined ? `${Number(fiber).toFixed(1)}г` : "—"}</span>
                            </div>

                            <div className="bg-gradient-to-br from-[#F0F5FA] to-[#E6EEF7] rounded-2xl p-2.5 border border-white shadow-[0_6px_16px_rgba(59,130,246,0.06),_0_1px_3px_rgba(0,0,0,0.02)] flex flex-col justify-center items-center text-center">
                              <span className="text-[10px] font-extrabold text-blue-800/60 uppercase tracking-wider mb-0.5">Соль</span>
                              <span className="text-[15px] font-black text-blue-950">{salt !== undefined ? `${Number(salt).toFixed(2)}г` : "—"}</span>
                            </div>

                            <div className="bg-gradient-to-br from-[#FAF5FA] to-[#F5ECF5] rounded-2xl p-2.5 border border-white shadow-[0_6px_16px_rgba(147,51,234,0.06),_0_1px_3px_rgba(0,0,0,0.02)] flex flex-col justify-center items-center text-center">
                              <span className="text-[10px] font-extrabold text-purple-800/60 uppercase tracking-wider mb-0.5">Магний</span>
                              <span className="text-[15px] font-black text-purple-950">{magnesium !== null ? `${magnesium}мг` : "—"}</span>
                            </div>

                            <div className="bg-gradient-to-br from-[#FFF8F0] to-[#FEF0E3] rounded-2xl p-2.5 border border-white shadow-[0_6px_16px_rgba(249,115,22,0.06),_0_1px_3px_rgba(0,0,0,0.02)] flex flex-col justify-center items-center text-center">
                              <span className="text-[10px] font-extrabold text-orange-800/60 uppercase tracking-wider mb-0.5">Железо</span>
                              <span className="text-[15px] font-black text-orange-950">{iron !== null ? `${iron}мг` : "—"}</span>
                            </div>

                          </div>
                        )}

                      </div>
                    );
                  })()}

                  {/* 4. RICH INGREDIENTS & PRODUCT PASSPORT COMPONENT: УВЕЛИЧЕННЫЙ ШРИФТ И БЕЗ РАМОК */}
                  <div className="bg-slate-50 border border-slate-100 rounded-[18px] p-3 mb-4 text-left w-full shadow-xs">
                    <button
                      type="button"
                      onClick={() => setShowIngredientsList(prev => !prev)}
                      className="w-full flex justify-between items-center text-slate-700 font-bold text-[16px] tracking-tight cursor-pointer focus:outline-none"
                    >
                      <span className="flex items-center gap-1.5">
                        <Info className="w-5 h-5 text-[#2E6B47]" /> Состав, эко-оценка и теги базы
                      </span>
                      {showIngredientsList ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                    
                    <AnimatePresence>
                      {(!showIngredientsList) ? (
                        <div className="mt-2.5 flex flex-col gap-1.5">
                          {(() => {
                            const rawText = selectedProduct.ingredients_text_ru || selectedProduct.ingredients_text;
                            const ingTags = selectedProduct.ingredients_tags;
                            
                            if (rawText) {
                              return (
                                <p className="text-[14.5px] text-text-muted leading-snug line-clamp-2">
                                  {rawText}
                                </p>
                              );
                            } else if (ingTags && Array.isArray(ingTags) && ingTags.length > 0) {
                              const synthesized = ingTags.map(t => t.replace(/^[a-z]{2}:/, "")).join(", ");
                              return (
                                <p className="text-[14.5px] text-slate-700 leading-snug line-clamp-2">
                                  <span className="text-[13px] text-[#2E6B47] font-bold uppercase mr-1">Состав из тегов:</span>
                                  {synthesized}
                                </p>
                              );
                            } else {
                              return (
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                  {selectedProduct.categories && (
                                    <span className="text-[13px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md font-medium">
                                      📁 {selectedProduct.categories.split(",")[0]}
                                    </span>
                                  )}
                                  {selectedProduct.ecoscore_grade && (
                                    <span className={`text-[13px] px-2 py-0.5 rounded-md font-bold uppercase ${
                                      selectedProduct.ecoscore_grade.toLowerCase() === 'a' || selectedProduct.ecoscore_grade.toLowerCase() === 'b'
                                        ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                                    }`}>
                                      Eco-Score: {selectedProduct.ecoscore_grade.toLowerCase() === 'unknown' ? 'Неизвестно' : 
                                                 selectedProduct.ecoscore_grade.toLowerCase() === 'not-applicable' ? 'Нет данных' : 
                                                 selectedProduct.ecoscore_grade}
                                    </span>
                                  )}
                                  {selectedProduct.stores && (
                                    <span className="text-[13px] bg-blue-50 text-blue-800 px-2 py-0.5 rounded-md font-medium">
                                      🛒 {selectedProduct.stores}
                                    </span>
                                  )}
                                </div>
                              );
                            }
                          })()}
                        </div>
                      ) : (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="text-[16px] text-slate-700 mt-3 leading-relaxed bg-white p-4 rounded-xl shadow-sm border border-white font-sans flex flex-col gap-3.5">
                            
                            <div>
                              <span className="font-bold text-[#2E6B47] text-[13.5px] uppercase tracking-wide block mb-1">Ингредиенты / Компоненты:</span>
                              {(() => {
                                const rawText = selectedProduct.ingredients_text_ru || selectedProduct.ingredients_text;
                                const ingTags = selectedProduct.ingredients_tags;
                                if (rawText) return <p>{rawText}</p>;
                                if (ingTags && ingTags.length > 0) {
                                  return <p>{ingTags.map(t => t.replace(/^[a-z]{2}:/, "")).join(", ")}</p>;
                                }
                                return <p className="text-text-muted italic">Текстовый состав не заполнен волонтерами в базе OFF.</p>;
                              })()}
                            </div>

                            <div className="border-t border-slate-100 pt-3 flex flex-col gap-3">
                              <span className="font-bold text-slate-700 text-[13.5px] uppercase tracking-wide">Паспортные данные из базы:</span>
                              
                              {selectedProduct.ecoscore_grade && (
                                <div className="flex items-center justify-between text-[15px]">
                                  <span className="text-slate-500">Экологичность (Eco-Score):</span>
                                  <span className="font-bold uppercase bg-slate-100 px-3 py-1.5 rounded-lg text-slate-700 shadow-3xs">
                                    {selectedProduct.ecoscore_grade.toLowerCase() === 'unknown' ? 'Неизвестно' : 
                                     selectedProduct.ecoscore_grade.toLowerCase() === 'not-applicable' ? 'Нет данных' : 
                                     selectedProduct.ecoscore_grade}
                                  </span>
                                </div>
                              )}
                              
                              {selectedProduct.labels_tags && selectedProduct.labels_tags.length > 0 && (
                                <div className="flex flex-col gap-2 text-[15px]">
                                  <span className="text-slate-500">Сертификаты и маркировки:</span>
                                  <div className="flex flex-wrap gap-2">
                                    {selectedProduct.labels_tags.map((lbl, i) => (
                                      <span key={i} className="text-[14px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-1.5 rounded-lg font-semibold shadow-3xs">
                                        {lbl.replace(/^[a-z]{2}:/, "")}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {selectedProduct.stores && (
                                <div className="flex items-center justify-between text-[15px]">
                                  <span className="text-slate-500">Сеть магазинов:</span>
                                  <span className="font-semibold text-slate-700">{selectedProduct.stores}</span>
                                </div>
                              )}

                              {/* ЧИСТКА АДДИТИВОВ "Е" В ФОРМАТ АККУРАТНЫХ ТЕГОВ */}
                              {selectedProduct.additives_tags && selectedProduct.additives_tags.length > 0 && (
                                <div className="text-[15px] mt-1">
                                  <span className="text-slate-500 block mb-2">Пищевые добавки (Е):</span>
                                  <div className="flex flex-wrap gap-2">
                                    {selectedProduct.additives_tags.map((add, idx) => (
                                      <span key={idx} className="text-[14px] bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-1.5 rounded-lg font-bold tracking-wide shadow-3xs">
                                        {add.replace(/^[a-z]{2}:/, "").toUpperCase()}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* 5. COZY ANNA'S ANALYTICAL INSIGHT VERDICT BLOCK */}
                  {(() => {
                    const ingredients = selectedProduct.ingredients_text_ru || selectedProduct.ingredients_text || "";
                    if (!isIngredientsListValid(ingredients)) return null;

                    const verdict = getAnnasVerdict(selectedProduct);
                    const isPerfect = verdict.status === "perfect";
                    const isWarning = verdict.status === "warning";
                    const isOilSugar = verdict.status === "oil-sugar";
                    
                    let dynamicAvatarSrc = "";
                    if (isPerfect) {
                      dynamicAvatarSrc = resolveAvatar({ toneGroup: 'positive', intent: 'success' }).src;
                    } else if (isWarning) {
                      dynamicAvatarSrc = resolveAvatar({ toneGroup: 'reminder_caution', intent: 'caution' }).src;
                    } else {
                      dynamicAvatarSrc = resolveAvatar({ toneGroup: 'negative_displeasure', intent: 'irritation_and_anger' }).src;
                    }
                    
                    return (
                      <div className={`rounded-[22px] p-4.5 border text-left w-full mb-4 shadow-sm relative overflow-hidden ${
                        isPerfect 
                          ? "bg-gradient-to-tr from-[#EBF5EF] to-emerald-50/50 border-emerald-100/80" 
                          : isWarning
                            ? "bg-gradient-to-tr from-amber-50 to-orange-50/40 border-amber-100"
                            : isOilSugar
                              ? "bg-gradient-to-tr from-orange-50/70 to-red-50/30 border-orange-100"
                              : "bg-gradient-to-tr from-red-50 to-orange-50/10 border-red-100"
                      }`}>
                        
                        <div className="absolute right-[-20px] top-[-10px] w-28 h-28 opacity-10 bg-current rounded-full blur-2xl pointer-events-none" />

                        <div className="flex items-center gap-3 mb-3">
                          <div className="relative shrink-0 select-none">
                            <div className="w-[45px] h-[45px] rounded-full overflow-hidden shadow-md border border-white/60 relative bg-white">
                              <img
                                src={dynamicAvatarSrc}
                                alt="Анна — Советник WFPB"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <span className="absolute -bottom-0.5 -right-0.5 w-[12px] h-[12px] bg-[#10D150] rounded-full border-2 border-white shadow-sm flex items-center justify-center">
                              <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                            </span>
                          </div>
                          
                          <div className="flex flex-col justify-center">
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-[14px] font-black text-[#2E6B47] font-sans leading-none">
                                Анна
                              </span>
                              <span className="text-[10px] font-bold text-slate-500 leading-none font-sans uppercase tracking-wider">
                                Советник WFPB
                              </span>
                            </div>
                            <span className={`text-[15px] sm:text-[16px] font-extrabold tracking-tight mt-1.5 leading-none ${
                              isPerfect ? "text-[#1E3F20]" : isWarning ? "text-amber-900" : "text-red-900"
                            }`}>
                              {verdict.title}
                            </span>
                          </div>
                        </div>

                        <p className={`text-[15.5px] font-medium leading-relaxed font-sans opacity-95 ${
                          isPerfect ? "text-[#1E3F20]" : isWarning ? "text-amber-950" : "text-red-950"
                        }`}>
                          {verdict.text}
                        </p>
                      </div>
                    );
                  })()}

                  {/* 6. DYNAMIC BRAND ACTION BUTTONS (ПРЕМИАЛЬНЫЕ КАРТОЧКИ В ОДИН РЯД) */}
                  <div className="grid grid-cols-2 gap-3 w-full mt-4 mb-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMode("start");
                        setSelectedProduct(null);
                      }}
                      className="bg-gradient-to-br from-[#F0F5FA] to-[#E6EEF7] text-blue-900 border border-white shadow-[0_6px_16px_rgba(59,130,246,0.06),_0_1px_3px_rgba(0,0,0,0.02)] active:scale-95 px-2 py-3.5 rounded-[22px] text-center font-extrabold text-[13px] sm:text-[14px] cursor-pointer transition-all flex items-center justify-center gap-1.5 w-full outline-none select-none"
                    >
                      <Search className="w-4 h-4" /> Искать замену
                    </button>
                    
                    <button
                      type="button"
                      onClick={handleAddToShoppingList}
                      className="bg-gradient-to-br from-[#EBF5EF] to-[#E3F2E8] text-[#1E4A30] border border-white shadow-[0_6px_16px_rgba(46,107,71,0.06),_0_1px_3px_rgba(0,0,0,0.02)] active:scale-95 px-2 py-3.5 rounded-[22px] text-center font-extrabold text-[13px] sm:text-[14px] cursor-pointer transition-all flex items-center justify-center gap-1.5 w-full outline-none select-none"
                    >
                      <Plus className="w-4.5 h-4.5" /> Добавить в список
                    </button>
                  </div>

                </div>

              </motion.div>
            ) : (
              <div className="bg-white rounded-[32px] border border-amber-100 p-6 text-center shadow-md mb-5 w-full">
                <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-3 border border-amber-100">
                  <AlertTriangle className="w-7 h-7 stroke-[1.8]" />
                </div>
                <h3 className="text-[16px] font-bold text-slate-800 mb-1 font-sans">Продукт не найден в базе данных</h3>
                <p className="text-[13px] text-text-muted leading-relaxed max-w-[280px] mx-auto mb-5">
                  Штрихкод <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">{(selectedProduct as any)?.code || "введенный"}</span> отсутствует в свободной базе Open Food Facts.
                </p>

                <div className="grid grid-cols-2 gap-3 w-full mt-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setActiveMode("start")}
                    className="bg-gradient-to-br from-[#F0F5FA] to-[#E6EEF7] text-blue-900 border border-white shadow-[0_6px_16px_rgba(59,130,246,0.06),_0_1px_3px_rgba(0,0,0,0.02)] active:scale-95 px-2 py-4 rounded-[22px] text-center font-extrabold text-[14px] cursor-pointer transition-all flex items-center justify-center gap-1.5 w-full outline-none select-none"
                  >
                    Вернуться в меню
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveMode("start");
                    }}
                    className="bg-gradient-to-br from-[#EBF5EF] to-[#E3F2E8] text-[#1E4A30] border border-white shadow-[0_6px_16px_rgba(46,107,71,0.06),_0_1px_3px_rgba(0,0,0,0.02)] active:scale-95 px-2 py-4 rounded-[22px] text-center font-extrabold text-[14px] cursor-pointer transition-all flex items-center justify-center gap-1.5 w-full outline-none select-none"
                  >
                    <Search className="w-4 h-4" /> Искать текстом
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ПЛАВАЮЩАЯ КНОПКА СКАНЕРА (FAB) */}
      {activeMode === "start" && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={startCameraScan}
          className="fixed bottom-24 right-5 z-40 w-14 h-14 bg-[#2E6B47] text-white rounded-full flex items-center justify-center shadow-[0_8px_20px_rgba(46,107,71,0.3)] border-2 border-white cursor-pointer outline-none"
        >
          <Camera className="w-6 h-6" />
        </motion.button>
      )}

      {toastVisible && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[999] bg-[#F0F5FA] text-blue-900 border border-blue-100 text-[14px] font-bold px-5 py-2.5 rounded-2xl shadow-lg animate-fade-in">
          {toastMessage}
        </div>
      )}
	  
      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxImage(null)}
            className="fixed inset-0 z-[9999] bg-slate-900/95 backdrop-blur-md flex items-center justify-center px-6 py-12 cursor-zoom-out"
          >
            <button className="absolute top-6 right-6 z-50 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors">
              <X className="w-6 h-6" />
            </button>
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={lightboxImage}
              alt="Увеличенное фото"
              className="w-full h-full object-contain drop-shadow-2xl"
              referrerPolicy="no-referrer"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute bottom-0 inset-x-0 w-full z-30 pointer-events-auto">
        <BottomBar 
          onHomeClick={onBack}
          onDiaryClick={() => {}}
          onAnalyticsClick={() => {}}
          onProfileClick={() => {}}
          activeTab="my-day"
        />
      </div>

    </div>
  );
}