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
  ChevronUp
} from "lucide-react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import BottomBar from "./BottomBar";
import { resolveAvatar } from "../utils/annaAvatarResolver";
import { useAppStore } from "../store/useAppStore";
import { api } from "../utils/api";
import { clientLogger } from "../utils/clientLogger";

const annaAvatarSrc = resolveAvatar({ toneGroup: 'reminder_caution', intent: 'caution' }).src;

// Supported interface for open food facts product data
interface OFFProduct {
  code: string;
  product_name?: string;
  product_name_ru?: string;
  brands?: string;
  image_front_url?: string;
  ingredients_text?: string;
  ingredients_text_ru?: string;
  allergens?: string;
  nutrition_grades?: string;
  nova_group?: number | string;
  additives_tags?: string[];
  categories?: string;
  stores?: string;
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
    product_name_ru: "Шоколад Бабаевский горький элитный 85% какао",
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

  // Count percentage of numbers and special symbols
  const len = pruned.length;
  let digits = 0;
  let symbols = 0;
  for (let i = 0; i < len; i++) {
    const char = pruned[i];
    if (/[0-9]/.test(char)) digits++;
    else if (/[%\/*\\_\[\]+=#@<>|]/.test(char)) symbols++;
  }

  // If numbers and weird symbols take up more than 35% of the string, it's likely a nutritional table or OCR noise
  if ((digits + symbols) / len > 0.35) {
    return false;
  }

  const lowercase = pruned.toLowerCase();
  
  // If it's just a raw dump of energy values
  const isNutritionTableNoise = 
    lowercase.includes("пищевая ценность") && 
    lowercase.includes("белки") && 
    lowercase.includes("жиры") && 
    lowercase.includes("углеводы") && 
    lowercase.length < 200;
    
  if (isNutritionTableNoise) {
    return false;
  }

  // If it contains technical web patterns
  if (lowercase.includes("openfoodfacts") || lowercase.includes("http://") || lowercase.includes("https://")) {
    return false;
  }

  const words = pruned.split(/[\s,.;()]+/).filter(w => w.length > 0);
  if (words.length < 2) return false;

  // Check language mixture: if there are too many single letters, reject
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
  // Current tab or mode: "start" | "scan" | "name-search" | "result"
  const [activeMode, setActiveMode] = useState<"start" | "scan" | "name-search" | "result">("start");
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<OFFProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<OFFProduct | null>(null);
  const [manualBarcode, setManualBarcode] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);

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
  
  // Accordion details toggle inside results
  const [showIngredientsList, setShowIngredientsList] = useState(false);

  // Shopping list
  const [shoppingList, setShoppingList] = useState<PersonalShoppingItem[]>([]);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // html5-qrcode implementation states
  const [scannerActive, setScannerActive] = useState(false);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = "browser-barcode-viewport";

  // Robust scanner states using strict sequential state representation:
  // 1. "permission-prompt" - Ожидание разрешения на камеру
  // 2. "initializing"      - Запуск камеры
  // 3. "scanning"          - Активное live-сканирование barcode из видеопотока
  // 4. "scanned-success"    - Barcode найден / успешно зафиксирован
  // 5. "searching-db"       - Поиск товара в базе по считанному barcode
  // 6. "not-found"          - Товар не найден в Open Food Facts базе
  // 7. "camera-error"       - Ошибка камеры
  // 8. "temp-error"         - Временная ошибка распознавания (по таймауту/нечитаемости)
  const [scanStatus, setScanStatus] = useState<
    "permission-prompt" | "initializing" | "scanning" | "scanned-success" | "searching-db" | "not-found" | "camera-error" | "temp-error"
  >("initializing");

  const [scannedCode, setScannedCode] = useState<string | null>(null);
  
  // Keep these dummy or auxiliary variables only to avoid any breaking dependencies elsewhere
  const [scannedAttempts, setScannedAttempts] = useState<number>(0);
  const [isAligned, setIsAligned] = useState<boolean>(false);
  const [showHint, setShowHint] = useState(false);
  const timeoutRef = useRef<any>(null);
  const capturedAttemptsRef = useRef<string[]>([]);
  const lastScanTimeRef = useRef<number>(0);

  // New scanner-specific robust refs for timing, retries & locking
  const retryTimeoutRef = useRef<any>(null);
  const tempErrorTimeoutRef = useRef<any>(null);
  const startCameraAttemptsCount = useRef<number>(0);
  const hasFoundBarcodeRef = useRef<boolean>(false);

  // Stop camera scanning cleanly
  const stopScanner = async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (tempErrorTimeoutRef.current) {
      clearTimeout(tempErrorTimeoutRef.current);
      tempErrorTimeoutRef.current = null;
    }
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (err) {
        console.error("Error stopping scanner", err);
      }
    }
    setScannerActive(false);
  };

  // Cleanup scanner on unmount
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

  // Initialize camera scanner immediately trying continuous live streaming decoding
  const startCameraScan = async () => {
    setCameraError(null);
    setScanStatus("initializing");
    setScannedCode(null);
    setScannerActive(true);
    setActiveMode("scan");

    // Clean locking and timing states
    hasFoundBarcodeRef.current = false;
    
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (tempErrorTimeoutRef.current) {
      clearTimeout(tempErrorTimeoutRef.current);
      tempErrorTimeoutRef.current = null;
    }

    // After 30s of scan streaming without any decoded barcode, trigger warm troubleshoot help state ("temp-error")
    tempErrorTimeoutRef.current = setTimeout(() => {
      setScanStatus("temp-error");
    }, 30000);

    // Render viewport container briefly first before attachment
    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode(scannerContainerId, {
          // Explicit list of core product barcode Symbologies to maximize accuracy and frame decoding performance
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E
          ],
          verbose: false
        });
        html5QrCodeRef.current = html5QrCode;

        // Custom slim viewport box optimized for horizontal retail barcodes on products
        const config = {
          fps: 24, // Optimized rate for instant mobile focus locks
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
          
          // Strict duplicate lock check - instantly prevent multi-triggering of subsequent scans
          if (hasFoundBarcodeRef.current) return;
          hasFoundBarcodeRef.current = true;

          // Clear timer
          if (tempErrorTimeoutRef.current) {
            clearTimeout(tempErrorTimeoutRef.current);
            tempErrorTimeoutRef.current = null;
          }

          setScannedCode(decodedText);
          setScanStatus("scanned-success");

          // Brief delay (600ms) to let user enjoy the successful "Code Captured" visual confirmation
          setTimeout(async () => {
            setScanStatus("searching-db");
            try {
              // 0. Try offline local fallback products first
              const localMatch = LOCAL_FALLBACK_PRODUCTS.find(p => p.code === decodedText.trim());
              if (localMatch) {
                await stopScanner();
                setSelectedProduct(localMatch);
                setActiveMode("result");
                return;
              }

              // 1. Try RU db lookup
              const res = await fetch(`https://ru.openfoodfacts.org/api/v2/product/${decodedText.trim()}.json`);
              const data = await res.json();
              
              if (data && data.status === 1 && data.product) {
                await stopScanner();
                setSelectedProduct({
                  code: decodedText,
                  ...data.product
                });
                setActiveMode("result");
                return;
              } else {
                // 2. Try Global db lookup fallback
                const resGlobal = await fetch(`https://world.openfoodfacts.org/api/v2/product/${decodedText.trim()}.json`);
                const dataGlobal = await resGlobal.json();
                if (dataGlobal && dataGlobal.status === 1 && dataGlobal.product) {
                  await stopScanner();
                  setSelectedProduct({
                    code: decodedText,
                    ...dataGlobal.product
                  });
                  setActiveMode("result");
                  return;
                }
              }
            } catch (err) {
              console.warn("OpenFoodFacts lookup failed (using local or empty fallback)", err);
            }

            // Either API search crashed or nothing was found
            await stopScanner();
            setScanStatus("not-found");
          }, 600);
        };

        // Standard rear facing mobile camera selection
        let cameraToUse: MediaTrackConstraints = { facingMode: "environment", focusMode: "continuous" } as MediaTrackConstraints;
        try {
          const devices = await Html5Qrcode.getCameras();
          if (devices && devices.length > 0) {
            const rearCamera = devices.find(device => {
              const label = device.label.toLowerCase();
              return (
                label.includes("back") ||
                label.includes("rear") ||
                label.includes("основная") ||
                label.includes("задняя") ||
                label.includes("environment") ||
                label.includes("triple") ||
                label.includes("dual") ||
                label.includes("camera 0")
              );
            });
            if (rearCamera) {
              cameraToUse = { deviceId: rearCamera.id, focusMode: "continuous" } as MediaTrackConstraints;
            } else {
              cameraToUse = { deviceId: devices[0].id, focusMode: "continuous" } as MediaTrackConstraints;
            }
          }
        } catch (camListErr) {
          console.warn("Direct environment query fallback mode active...", camListErr);
        }

        try {
          await html5QrCode.start(
            cameraToUse,
            config,
            onScanSuccess,
            () => {
              // Ignore silent mismatched noise frames in live flow
            }
          );
          setScanStatus("scanning");
          startCameraAttemptsCount.current = 0; // reset retry limit upon verified starting
        } catch (startErr: any) {
          const errorMessage = startErr?.message || String(startErr);
          // Check for permission block
          const isPermissionBlocked = 
            errorMessage.toLowerCase().includes("notallowed") || 
            errorMessage.toLowerCase().includes("permission") || 
            errorMessage.toLowerCase().includes("denied");

          if (isPermissionBlocked) {
            setScanStatus("permission-prompt");
            await stopScanner();
            return;
          }

          // Non-permission general starting errors (exponential backoff retry, max 3 times)
          if (startCameraAttemptsCount.current < 3) {
            startCameraAttemptsCount.current += 1;
            const backoffDelay = startCameraAttemptsCount.current * 1000 + Math.random() * 150;
            console.warn(`Camera lock retry attempt ${startCameraAttemptsCount.current} in ${backoffDelay.toFixed(0)}ms...`);
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

  // Close scanner and return to menu
  const handleCloseScanner = () => {
    stopScanner();
    setActiveMode("start");
  };

  // Call Open Food Facts API by barcode
  const handleSearchBarcode = async (barcode: string) => {
    if (!barcode || barcode.trim() === "") return;
    setLoading(true);
    setCameraError(null);
    setActiveMode("result");
    setSelectedProduct(null);
    setShowIngredientsList(false);

    try {
      // 0. Try offline local fallback products first
      const localMatch = LOCAL_FALLBACK_PRODUCTS.find(p => p.code === barcode.trim());
      if (localMatch) {
        setSelectedProduct(localMatch);
        return;
      }

      const res = await fetch(`https://ru.openfoodfacts.org/api/v2/product/${barcode.trim()}.json`);
      const data = await res.json();
      
      if (data && data.status === 1 && data.product) {
        setSelectedProduct({
          code: barcode,
          ...data.product
        });
      } else {
        // Fallback: If not found in RU db, try Global DB 
        const resGlobal = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode.trim()}.json`);
        const dataGlobal = await resGlobal.json();
        if (dataGlobal && dataGlobal.status === 1 && dataGlobal.product) {
          setSelectedProduct({
            code: barcode,
            ...dataGlobal.product
          });
        } else {
          // Empty state: Product not found
          setSelectedProduct(null);
        }
      }
    } catch (err) {
      console.warn("Error fetching OFF product data (using empty or local fallback)", err);
      setSelectedProduct(null);
    } finally {
      setLoading(false);
    }
  };

  // Call Open Food Facts API Search by product text
  const handleSearchByName = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setSearchResults([]);

    const fetchOFF = async (q: string, isRu: boolean): Promise<OFFProduct[]> => {
      try {
        const domain = isRu ? "ru" : "world";
        const formattedQuery = encodeURIComponent(q.trim());
        const url = `https://${domain}.openfoodfacts.org/cgi/search.pl?search_terms=${formattedQuery}&search_simple=1&action=process&json=1&page_size=24`;
        const res = await fetch(url);
        if (!res.ok) return [];
        const data = await res.json();
        return data.products || [];
      } catch (err) {
        console.warn(`Fetch OFF failed for ${q} (${isRu ? "ru" : "world"}):`, err);
        return [];
      }
    };

    try {
      // 1. Clean and correct query
      const rawQuery = searchQuery.trim().toLowerCase();
      let cleanedQuery = rawQuery;
      
      // Apply spelling/clean map
      Object.entries(RussianCleanMap).forEach(([wrong, right]) => {
        cleanedQuery = cleanedQuery.replace(new RegExp(wrong, "g"), right);
      });
      
      // Gather search query variations
      const queriesToTry = [cleanedQuery];
      if (cleanedQuery !== rawQuery) {
        queriesToTry.push(rawQuery);
      }

      // Expand synonyms if we find a trigger keyword in the query
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

      // Split into partial words to allow broader matches (e.g. searching for "молоко овсяное Nemoloko")
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

      // 2. Perform concurrent fetches to both RU and Global databases
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

      // Match and add any relevant local offline fallback products immediately
      const matchedLocal = LOCAL_FALLBACK_PRODUCTS.filter(p => {
        const nameRu = (p.product_name_ru || "").toLowerCase();
        const nameEn = (p.product_name || "").toLowerCase();
        const brand = (p.brands || "").toLowerCase();
        return queriesToTry.some(q => 
          nameRu.includes(q) || nameEn.includes(q) || brand.includes(q)
        );
      });
      addProducts(matchedLocal);

      // Query the main top 2-3 terms concurrently (RU first, and also Global fallback)
      const topQueries = queriesToTry.slice(0, 3);
      const fetchPromises = topQueries.flatMap(q => [
        fetchOFF(q, true),
        fetchOFF(q, false)
      ]);

      const results = await Promise.all(fetchPromises);
      results.forEach(addProducts);

      // If results are extremely sparse, fetch the remaining words/stems
      if (allProducts.length < 5 && queriesToTry.length > 3) {
        const remainingQueries = queriesToTry.slice(3, 6);
        const fallbackPromises = remainingQueries.flatMap(q => [
          fetchOFF(q, true),
          fetchOFF(q, false)
        ]);
        const fallbackResults = await Promise.all(fallbackPromises);
        fallbackResults.forEach(addProducts);
      }

      // 3. Score results for maximum relevant matching (Russian title, matching full query words, image availability)
      const searchWords = cleanedQuery.split(/\s+/);
      const scoredProducts = allProducts.map(p => {
        let score = 0;
        const nameRu = (p.product_name_ru || "").toLowerCase();
        const nameEn = (p.product_name || "").toLowerCase();
        const brand = (p.brands || "").toLowerCase();

        // Exact cleaned query match
        if (nameRu.includes(cleanedQuery) || nameEn.includes(cleanedQuery)) {
          score += 200;
        }

        // Substring matches for individual words
        searchWords.forEach(word => {
          if (nameRu.includes(word)) score += 40;
          if (nameEn.includes(word)) score += 20;
          if (brand.includes(word)) score += 10;
        });

        // Small bonus for Russian name presence
        if (p.product_name_ru) score += 30;

        // Bonus for having image
        if (p.image_front_url) score += 20;

        // Bonus for readable ingredients list
        const ingredients = p.ingredients_text_ru || p.ingredients_text;
        if (ingredients && isIngredientsListValid(ingredients)) {
          score += 15;
        }

        return { product: p, score };
      });

      // Sort descending by score
      scoredProducts.sort((a, b) => b.score - a.score);
      setSearchResults(scoredProducts.map(sp => sp.product));

    } catch (err) {
      console.warn("Search warning inside handleSearchByName", err);
    } finally {
      setLoading(false);
    }
  };

  // Generate healthy coaching advice from Anna based on composition
  const getAnnasVerdict = (product: OFFProduct) => {
    const ingredients = (product.ingredients_text_ru || product.ingredients_text || "").toLowerCase();
    
    // 1. Identify specific animal ingredients
    const foundAnimalIngredients: string[] = [];
    
    const dairyTerms = ["молоко", "молочн", "сухое молоко", "сливки", "сыворотка", "казеин", "лактоза", "масло сливоч", "йогурт", "сыр", "творог", "сметана"];
    dairyTerms.forEach(term => {
      if (ingredients.includes(term)) {
        if (term === "молоко" && !foundAnimalIngredients.includes("молоко")) foundAnimalIngredients.push("молоко");
        else if (term === "сухое молоко" && !foundAnimalIngredients.includes("сухое молоко")) foundAnimalIngredients.push("сухое молоко");
        else if (term === "сливки" && !foundAnimalIngredients.includes("сливки")) foundAnimalIngredients.push("сливки");
        else if (term === "сыворотка" && !foundAnimalIngredients.includes("молочная сыворотка")) foundAnimalIngredients.push("молочная сыворотка");
        else if (term === "казеин" && !foundAnimalIngredients.includes("казеин")) foundAnimalIngredients.push("казеин");
        else if (term === "лактоза" && !foundAnimalIngredients.includes("лактоза")) foundAnimalIngredients.push("лактоза");
        else if (term === "масло сливоч" && !foundAnimalIngredients.includes("сливочное масло")) foundAnimalIngredients.push("сливочное масло");
        else if (term === "сыр" && !foundAnimalIngredients.includes("сыр")) foundAnimalIngredients.push("сыр");
        else if (term === "творог" && !foundAnimalIngredients.includes("творог")) foundAnimalIngredients.push("творог");
      }
    });

    if (ingredients.includes("яйц") || ingredients.includes("яичн") || ingredients.includes("меланж")) {
      foundAnimalIngredients.push("яйца/яичные продукты");
    }

    const meatTerms = ["мясо", "куриц", "говяд", "свинин", "птиц", "индейк", "рыб", "шпик", "сало", "бульон мяс", "желатин"];
    meatTerms.forEach(term => {
      if (ingredients.includes(term)) {
        if (term === "рыб" && !foundAnimalIngredients.includes("рыбные продукты")) foundAnimalIngredients.push("рыбные продукты");
        else if (term === "желатин" && !foundAnimalIngredients.includes("желатин")) foundAnimalIngredients.push("желатин");
        else if (!foundAnimalIngredients.includes("мясные компоненты")) {
          foundAnimalIngredients.push("животные жиры или мясо");
        }
      }
    });

    if (ingredients.includes("мед") || ingredients.includes("мёд")) {
      foundAnimalIngredients.push("мёд");
    }

    const isAnimal = foundAnimalIngredients.length > 0;

    // 2. Identify refined oils
    const foundOils: string[] = [];
    const oilTerms = ["подсолнеч", "пальм", "рапс", "кокос", "соев", "растительное масло", "рафинирован"];
    oilTerms.forEach(term => {
      if (ingredients.includes(term)) {
        if (term === "пальм" && !foundOils.includes("пальмовое масло")) foundOils.push("пальмовое масло");
        else if (term === "рапс" && !foundOils.includes("рапсовое масло")) foundOils.push("рапсовое масло");
        else if (term === "кокос" && !foundOils.includes("кокосовое масло")) foundOils.push("кокосовое масло");
        else if (term === "подсолнеч" && !foundOils.includes("подсолнечное масло")) foundOils.push("подсолнечное масло");
        else if (!foundOils.includes("рафинированное растительное масло")) foundOils.push("рафинированное масло");
      }
    });
    const hasRefinedOils = foundOils.length > 0;

    // 3. Identify sugars and syrups
    const foundSugars: string[] = [];
    const sugarTerms = ["сахар", "фруктоз", "глюкоз", "сахароз", "сироп", "мальтодекстрин"];
    sugarTerms.forEach(term => {
      if (ingredients.includes(term)) {
        if (term === "сахар" && !foundSugars.includes("сахар")) foundSugars.push("добавленный сахар");
        else if (term === "сироп" && !foundSugars.includes("глюкозный или фруктозный сироп")) foundSugars.push("подслащивающий сироп");
        else if (term === "мальтодекстрин" && !foundSugars.includes("мальтодекстрин")) foundSugars.push("мальтодекстрин");
        else if (!foundSugars.includes("изолированные сахара")) foundSugars.push("простые сахара");
      }
    });
    const hasSugar = foundSugars.length > 0;

    // 4. Identify salt
    const hasSalt = ingredients.includes("соль");

    // 5. Identify chemical additives
    const foundAdditives: string[] = [];
    const additiveTerms = ["глутамат", "ароматизатор", "краситель", "консервант", "стабилизатор", "эмульгатор", "е-", " e-", "кислота лимонная", "лецитин"];
    additiveTerms.forEach(term => {
      if (ingredients.includes(term)) {
        if (term === "ароматизатор" && !foundAdditives.includes("ароматизаторы")) foundAdditives.push("ароматизаторы");
        else if (term === "консервант" && !foundAdditives.includes("консерванты")) foundAdditives.push("консерванты");
        else if (term === "эмульгатор" && !foundAdditives.includes("эмульгаторы")) foundAdditives.push("эмульгаторы");
        else if (term === "стабилизатор" && !foundAdditives.includes("стабилизаторы")) foundAdditives.push("стабилизаторы");
        else if (term === "глутамат" && !foundAdditives.includes("усилители вкуса")) foundAdditives.push("усилители вкуса");
      }
    });
    const hasHeavyAdditives = foundAdditives.length > 0 || product.nova_group === 4;

    if (isAnimal) {
      const listStr = foundAnimalIngredients.join(", ");
      return {
        status: "bad" as const,
        title: "Продукт животного происхождения",
        text: `В составе обнаружены компоненты животного происхождения: ${listStr}. Наша система здорового питания «Всё дело в еде!» полностью исключает животные белки и жиры для сохранения эластичности сосудов и поддержки чистой микробиоты. Пожалуйста, выберите альтернативу на 100% растительной основе.`
      };
    }

    if (hasRefinedOils && hasSugar) {
      const oilsStr = foundOils.join(", ");
      const sugarsStr = foundSugars.join(", ");
      return {
        status: "bad" as const,
        title: "Рафинированные жиры и сахар",
        text: `В составе одновременно присутствуют рафинированные жиры (${oilsStr}) и добавленный сахар (${sugarsStr}). Такое сочетание изолированных калорий перегружает поджелудочную железу и провоцирует скрытые воспаления. Рекомендую заменить этот продукт цельными злаками, фруктами или орехами.`
      };
    }

    if (hasRefinedOils) {
      const oilsStr = foundOils.join(", ");
      return {
        status: "oil-sugar" as const,
        title: "Содержит рафинированные масла",
        text: `В составе присутствует изолированное масло: ${oilsStr}. Согласно правилам WFPB, мы бережём стенки артерий и рекомендуем получать жиры только в их природной оболочке — из семечек, орехов, авокадо, льна или чиа, где они связаны с клетчаткой.`
      };
    }

    if (hasSugar) {
      const sugarsStr = foundSugars.join(", ");
      return {
        status: "oil-sugar" as const,
        title: "Содержит добавленный сахар",
        text: `В списке ингредиентов замечен рафинированный подсластитель: ${sugarsStr}. Быстрые изолированные сахара провоцируют резкие инсулиновые колебания. Старайтесь выбирать продукты со сладостью от цельных фиников, кураги или спелых фруктов.`
      };
    }

    if (hasHeavyAdditives) {
      const addStr = foundAdditives.length > 0 ? foundAdditives.join(", ") : "технологические добавки ультра-обработки";
      return {
        status: "warning" as const,
        title: "Высокая степень обработки",
        text: `Полностью растительный продукт, однако содержит добавленные компоненты глубокой обработки (${addStr}). Это допустимо как редкое компромиссное решение в пути, но для регулярного рациона лучше отдавать предпочтение минимально обработанным цельным продуктам.`
      };
    }

    if (hasSalt) {
      return {
        status: "warning" as const,
        title: "Присутствует добавленная соль",
        text: "Состав растительный и достаточно простой, но содержит добавленную соль. Избыток натрия задерживает межклеточную влагу и повышает нагрузку на миокард. Попробуйте употреблять этот продукт умеренно или заменить безсолевым аналогом."
      };
    }

    // Cleaned-ingredients based formulation
    const cleanedIngredientsList = ingredients.split(/[,.;()]+/);
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
      text: `Превосходный выбор! Перед нами абсолютно натуральный продукт ${ingredientsMention}, не содержащий добавленной соли, сахара, рафинированных масел и избыточной химии. Ваши клетки получат чистую пользу, пищевые волокна и ценные нутриенты. Полное одобрение Анны! 🌱💚`
    };
  };

  // Map local verdict status to DB verdictStatus
  function mapVerdictStatus(status: "perfect" | "warning" | "oil-sugar" | "bad"): "green" | "orange" | "red" {
    switch (status) {
      case "perfect": return "green";
      case "warning": return "orange";
      case "oil-sugar":
      case "bad":     return "red";
    }
  }

  // Add current selected product to shopping list
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

    setShoppingList(prev => [newItem, ...prev]);

    // Show toast and go back
    setToastMessage("Добавлено в список!");
    setToastVisible(true);
    setTimeout(() => { setToastVisible(false); setActiveMode("start"); setSelectedProduct(null); }, 1200);

    // Persist shopping item to DB (fire-and-forget)
    api("/api/shopping-list", {
      method: "POST",
      body: {
        barcode: newItem.barcode || null,
        name: newItem.name,
        brand: newItem.brand || null,
        imageUrl: newItem.image || null,
        verdictStatus,
      },
    }).then((res: any) => {
      // Update local id with server UUID for future PATCH/DELETE
      if (res?.id) {
        setShoppingList(prev => prev.map(item =>
          item.id === newItem.id ? { ...item, id: res.id } : item
        ));
      }
    }).catch(() => {});
  };

  // Toggle item check status
  const handleToggleItem = (itemId: string) => {
    setShoppingList(prev => prev.map(item =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    ));
    // Sync to DB (fire-and-forget)
    api("/api/shopping-list/" + encodeURIComponent(itemId), {
      method: "PATCH",
      body: { checked: !shoppingList.find(i => i.id === itemId)?.checked },
    }).catch(() => {});
  };

  // Remove item from shopping list
  const handleRemoveItem = (itemId: string) => {
    setShoppingList(prev => prev.filter(item => item.id !== itemId));
    // Sync to DB (fire-and-forget)
    api("/api/shopping-list/" + encodeURIComponent(itemId), {
      method: "DELETE",
    }).catch(() => {});
  };

  // Reset entire shopping list
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
            onClick={onBack}
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
          <p className="text-[13.5px] text-text-muted font-medium leading-tight">
            Проверяй продукты и собирай список осознанно
          </p>
        </div>

        {/* ================= MODE: SCANNING (REAL DEVICE CAMERA WITH HTML5) ================= */}
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
                {/* HTML5 Video output slot (only when initialized, camera is loaded) */}
                <div id={scannerContainerId} className="absolute inset-0 w-full h-full object-cover [&_video]:object-cover [&_video]:w-full [&_video]:h-full" />
                
                {/* Dark overlay with blur for specific non-scanning/checking views to focus eyes */}
                {scanStatus !== "scanning" && scanStatus !== "temp-error" && (
                  <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-[2px] z-5 transition-all" />
                )}

                {/* 1. STATE: PERMISSION PROMPT VIEW */}
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

                {/* 2. STATE: INITIALIZING VIEW */}
                {scanStatus === "initializing" && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center p-4 text-white">
                    <Loader2 className="w-7 h-7 text-[#7BBE8A] animate-spin mb-2" />
                    <span className="text-[13px] font-semibold text-slate-200">Инициализация видеопотока...</span>
                    <span className="text-[10px] text-slate-400 mt-1">Обычно это занимает не больше секунды</span>
                  </div>
                )}

                {/* 3. SCANNERS VIEWFINDER FRAME (Only showing during active camera streams) */}
                {(scanStatus === "scanning" || scanStatus === "temp-error" || scanStatus === "scanned-success") && (
                  <div className={`absolute w-[82%] h-[35%] border rounded-[12px] z-10 flex flex-col items-center justify-center transition-all duration-300 pointer-events-none ${
                    scanStatus === "scanned-success"
                      ? "border-[#7BBE8A] bg-[#7BBE8A]/10 shadow-[0_0_15px_rgba(123,190,138,0.5)]"
                      : "border-white/30 bg-transparent"
                  }`} id="barcode-scan-frame">
                    
                    {/* Viewfinder brackets inside the scan frame to suggest correct alignment direction */}
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
                      /* Active scan laser guiding bar - styled nicely in our accent red/amber/green shades */
                      <div className={`w-[92%] h-[1.5px] transition-all duration-300 bg-[#7BBE8A] shadow-[0_0_8px_#7BBE8A] animate-pulse`} />
                    )}
                  </div>
                )}

                {/* 4. STATE: SCANNED SUCCESS VIEW OVERLAY */}
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

                {/* 5. STATE: SEARCHING DATABASE STATE OVERLAY */}
                {scanStatus === "searching-db" && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-white pointer-events-none">
                    <Loader2 className="w-8 h-8 text-[#7BBE8A] animate-spin mb-2" />
                    <span className="text-[13px] font-medium tracking-tight text-slate-100 bg-slate-900/85 px-3.5 py-1.5 rounded-full border border-white/5 shadow-md text-center animate-pulse">
                      Сверка состава в Open Food Facts...
                    </span>
                  </div>
                )}

                {/* 6. STATE: PRODUCT NOT FOUND OVERLAY */}
                {scanStatus === "not-found" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center z-20 text-white p-4">
                    <div className="w-9 h-9 rounded-full bg-amber-500/15 border border-amber-500 text-[#D8A85F] flex items-center justify-center mb-2">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <span className="text-[13px] font-bold text-amber-200 tracking-tight text-center leading-tight mb-1 bg-slate-950/70 px-3 py-1 rounded-lg border border-amber-500/10">
                      Товар отсутствует в реестре
                    </span>
                    <span className="text-[10px] text-slate-450 font-mono bg-slate-950/40 px-2 py-0.5 rounded">
                      Код: {scannedCode}
                    </span>
                  </div>
                )}

                {/* 7. STATE: SYSTEM CAMERA STARTUP ERROR OVERLAY */}
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

                {/* Bottom viewfinder HUD prompt */}
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

              {/* Dynamic Anna's Coaching Dialog block */}
              <div className="bg-[#FBFAF7] border border-[#E6E1D7] rounded-[22px] p-3.5 flex items-start gap-3 text-left mt-3.5 relative overflow-hidden shadow-xs" id="annas-scan-advice">
                {/* Visual ambient warm green light ray */}
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

              {/* ACTION MODULE AFTER ERROR ENCOUNTERED ("not-found", "camera-error" or "temp-error") */}
              {(scanStatus === "not-found" || scanStatus === "camera-error" || scanStatus === "temp-error") && (
                <div className="mt-3.5 p-3.5 bg-[#F6F4EE] rounded-[20px] border border-[#E6E1D7] flex flex-col gap-2.5 w-full">
                  <span className="text-[12px] font-bold text-[#263326] leading-none">Быстрые действия:</span>
                  <div className="grid grid-cols-2 gap-2">
                    {scanStatus !== "camera-error" && (
                      <button
                        type="button"
                        onClick={() => {
                          startCameraScan();
                        }}
                        className="bg-[#2E6B47] hover:bg-[#1f4c31] text-white rounded-xl py-2 px-3 text-center font-bold text-[11px] tracking-tight transition-all active:scale-95 cursor-pointer"
                      >
                        Повторить сканирование
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        stopScanner();
                        setActiveMode("name-search");
                        setSearchQuery("");
                        setSearchResults([]);
                      }}
                      className="bg-white border border-[#E6E1D7] hover:bg-slate-50 text-[#263326] rounded-xl py-2 px-3 text-center font-bold text-[11px] tracking-tight transition-all active:scale-95 cursor-pointer"
                    >
                      Искать по названию
                    </button>
                    {scanStatus === "camera-error" && (
                      <button
                        type="button"
                        onClick={() => {
                          startCameraScan();
                        }}
                        className="bg-[#2E6B47] hover:bg-[#1f4c31] text-white rounded-xl py-2 px-3 text-center font-bold text-[11px] tracking-tight transition-all active:scale-95 cursor-pointer"
                      >
                        Перезагрузить камеру
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* MANUAL BARCODE INPUT FALLBACK */}
              <div className="border-t border-[#E6E1D7] pt-3.5 mt-3.5 w-full">
                <span className="text-[12px] font-bold text-[#667064] block mb-1.5">Не считывается? Введите штрихкод руками:</span>
                <div className="flex gap-1.5">
                  <input 
                    type="text" 
                    placeholder="Пример: 4600676008688"
                    value={manualBarcode}
                    onChange={(e) => setManualBarcode(e.target.value.replace(/\D/g, ""))}
                    className="flex-1 outline-none text-[13.5px] px-3 py-1.5 bg-[#FBFAF7] border border-[#E6E1D7] rounded-xl focus:border-[#2E6B47]/60 font-mono transition-all text-[#263326]"
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      if (manualBarcode.trim()) {
                        stopScanner();
                        handleSearchBarcode(manualBarcode);
                      }
                    }}
                    className="bg-[#2E6B47] hover:bg-[#1F4C31] text-white px-4 py-1.5 rounded-xl font-bold text-[13px] tracking-tight cursor-pointer transition-all active:scale-95"
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
          <div className="flex flex-col gap-3.5 mb-5 w-full">
            
            {/* Visual Two Actions Premium Cards row/stack */}
            <div className="grid grid-cols-2 gap-3.5 mt-1">
              
              {/* BRAND CARD 1: CAMERA SCANNER (HIGHER ACCENT) */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={startCameraScan}
                className="flex flex-col items-start justify-between bg-gradient-to-b from-[#2E6B47] via-[#1F4C31] to-[#143420] text-white rounded-[26px] p-4 text-left border-t border-white/20 shadow-[inset_0_2px_4px_rgba(255,255,255,0.35),_inset_0_-2.5px_4px_rgba(0,0,0,0.18),_0_8px_18px_rgba(31,76,49,0.18)] active:brightness-95 transition-all outline-none cursor-pointer h-36"
              >
                <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white shrink-0 shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)]">
                  <Camera className="w-5 h-5 text-white" />
                </div>
                <div className="flex flex-col mt-3 text-left">
                  <span className="text-[15px] font-bold tracking-tight leading-none font-sans">
                    Сканировать
                  </span>
                  <span className="text-[10px] opacity-75 font-semibold mt-1 leading-normal font-sans">
                    штрихкод через камеру телефона
                  </span>
                </div>
              </motion.button>

              {/* BRAND CARD 2: SEARCH BY TEXT */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setActiveMode("name-search")}
                className="flex flex-col items-start justify-between bg-gradient-to-b from-white via-slate-50 to-slate-100 text-[#2E6B47] rounded-[26px] p-4 text-left border border-slate-100 shadow-[inset_0_2px_4px_rgba(255,255,255,0.9),_inset_0_-2px_4px_rgba(30,30,30,0.02),_0_8px_18px_rgba(0,0,0,0.03)] active:brightness-98 transition-all outline-none cursor-pointer h-36"
              >
                <div className="w-10 h-10 rounded-full bg-[#EBF5EF] flex items-center justify-center text-[#2E6B47] shrink-0 border border-emerald-50">
                  <Search className="w-5 h-5 text-[#2E6B47]" />
                </div>
                <div className="flex flex-col mt-3 text-left">
                  <span className="text-[15px] font-bold tracking-tight leading-none font-sans text-slate-800">
                    Найти по имени
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold mt-1 leading-normal font-sans">
                    ручной поиск продуктов в базе данных
                  </span>
                </div>
              </motion.button>
            </div>

            {/* ERROR AND CAMERA PERMISSION ALERTS */}
            {cameraError && (
              <div className="bg-amber-50 rounded-[18px] border border-amber-100 p-3 text-amber-900 text-[12.5px] leading-tight flex items-start gap-2.5">
                <AlertTriangle className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1 flex flex-col gap-1 text-left">
                  <span className="font-bold">Доступ ограничен</span>
                  <span>{cameraError} Приложение автоматически переключилось в режим ручного поиска. Вы можете ввести номер штрихкода руками.</span>
                  <div className="flex gap-2.5 mt-1.5">
                    <button 
                      type="button"
                      onClick={() => {
                        setCameraError(null);
                        setManualBarcode("");
                        setActiveMode("name-search");
                      }}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] uppercase tracking-wide px-3 py-1 rounded-lg transition-all"
                    >
                      Ручной поиск
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        setCameraError(null);
                      }}
                      className="text-amber-700 underline font-semibold text-[11px]"
                    >
                      Скрыть
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* DEMONSTRATION POPULAR BARCODES BLOCK - VERY CONVENIENT FOR DESKTOP OR TESTERS */}
            <div className="bg-white rounded-[24px] border border-slate-100 shadow-[0_4px_12px_rgba(0,0,0,0.015)] p-4 text-left w-full">
              <div className="flex items-center gap-1.5 mb-2.5">
                <Sparkles className="w-4 h-4 text-[#16B551]" />
                <span className="text-[13px] font-extrabold text-slate-700 font-sans tracking-tight">Быстрый тест без камеры (популярно)</span>
              </div>
              <p className="text-[11.5px] text-text-muted leading-tight mb-3">
                Нажмите на любой товар ниже, чтобы протестировать распознавание состава и вердикт Анны по штрихкоду на лету:
              </p>
              <div className="flex flex-col gap-2">
                {SAMPLE_BARCODES.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSearchBarcode(sample.code)}
                    className="flex justify-between items-center text-left bg-slate-50 hover:bg-[#EBF5EF] hover:border-emerald-100 border border-slate-100 p-2.5 rounded-[14px] transition-all cursor-pointer active:scale-98 group"
                  >
                    <div className="flex flex-col">
                      <span className="text-[12.5px] font-bold text-slate-700 leading-none group-hover:text-[#2E6B47] transition-colors">{sample.name}</span>
                      <span className="text-[10px] text-text-muted leading-none mt-1 font-mono font-bold tracking-tight">{sample.code}</span>
                    </div>
                    <span className="text-[10.5px] font-semibold text-[#2E6B47] opacity-80 group-hover:opacity-100 transition-all flex items-center gap-0.5 shrink-0 bg-white group-hover:bg-emerald-50 px-2 py-1 rounded-lg border border-slate-150/40">
                      Тест <RefreshCw className="w-3 h-3 text-[#16B551] animate-spin-slow" />
                    </span>
                  </button>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ================= MODE: NAME SEARCH GRID & LIST RESULTS ================= */}
        {activeMode === "name-search" && (
          <div className="flex flex-col gap-3.5 mb-5 w-full">
            {/* Search Input text box */}
            <div className="bg-white rounded-[22px] border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.015)] p-2">
              <div className="flex gap-2">
                <div className="flex-1 flex items-center bg-slate-50 border border-slate-100 rounded-xl px-2.5 py-1.5">
                  <Search className="w-4 h-4 text-slate-400 shrink-0 mr-2" />
                  <input 
                    type="text" 
                    placeholder="Искать: Nemoloko, овсянка, хлебцы..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearchByName()}
                    className="w-full bg-transparent border-none outline-none text-[14px] text-slate-700"
                  />
                  {searchQuery && (
                    <button 
                      type="button" 
                      onClick={() => setSearchQuery("")}
                      className="text-slate-400 hover:text-slate-600 transition-colors p-0.5 rounded-full hover:bg-slate-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <button 
                  type="button"
                  onClick={handleSearchByName}
                  className="bg-[#2E6B47] hover:bg-[#1F4C31] text-white px-5 py-2 rounded-xl font-bold text-[13px] tracking-tight cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
                >
                  Найти
                </button>
              </div>
            </div>

            {/* Back to normal view link */}
            <div className="flex justify-between items-center px-1">
              <button 
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSearchResults([]);
                  setActiveMode("start");
                }}
                className="text-slate-500 hover:text-[#2E6B47] font-semibold text-[12.5px] transition-colors flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" /> Назад в меню
              </button>
              <span className="text-[11px] font-bold text-text-muted font-mono bg-slate-100 px-2 py-0.5 rounded-md">
                Найдено: {searchResults.length}
              </span>
            </div>

            {/* Search items listing */}
            {searchResults.length > 0 ? (
              <div className="flex flex-col gap-2.5 max-h-[360px] overflow-y-auto pr-1">
                {searchResults.map((prod, idx) => {
                  const hasFrontImage = !!prod.image_front_url;
                  return (
                    <div
                      key={idx}
                      className="bg-white rounded-[18px] border border-slate-100 p-2.5 shadow-sm flex items-center justify-between text-left group hover:border-emerald-100 transition-all duration-300"
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-1.5">
                        {hasFrontImage ? (
                          <img 
                            src={prod.image_front_url} 
                            alt={prod.product_name_ru || prod.product_name || "Продукт"}
                            className="w-12 h-12 rounded-xl object-contain bg-slate-50 p-0.5 border border-slate-100 border-dashed shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 border-dashed flex items-center justify-center text-slate-300 shrink-0 font-sans text-[9px] font-extrabold uppercase">
                            НЕТ ФОТО
                          </div>
                        )}
                        <div className="flex flex-col min-w-0">
                          <span className="text-[13.5px] font-bold text-slate-800 leading-tight truncate">
                            {prod.product_name_ru || prod.product_name || "Без названия"}
                          </span>
                          <span className="text-[11px] text-slate-500 leading-none truncate mt-0.5 font-sans">
                            {prod.brands || "Неизвестный бренд"}
                          </span>
                          
                          {/* Quick details chips */}
                          <div className="flex gap-1.5 mt-1 items-center">
                            {prod.nutrition_grades && (
                              <span className={`text-[9.5px] font-extrabold uppercase px-1.5 py-0.5 rounded-sm line-none ${
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
                              <span className="text-[9.5px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded-sm">
                                Nova {prod.nova_group}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProduct(prod);
                          setActiveMode("result");
                        }}
                        className="bg-[#EBF5EF] hover:bg-[#2E6B47] text-[#2E6B47] hover:text-white px-3.5 py-2 rounded-xl text-[12px] font-extrabold tracking-tight cursor-pointer transition-all active:scale-95 shrink-0"
                      >
                        Открыть
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              searchQuery && !loading && (
                <div className="bg-white rounded-[22px] border border-slate-100 p-6 text-center shadow-sm">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                    <Info className="w-6 h-6 stroke-[1.8]" />
                  </div>
                  <span className="text-[14.5px] font-bold text-slate-700 block mb-1">Ничего не найдено</span>
                  <span className="text-[12px] text-text-muted max-w-[250px] mx-auto block leading-normal">
                    База Open Food Facts не вернула результатов. Попробуйте ввести более общее название товара или проверьте орфографию.
                  </span>
                </div>
              )
            )}

          </div>
        )}

        {/* ================= LOADING PULSING ANIMATION STATE ================= */}
        {loading && (
          <div className="bg-white rounded-[32px] border border-slate-100/80 shadow-md p-10 text-center mb-5 w-full">
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
                
                {/* Back to search or start corner Button overlay */}
                <div className="absolute top-3 right-3 z-20">
                  <button 
                    type="button" 
                    onClick={() => {
                      if (searchResults.length > 0) {
                        setActiveMode("name-search");
                      } else {
                        setActiveMode("start");
                      }
                      setSelectedProduct(null);
                    }}
                    className="w-8 h-8 rounded-full bg-slate-900/60 hover:bg-slate-900 text-white flex items-center justify-center backdrop-blur-md shadow-xs transition-colors cursor-pointer active:scale-90"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* 1. LARGE ROUNDED PRODUCT CONTAINER PHOTO */}
                <div className="w-full h-44 bg-[#F8FAFC] relative flex items-center justify-center p-3 border-b border-dashed border-slate-100">
                  {selectedProduct.image_front_url ? (
                    <img 
                      src={selectedProduct.image_front_url} 
                      alt={selectedProduct.product_name_ru || selectedProduct.product_name || "Фото продукта"} 
                      className="h-full object-contain mix-blend-multiply drop-shadow-sm select-none"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-300">
                      <ShoppingBag className="w-12 h-12 stroke-[1.2] mb-1.5 text-slate-300" />
                      <span className="text-[10px] font-extrabold uppercase tracking-widest bg-slate-100 px-2.5 py-1 rounded-full text-slate-400">
                        Изображение отсутствует
                      </span>
                    </div>
                  )}

                  {/* Absolute subtle WFPB Badge info */}
                  <div className="absolute bottom-3 left-3 bg-[#EBF5EF] px-2.5 py-1 rounded-lg border border-emerald-50">
                    <span className="text-[9px] font-extrabold uppercase text-[#2E6B47] tracking-wider font-sans">
                      Open Food Facts
                    </span>
                  </div>
                </div>

                {/* 2. PRODUCT NAME & BRAND TEXT LIST */}
                <div className="p-4 pt-3 w-full">
                  <div className="flex flex-col text-left mb-3">
                    <span className="text-[18px] font-bold text-slate-800 leading-tight">
                      {selectedProduct.product_name_ru || selectedProduct.product_name || "Продукт по штрихкоду"}
                    </span>
                    <span className="text-[12.5px] text-slate-500 font-medium leading-none mt-1">
                      {selectedProduct.brands || "Бренд не указан"}
                    </span>
                  </div>

                  {/* 3. QUICK SYSTEMIC WELLNESS CHIPS/BADGES BLOCK */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {/* NUTRI-SCORE CHIP */}
                    {selectedProduct.nutrition_grades && (
                      <div className={`px-2 py-1 rounded-xl flex items-center gap-1.5 border text-[11px] font-bold ${
                        selectedProduct.nutrition_grades.toLowerCase() === "a" || selectedProduct.nutrition_grades.toLowerCase() === "b"
                          ? "bg-green-50 border-green-100 text-green-700"
                          : selectedProduct.nutrition_grades.toLowerCase() === "c"
                            ? "bg-amber-50 border-amber-100 text-amber-700"
                            : "bg-red-50 border-red-100 text-red-700"
                      }`}>
                        <span className="font-extrabold uppercase">Nutri-Score</span>
                        <span className="text-[13px] uppercase tracking-none shrink-0 font-black">
                          {selectedProduct.nutrition_grades}
                        </span>
                      </div>
                    )}

                    {/* NOVA CHIP */}
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
                          {selectedProduct.nova_group}
                        </span>
                      </div>
                    )}

                    {/* Categories tag or custom WFPB label */}
                    <div className="px-2 py-1 rounded-xl bg-[#F0F5FA] border border-slate-100 text-slate-600 text-[11px] font-bold flex items-center gap-1">
                      <span>Штрихкод:</span>
                      <span className="font-mono">{selectedProduct.code}</span>
                    </div>
                  </div>

                  {/* 4. REAL INGREDIENTS BODY ACCORDION COMPONENT */}
                  <div className="bg-slate-50 border border-slate-100 rounded-[18px] p-3 mb-4 text-left w-full">
                    <button
                      type="button"
                      onClick={() => setShowIngredientsList(prev => !prev)}
                      className="w-full flex justify-between items-center text-slate-700 font-bold text-[13px] tracking-tight cursor-pointer focus:outline-none"
                    >
                      <span className="flex items-center gap-1.5">
                        <Info className="w-4 h-4 text-slate-500" /> Ингредиенты в составе
                      </span>
                      {showIngredientsList ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    
                    <AnimatePresence>
                      {(!showIngredientsList) ? (
                        <p className="text-[11.5px] text-text-muted mt-1.5 leading-snug line-clamp-2">
                          {selectedProduct.ingredients_text_ru || selectedProduct.ingredients_text || "Текст состава недоступен во внешнем справочнике."}
                        </p>
                      ) : (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <p className="text-[12px] text-slate-600 mt-2 leading-relaxed bg-white p-2.5 rounded-xl border border-dotted border-slate-250/60 font-sans">
                            {selectedProduct.ingredients_text_ru || selectedProduct.ingredients_text || "Текст состава отсутствует."}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* 5. COZY ANNA'S ANALYTICAL INSIGHT VERDICT BLOCK (PREMIUM HEALTH COACHING) */}
                  {(() => {
                    const ingredients = selectedProduct.ingredients_text_ru || selectedProduct.ingredients_text || "";
                    if (!isIngredientsListValid(ingredients)) return null;

                    const verdict = getAnnasVerdict(selectedProduct);
                    const isPerfect = verdict.status === "perfect";
                    const isWarning = verdict.status === "warning";
                    const isOilSugar = verdict.status === "oil-sugar";
                    
                    return (
                      <div className={`rounded-[22px] p-4.5 border text-left w-full mb-4 shadow-3xs relative overflow-hidden ${
                        isPerfect 
                          ? "bg-gradient-to-tr from-[#EBF5EF] to-emerald-50/50 border-emerald-100/80 text-[#1E3F20]" 
                          : isWarning
                            ? "bg-gradient-to-tr from-amber-50 to-orange-50/40 border-amber-100 text-amber-900"
                            : isOilSugar
                              ? "bg-gradient-to-tr from-orange-50/70 to-red-50/30 border-orange-100 text-amber-900"
                              : "bg-gradient-to-tr from-red-50 to-orange-50/10 border-red-100 text-red-950"
                      }`}>
                        
                        {/* Shimmer background layout */}
                        <div className="absolute right-[-20px] top-[-10px] w-28 h-28 opacity-10 bg-[#2E6B47]/20 rounded-full blur-2xl pointer-events-none" />

                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-3xs ${
                            isPerfect 
                              ? "bg-[#2E6B47] text-white" 
                              : isWarning || isOilSugar
                                ? "bg-amber-500 text-white"
                                : "bg-red-500 text-white"
                          }`}>
                            <Sparkles className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col text-left">
                            <span className="text-[11px] uppercase tracking-widest font-extrabold opacity-75 font-sans leading-none">Вердикт Анны</span>
                            <span className="text-[14px] font-extrabold tracking-tight mt-0.5 leading-none">
                              {verdict.title}
                            </span>
                          </div>
                        </div>

                        <p className="text-[12.8px] leading-relaxed font-sans opacity-95">
                          {verdict.text}
                        </p>
                      </div>
                    );
                  })()}

                  {/* 6. DYNAMIC BRAND ACTION BUTTONS */}
                  <div className="flex flex-col gap-2 w-full mt-2">
                    <button
                      type="button"
                      onClick={handleAddToShoppingList}
                      className="w-full bg-[#2E6B47] hover:bg-[#1F4C31] text-white rounded-xl py-3 text-center font-bold text-[14px] tracking-tight cursor-pointer transition-all active:scale-98 shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-4.5 h-4.5" /> Добавить в список покупок
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        if (searchResults.length > 0) {
                          setActiveMode("name-search");
                        } else {
                          setActiveMode("start");
                        }
                        setSelectedProduct(null);
                      }}
                      className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl py-2.5 text-center font-bold text-[13px] tracking-tight cursor-pointer transition-all active:scale-98"
                    >
                      Искать замену / Вернуться
                    </button>
                  </div>

                </div>

              </motion.div>
            ) : (
              // Case: No product returned by the API (Product not found)
              <div className="bg-white rounded-[32px] border border-amber-100 p-6 text-center shadow-md mb-5 w-full">
                <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-3 border border-amber-100">
                  <AlertTriangle className="w-7 h-7 stroke-[1.8]" />
                </div>
                <h3 className="text-[16px] font-bold text-slate-800 mb-1 font-sans">Продукт не найден в базе данных</h3>
                <p className="text-[12.5px] text-text-muted leading-relaxed max-w-[280px] mx-auto mb-4">
                  Штрихкод <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1 py-0.5 rounded">{(selectedProduct as any)?.code || "введенный"}</span> отсутствует в свободной базе Open Food Facts.
                </p>

                <div className="flex flex-col gap-2 w-full">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMode("name-search");
                      setSearchQuery("");
                      setSearchResults([]);
                    }}
                    className="w-full bg-[#2E6B47] hover:bg-[#1F4C31] text-white rounded-xl py-2.5 text-center font-bold text-[13px] tracking-tight cursor-pointer transition-all active:scale-98 flex items-center justify-center gap-1"
                  >
                    <Search className="w-4 h-4" /> Искать по названию текстом
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setActiveMode("start")}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl py-2.5 text-center font-bold text-[13px] tracking-tight cursor-pointer transition-all active:scale-98"
                  >
                    Вернуться в меню
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= MY SHOPPING LIST (СПИСОК ПОКУПОК) ================= */}
        {activeMode === "start" && (
          <div className="w-full mt-3.5 select-none" id="shopping-list-collection">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[15.5px] font-extrabold text-[#2F4F3F] font-sans tracking-tight flex items-center gap-1.5">
                <ShoppingBag className="w-4.5 h-4.5 text-[#2E6B47]" /> Мой список
              </span>
              {shoppingList.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearShoppingList}
                  className="text-[11.5px] font-bold text-red-500 hover:text-red-700 cursor-pointer flex items-center gap-0.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Очистить
                </button>
              )}
            </div>

            {shoppingList.length > 0 ? (
              <div className="flex flex-col gap-2.5">
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
                      className={`rounded-[22px] border p-3 flex items-start gap-2.5 text-left relative overflow-hidden transition-all duration-300 shadow-3xs ${
                        item.checked
                          ? "bg-slate-50/70 border-slate-100 opacity-60"
                          : "bg-white border-slate-150/60"
                      }`}
                    >
                      {/* Checkbox circle selector */}
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

                      {/* Info layout */}
                      <div className="flex-1 flex gap-2 min-w-0">
                        {item.image && (
                          <img 
                            src={item.image} 
                            alt={item.name}
                            className="w-12 h-12 rounded-xl object-contain bg-slate-50 border border-slate-100 p-0.5 shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        )}
                        <div className="flex flex-col min-w-0">
                          <span className={`text-[13.5px] font-bold text-slate-800 leading-tight ${item.checked ? "line-through text-slate-400" : ""}`}>
                            {item.name}
                          </span>
                          {item.brand && (
                            <span className="text-[11px] text-slate-400 leading-none truncate mt-0.5">
                              {item.brand}
                            </span>
                          )}

                          {/* Anna's quick tag indicator */}
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-full ${vColor[item.verdictStatus] || "bg-emerald-50 text-emerald-700"}`}>
                              {vLabel[item.verdictStatus] || "Чистый состав"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Trash Delete action Icon */}
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ml-1 mt-0.5 focus:outline-none"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              // Empty list state illustration
              <div className="bg-slate-50 border border-slate-100 border-dashed rounded-[24px] p-8 text-center select-none w-full">
                <div className="w-11 h-11 rounded-full bg-white text-[#2E6B47] flex items-center justify-center mx-auto mb-2.5 border border-slate-150/40 shadow-3xs">
                  <ShoppingBag className="w-5 h-5 text-[#2E6B47] shrink-0" />
                </div>
                <span className="text-[13.5px] font-bold text-slate-700 block mb-0.5">Список продуктов пуст</span>
                <span className="text-[11.5px] text-text-muted max-w-[200px] mx-auto block leading-tight">
                  Чистые WFPB продукты помогут вашим сосудам и микробиоте. Сканируйте штрихкоды и добавляйте продукты осознанно!
                </span>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Toast notification */}
      {toastVisible && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[999] bg-indigo-600 text-white text-[14px] font-bold px-5 py-2.5 rounded-2xl shadow-lg animate-fade-in">
          {toastMessage}
        </div>
      )}

      {/* 2. FIXED STICKY NAVIGATION BAR WITH HOME / CELLULAR IMPULSE TABS */}
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
