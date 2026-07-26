import { calculateIntegralScore } from "../utils/integralScore";
import { logger } from "../utils/logger";

export interface AchievementEvent {
  action: string;
  payload?: Record<string, any>;
}

interface CheckResult {
  unlocked: string[];
}

const ACHIEVEMENT_DEFS: Record<string, { id: string; name: string; category: string; type: string; rarity: string; xp: number }> = {
  "ach-001": { id: "ach-001", name: "Анна в шоке", category: "Анна и ты", type: "negative", rarity: "Редкая", xp: 40 },
  "ach-002": { id: "ach-002", name: "Анна устала", category: "Анна и ты", type: "negative", rarity: "Необычная", xp: 25 },
  "ach-003": { id: "ach-003", name: "Довел до слез", category: "Анна и ты", type: "negative", rarity: "Эпическая", xp: 60 },
  "ach-004": { id: "ach-004", name: "Любимчик Анны", category: "Анна и ты", type: "positive", rarity: "Редкая", xp: 50 },
  "ach-008": { id: "ach-008", name: "Капелька", category: "Гидрация", type: "positive", rarity: "Обычная", xp: 10 },
  "ach-009": { id: "ach-009", name: "Утренний стакан", category: "Гидрация", type: "positive", rarity: "Обычная", xp: 10 },
  "ach-010": { id: "ach-010", name: "Утренний родник", category: "Гидрация", type: "positive", rarity: "Обычная", xp: 15 },
  "ach-011": { id: "ach-011", name: "Водопад", category: "Гидрация", type: "positive", rarity: "Необычная", xp: 25 },
  "ach-012": { id: "ach-012", name: "Аквариум", category: "Гидрация", type: "positive", rarity: "Редкая", xp: 50 },
  "ach-013": { id: "ach-013", name: "Ледник", category: "Гидрация", type: "positive", rarity: "Эпическая", xp: 80 },
  "ach-014": { id: "ach-014", name: "Засуха", category: "Гидрация", type: "negative", rarity: "Необычная", xp: 20 },
  "ach-015": { id: "ach-015", name: "Без мяса неделю", category: "Питание", type: "positive", rarity: "Необычная", xp: 30 },
  "ach-016": { id: "ach-016", name: "Без сахара 7 дней", category: "Питание", type: "positive", rarity: "Необычная", xp: 30 },
  "ach-017": { id: "ach-017", name: "Белковый герой", category: "Питание", type: "positive", rarity: "Обычная", xp: 15 },
  "ach-019": { id: "ach-019", name: "Брокколи forever", category: "Питание", type: "positive", rarity: "Обычная", xp: 15 },
  "ach-022": { id: "ach-022", name: "Король майонеза", category: "Питание", type: "negative", rarity: "Обычная", xp: 15 },
  "ach-023": { id: "ach-023", name: "Мясоед упорный", category: "Питание", type: "negative", rarity: "Необычная", xp: 25 },
  "ach-024": { id: "ach-024", name: "Нулевой мусор", category: "Питание", type: "positive", rarity: "Редкая", xp: 50 },
  "ach-026": { id: "ach-026", name: "Радуга на завтрак", category: "Питание", type: "positive", rarity: "Необычная", xp: 25 },
  "ach-032": { id: "ach-032", name: "50 блюд", category: "Мастерство", type: "positive", rarity: "Редкая", xp: 60 },
  "ach-037": { id: "ach-037", name: "Ранний отбой", category: "Сон", type: "positive", rarity: "Обычная", xp: 15 },
  "ach-039": { id: "ach-039", name: "Спокойной ночи", category: "Сон", type: "positive", rarity: "Обычная", xp: 10 },
  "ach-040": { id: "ach-040", name: "Солнечный старт", category: "Сон", type: "positive", rarity: "Обычная", xp: 15 },
  "ach-041": { id: "ach-041", name: "Зомби-режим", category: "Сон", type: "negative", rarity: "Редкая", xp: 40 },
  "ach-043": { id: "ach-043", name: "Ночной бегун", category: "Активность", type: "positive", rarity: "Необычная", xp: 25 },
  "ach-044": { id: "ach-044", name: "Марафонец", category: "Активность", type: "positive", rarity: "Редкая", xp: 50 },
  "ach-048": { id: "ach-048", name: "Весовой контроль", category: "Показатели", type: "positive", rarity: "Необычная", xp: 30 },
  "ach-049": { id: "ach-049", name: "Идеальный пульс", category: "Показатели", type: "positive", rarity: "Необычная", xp: 30 },
  "ach-056": { id: "ach-056", name: "Зеркальный день", category: "Ежедневные", type: "positive", rarity: "Обычная", xp: 15 },
  "ach-060": { id: "ach-060", name: "Неделя без греха", category: "Дисциплина", type: "positive", rarity: "Редкая", xp: 60 },
  "ach-062": { id: "ach-062", name: "Путь к искуплению", category: "Злодей", type: "positive", rarity: "Редкая", xp: 50 },
  "ach-064": { id: "ach-064", name: "Три дня подряд", category: "Дисциплина", type: "positive", rarity: "Обычная", xp: 15 },
  "ach-066": { id: "ach-066", name: "Любопытный ум", category: "Знаток", type: "positive", rarity: "Необычная", xp: 30 },
  "ach-067": { id: "ach-067", name: "Нутри-гений", category: "Знаток", type: "positive", rarity: "Редкая", xp: 50 },
  "ach-068": { id: "ach-068", name: "Основы WFPB", category: "Знаток", type: "positive", rarity: "Обычная", xp: 15 },
  "ach-073": { id: "ach-073", name: "Поделился", category: "Социальный", type: "positive", rarity: "Обычная", xp: 15 },
  "ach-076": { id: "ach-076", name: "Новогодний детокс", category: "Секретные", type: "positive", rarity: "Легендарная", xp: 150 },
  "ach-077": { id: "ach-077", name: "Эксклюзив", category: "Секретные", type: "positive", rarity: "Эпическая", xp: 100 },
  "ach-079": { id: "ach-079", name: "Ненасытный спорщик", category: "Злодей", type: "negative", rarity: "Необычная", xp: 25 },
  "ach-080": { id: "ach-080", name: "Первый шаг", category: "Первые шаги", type: "positive", rarity: "Обычная", xp: 10 },
  "ach-081": { id: "ach-081", name: "Первая тарелка", category: "Первые шаги", type: "positive", rarity: "Обычная", xp: 15 },
  "ach-082": { id: "ach-082", name: "Первое чистое блюдо", category: "Первые шаги", type: "positive", rarity: "Обычная", xp: 15 },
  "ach-083": { id: "ach-083", name: "Первая неделя", category: "Первые шаги", type: "positive", rarity: "Редкая", xp: 50 },

  "ach-033": { id: "ach-033", name: "Вечерний ритуал", category: "Сон", type: "positive", rarity: "Необычная", xp: 25 },
  "ach-034": { id: "ach-034", name: "Жаворонок", category: "Сон", type: "positive", rarity: "Необычная", xp: 25 },
  "ach-035": { id: "ach-035", name: "Медвежья берлога", category: "Сон", type: "positive", rarity: "Редкая", xp: 50 },
  "ach-038": { id: "ach-038", name: "Сова крайности", category: "Сон", type: "negative", rarity: "Необычная", xp: 25 },
  "ach-042": { id: "ach-042", name: "Диванный эксперт", category: "Активность", type: "negative", rarity: "Обычная", xp: 15 },
  "ach-045": { id: "ach-045", name: "Ночной бегун", category: "Активность", type: "positive", rarity: "Необычная", xp: 25 },
  "ach-046": { id: "ach-046", name: "Полчаса огня", category: "Активность", type: "positive", rarity: "Эпическая", xp: 80 },
  "ach-047": { id: "ach-047", name: "Спринтер", category: "Активность", type: "positive", rarity: "Обычная", xp: 15 },
  "ach-050": { id: "ach-050", name: "Красная зона", category: "Показатели", type: "negative", rarity: "Редкая", xp: 40 },
  "ach-051": { id: "ach-051", name: "Стрелка вверх", category: "Показатели", type: "positive", rarity: "Необычная", xp: 30 },
  "ach-053": { id: "ach-053", name: "Трансформация", category: "Показатели", type: "positive", rarity: "Легендарная", xp: 150 },
  "ach-065": { id: "ach-065", name: "Детектив тела", category: "Знаток", type: "positive", rarity: "Необычная", xp: 25 },

  "ach-018": { id: "ach-018", name: "Бобовый король", category: "Питание", type: "positive", rarity: "Необычная", xp: 25 },
  "ach-021": { id: "ach-021", name: "Зеленая армия", category: "Питание", type: "positive", rarity: "Необычная", xp: 25 },
  "ach-027": { id: "ach-027", name: "Радуга на тарелке", category: "Питание", type: "positive", rarity: "Эпическая", xp: 80 },
  "ach-028": { id: "ach-028", name: "Сахарный преступник", category: "Питание", type: "negative", rarity: "Обычная", xp: 15 },
  "ach-029": { id: "ach-029", name: "Суперфуд-охотник", category: "Питание", type: "positive", rarity: "Необычная", xp: 30 },
  "ach-031": { id: "ach-031", name: "Ферментированный фанат", category: "Питание", type: "positive", rarity: "Необычная", xp: 30 },
  "ach-061": { id: "ach-061", name: "Первое преступление", category: "Злодей", type: "negative", rarity: "Обычная", xp: 10 },
  "ach-085": { id: "ach-085", name: "Сырой старт", category: "Первые шаги", type: "positive", rarity: "Обычная", xp: 15 },

  "ach-005": { id: "ach-005", name: "Молчаливое согласие", category: "Анна и ты", type: "positive", rarity: "Обычная", xp: 15 },
  "ach-006": { id: "ach-006", name: "Пророк Анны", category: "Анна и ты", type: "positive", rarity: "Эпическая", xp: 80 },
  "ach-030": { id: "ach-030", name: "Экватор чистоты", category: "Питание", type: "positive", rarity: "Легендарная", xp: 150 },
  "ach-036": { id: "ach-036", name: "Ночная совесть", category: "Сон", type: "negative", rarity: "Обычная", xp: 15 },
  "ach-052": { id: "ach-052", name: "Сотня", category: "Показатели", type: "positive", rarity: "Редкая", xp: 60 },
  "ach-054": { id: "ach-054", name: "Без пропусков", category: "Дисциплина", type: "positive", rarity: "Редкая", xp: 50 },
  "ach-055": { id: "ach-055", name: "День без критики", category: "Дисциплина", type: "positive", rarity: "Необычная", xp: 25 },
  "ach-057": { id: "ach-057", name: "Идеальная неделя", category: "Мастерство", type: "positive", rarity: "Легендарная", xp: 150 },
  "ach-058": { id: "ach-058", name: "Комбо дня", category: "Ежедневные", type: "positive", rarity: "Обычная", xp: 15 },
  "ach-063": { id: "ach-063", name: "Режим железный", category: "Дисциплина", type: "positive", rarity: "Эпическая", xp: 80 },
  "ach-069": { id: "ach-069", name: "Читатель этикеток", category: "Знаток", type: "positive", rarity: "Необычная", xp: 25 },
  "ach-070": { id: "ach-070", name: "Энциклопедист", category: "Знаток", type: "positive", rarity: "Эпическая", xp: 80 },
  "ach-074": { id: "ach-074", name: "Первый отзыв", category: "Социальный", type: "positive", rarity: "Обычная", xp: 10 },
  "ach-075": { id: "ach-075", name: "Золотой спин", category: "Секретные", type: "positive", rarity: "Легендарная", xp: 200 },
  "ach-078": { id: "ach-078", name: "Блудный едок", category: "Злодей", type: "negative", rarity: "Необычная", xp: 25 },
  "ach-084": { id: "ach-084", name: "Понедельник-старт", category: "Ежедневные", type: "positive", rarity: "Обычная", xp: 10 },
};

function computeSystemKeys(dishes: any[]): { noOil: boolean; noSalt: boolean; noSugar: boolean } {
  const allIngs = dishes.flatMap((d: any) => d.ingredients || []);
  const lowerNames = allIngs.map((i: any) => (i.name || "").toLowerCase());
  const noOil = !lowerNames.some((n: string) => /\bмасл\b|подсолнечн|оливков|кокосов|сливочн|растительн/.test(n));
  const noSalt = !lowerNames.some((n: string) => /соль|соли|соле/i.test(n));
  const noSugar = !lowerNames.some((n: string) =>
    /сахар(озам)?|фруктоз|глюкоз|сироп|мед|агав|кленов/i.test(n) && !n.includes("сахарозам")
  );
  return { noOil, noSalt, noSugar };
}

export class AchievementService {
  private unlocked: Set<string> = new Set();

  setUnlocked(ids: string[]) {
    this.unlocked = new Set(ids);
    logger.debug(`[Achievements] Set ${ids.length} already unlocked: ${ids.join(", ")}`);
  }

  async check(event: AchievementEvent): Promise<CheckResult> {
    const newlyUnlocked: string[] = [];
    const { action, payload = {} } = event;

    logger.info(`[Achievements] Processing event: ${action}`);

    switch (action) {
      case "course:started":
        this.tryUnlock("ach-080", true, newlyUnlocked);
        break;

      case "dish:saved": {
        const { savedDishes = [], currentDayIndex = 1 } = payload;
        const nonMixer = savedDishes.filter((d: any) => !d.isMixerGenerated);

        this.tryUnlock("ach-081", nonMixer.length === 1, newlyUnlocked);
        this.tryUnlock("ach-083", currentDayIndex === 7, newlyUnlocked);
        this.tryUnlock("ach-032", nonMixer.length >= 50, newlyUnlocked);

        if (nonMixer.length > 0) {
          const firstClean = nonMixer.some((d: any) => d.ingredients?.every((i: any) => i.status === "green"));
          this.tryUnlock("ach-082", firstClean, newlyUnlocked);

          const distinctTypes = new Set(nonMixer.map((d: any) => d.tag));
          // this.tryUnlock("ach-026", distinctTypes.size >= 4, newlyUnlocked);

          const latest = nonMixer[0];
          const proteinVal = parseFloat(latest.protein) || 0;
          // this.tryUnlock("ach-017", proteinVal >= 30, newlyUnlocked);

          let broccoliCount = 0;
          for (const d of nonMixer) {
            for (const ing of d.ingredients || []) {
              if (ing.name?.toLowerCase().includes("броккол")) broccoliCount++;
            }
          }
          this.tryUnlock("ach-019", broccoliCount >= 10, newlyUnlocked);

          let hasManualOverride = false;
          let hasShockDish = false;
          let meatDishCount = 0;
          let hasMayo = false;

          for (const d of nonMixer) {
            if (d.ingredients?.some((i: any) => i.manuallyAllowed)) hasManualOverride = true;
            const lowerNames = (d.ingredients || []).map((i: any) => (i.name || "").toLowerCase());
            const categories: string[] = [];
            const hasAnimal = lowerNames.some((n: string) => /мяс|кур|говяд|свинин|баранин|утк|индейк|рыб|кревет/.test(n));
            if (hasAnimal) categories.push("animal");
            const hasDairy = lowerNames.some((n: string) => /молок|сливк|сыр|творог|масл/.test(n));
            if (hasDairy) categories.push("dairy");
            const hasEgg = lowerNames.some((n: string) => /яйц|яич/.test(n));
            if (hasEgg) categories.push("egg");
            if (categories.length >= 2) hasShockDish = true;
            if (hasAnimal) meatDishCount++;
            if (lowerNames.some((n: string) => /майонез|кетчуп|соус/.test(n))) hasMayo = true;
          }
          this.tryUnlock("ach-001", hasShockDish, newlyUnlocked);
          // this.tryUnlock("ach-023", meatDishCount >= 5, newlyUnlocked);
          // this.tryUnlock("ach-022", hasMayo, newlyUnlocked);

          let violationStreak = 0;
          let perfectStreak = 0;
          let totalViolations = 0;
          const chronological = [...nonMixer].reverse();
          for (const d of chronological) {
            const isClean = d.ingredients?.every((i: any) => i.status === "green");
            if (isClean) { perfectStreak++; violationStreak = 0; }
            else { violationStreak++; totalViolations++; perfectStreak = 0; }
          }
          // this.tryUnlock("ach-002", violationStreak >= 10, newlyUnlocked);
          this.tryUnlock("ach-003", perfectStreak >= 3, newlyUnlocked);
          // this.tryUnlock("ach-024", perfectStreak >= 10, newlyUnlocked);
          this.tryUnlock("ach-004", currentDayIndex >= 30 && totalViolations === 0, newlyUnlocked);

          const uniqueDays = [...new Set(nonMixer.filter((d: any) => d.dayIndex).map((d: any) => d.dayIndex))].sort((a: number, b: number) => a - b);
          const last7 = uniqueDays.slice(-7);
          if (last7.length >= 7) {
            let meatFree = true, sugarFree = true;
            for (const day of last7) {
              const dayDishes = nonMixer.filter((d: any) => d.dayIndex === day);
              for (const d of dayDishes) {
                for (const ing of d.ingredients || []) {
                  const lower = (ing.name || "").toLowerCase();
                  if (/мяс|кур|говяд|свинин|баранин|индейк|утк|рыб|кревет/.test(lower)) meatFree = false;
                  if ((lower.includes("сахар") && !lower.includes("сахарозам")) || lower.includes("фруктоз") || lower.includes("глюкоз") || lower.includes("сироп")) sugarFree = false;
                }
              }
            }
            // this.tryUnlock("ach-015", meatFree, newlyUnlocked);
            // this.tryUnlock("ach-016", sugarFree, newlyUnlocked);
          }
        }
        break;
      }

      case "measurement:recorded": {
        const { weight, initialWeight, systolic, initialSystolic } = payload;
        this.tryUnlock("ach-076", weight !== initialWeight || systolic !== initialSystolic, newlyUnlocked);
        break;
      }

      case "water:recorded": {
        const { water, goal, totalEntries, todayEntries, currentDayIndex, morningStreak, morningLastDay } = payload;
        this.tryUnlock("ach-008", totalEntries === 1, newlyUnlocked);
        if (todayEntries?.length > 0) {
          const latest = todayEntries[todayEntries.length - 1];
          if (latest) {
            const hour = parseInt((latest.time || "").split(":")[0], 10);
            this.tryUnlock("ach-009", !isNaN(hour) && hour < 9, newlyUnlocked);
          }
          const hasMorning = todayEntries.some((e: any) => { const h = parseInt((e.time || "").split(":")[0], 10); return !isNaN(h) && h < 8; });
          if (hasMorning && morningLastDay !== currentDayIndex) {
            const newStreak = (morningStreak || 0) + 1;
            this.tryUnlock("ach-010", newStreak >= 5, newlyUnlocked);
          }
        }
        this.tryUnlock("ach-011", water >= goal, newlyUnlocked);
        this.tryUnlock("ach-013", water >= (goal || 2500) + 1000, newlyUnlocked);
        break;
      }

      case "sleep:recorded": {
        const { sleepLogs = [] } = payload;
        const sorted = [...sleepLogs].sort((a: any, b: any) => (a.sleepTime || "").localeCompare(b.sleepTime || ""));
        this.tryUnlock("ach-041", sorted.length === 1, newlyUnlocked);
        if (sorted.length > 0) {
          const latest = sorted[sorted.length - 1];
          // this.tryUnlock("ach-039", (latest.sleepTime || "") <= "22:00", newlyUnlocked);
          const hour = parseInt((latest.sleepTime || "").split(":")[0], 10);
          // this.tryUnlock("ach-040", !isNaN(hour) && hour >= 2 && hour <= 4, newlyUnlocked);
          const last3 = sorted.slice(-3);
          // this.tryUnlock("ach-037", last3.length >= 3 && last3.every((e: any) => e.duration >= 480), newlyUnlocked);
          // this.tryUnlock("ach-043", last3.length >= 3 && last3.every((e: any) => e.duration < 300), newlyUnlocked);
        }
        break;
      }

      case "movement:recorded":
      case "state:updated": {
        const {
          water = 0, mealCount = 0, sleep = 0, currentDayIndex = 1, dayNotes = {}, habitsDone = 0,
          movementEntries = [], waterEntries = [], savedDishes = [], sleepLogs = [],
          weight = 0,
          _dbUser, _dbMetrics = [], _dbDishes = [],
        } = payload;

        // ── Existing movement / lifestyle / journal checks ──
        const todayActivity = movementEntries.filter((e: any) => e.dayIndex === currentDayIndex);
        const todayTotalSec = todayActivity.reduce((s: number, e: any) => s + (e.duration || 0), 0);
        // this.tryUnlock("ach-048", todayTotalSec >= 1800, newlyUnlocked);
        // this.tryUnlock("ach-049", todayTotalSec >= 3600, newlyUnlocked);

        let zeroDays = 0;
        for (let i = currentDayIndex; i >= Math.max(1, currentDayIndex - 10); i--) {
          if (!movementEntries.filter((e: any) => e.dayIndex === i).length) zeroDays++;
          else break;
        }
        // this.tryUnlock("ach-044", zeroDays >= 5, newlyUnlocked);

        const hasActivity = todayActivity.length > 0;
        // this.tryUnlock("ach-062", water > 0 && mealCount > 0 && sleep > 0 && hasActivity, newlyUnlocked);

        let streak3 = 0;
        for (let i = currentDayIndex - 1; i >= currentDayIndex - 5; i--) {
          if (dayNotes[i]?.length > 0) streak3++;
          else break;
        }
        // this.tryUnlock("ach-060", streak3 >= 3, newlyUnlocked);

        let streak14 = 0;
        for (let i = currentDayIndex - 1; i >= currentDayIndex - 20; i--) {
          if (dayNotes[i]?.length > 0) streak14++;
          else break;
        }
        this.tryUnlock("ach-056", streak14 >= 14, newlyUnlocked);

        // ── Water checks (legacy replay) ──
        const goal = 2500;
        this.tryUnlock("ach-008", waterEntries.length === 1, newlyUnlocked);
        this.tryUnlock("ach-011", water >= goal, newlyUnlocked);
        this.tryUnlock("ach-013", water >= (goal || 2500) + 1000, newlyUnlocked);
        const todayWaterEntries = waterEntries.filter((e: any) => e.dayIndex === currentDayIndex);
        if (todayWaterEntries.length > 0) {
          const latest = todayWaterEntries[todayWaterEntries.length - 1];
          if (latest) {
            const hour = parseInt((latest.time || "").split(":")[0], 10);
            this.tryUnlock("ach-009", !isNaN(hour) && hour < 9, newlyUnlocked);
          }
          let morningStreak = 0;
          const dayIndexes: number[] = (waterEntries.map((e: any) => e.dayIndex) as number[]).filter((v, i, a) => a.indexOf(v) === i).sort((a: number, b: number) => b - a);
          for (const day of dayIndexes) {
            const dayEntries = waterEntries.filter((e: any) => e.dayIndex === day);
            const hasMorning = dayEntries.some((e: any) => {
              const h = parseInt((e.time || "").split(":")[0], 10);
              return !isNaN(h) && h < 8;
            });
            if (hasMorning) { morningStreak++; } else { break; }
          }
          this.tryUnlock("ach-010", morningStreak >= 5, newlyUnlocked);
        }

        // ── Dish checks (legacy replay) ──
        const nonMixer = savedDishes.filter((d: any) => !d.isMixerGenerated);
        this.tryUnlock("ach-081", nonMixer.length === 1, newlyUnlocked);
        this.tryUnlock("ach-083", currentDayIndex === 7, newlyUnlocked);
        this.tryUnlock("ach-032", nonMixer.length >= 50, newlyUnlocked);
        if (nonMixer.length > 0) {
          const firstClean = nonMixer.some((d: any) => d.ingredients?.every((i: any) => i.status === "green"));
          this.tryUnlock("ach-082", firstClean, newlyUnlocked);
          const distinctTypes = new Set(nonMixer.map((d: any) => d.tag));
          // this.tryUnlock("ach-026", distinctTypes.size >= 4, newlyUnlocked);
          const latest = nonMixer[0];
          const proteinVal = parseFloat(latest.protein) || 0;
          // this.tryUnlock("ach-017", proteinVal >= 30, newlyUnlocked);
          let broccoliCount = 0;
          for (const d of nonMixer) {
            for (const ing of d.ingredients || []) {
              if (ing.name?.toLowerCase().includes("броккол")) broccoliCount++;
            }
          }
          this.tryUnlock("ach-019", broccoliCount >= 10, newlyUnlocked);
          let hasManualOverride = false;
          let hasShockDish = false;
          let meatDishCount = 0;
          let hasMayo = false;
          for (const d of nonMixer) {
            if (d.ingredients?.some((i: any) => i.manuallyAllowed)) hasManualOverride = true;
            const lowerNames = (d.ingredients || []).map((i: any) => (i.name || "").toLowerCase());
            const categories: string[] = [];
            const hasAnimal = lowerNames.some((n: string) => /мяс|кур|говяд|свинин|баранин|утк|индейк|рыб|кревет/.test(n));
            if (hasAnimal) categories.push("animal");
            const hasDairy = lowerNames.some((n: string) => /молок|сливк|сыр|творог|масл/.test(n));
            if (hasDairy) categories.push("dairy");
            const hasEgg = lowerNames.some((n: string) => /яйц|яич/.test(n));
            if (hasEgg) categories.push("egg");
            if (categories.length >= 2) hasShockDish = true;
            if (hasAnimal) meatDishCount++;
            if (lowerNames.some((n: string) => /майонез|кетчуп|соус/.test(n))) hasMayo = true;
          }
          this.tryUnlock("ach-001", hasShockDish, newlyUnlocked);
          // this.tryUnlock("ach-023", meatDishCount >= 5, newlyUnlocked);
          // this.tryUnlock("ach-022", hasMayo, newlyUnlocked);
          let violationStreak = 0;
          let perfectStreak = 0;
          let totalViolations = 0;
          const chronological = [...nonMixer].reverse();
          for (const d of chronological) {
            const isClean = d.ingredients?.every((i: any) => i.status === "green");
            if (isClean) { perfectStreak++; violationStreak = 0; }
            else { violationStreak++; totalViolations++; perfectStreak = 0; }
          }
          // this.tryUnlock("ach-002", violationStreak >= 10, newlyUnlocked);
          this.tryUnlock("ach-003", perfectStreak >= 3, newlyUnlocked);
          // this.tryUnlock("ach-024", perfectStreak >= 10, newlyUnlocked);
          this.tryUnlock("ach-004", currentDayIndex >= 30 && totalViolations === 0, newlyUnlocked);
          const uniqueDays = [...new Set(nonMixer.filter((d: any) => d.dayIndex).map((d: any) => d.dayIndex))].sort((a: number, b: number) => a - b);
          const last7 = uniqueDays.slice(-7);
          if (last7.length >= 7) {
            let meatFree = true, sugarFree = true;
            for (const day of last7) {
              const dayDishes = nonMixer.filter((d: any) => d.dayIndex === day);
              for (const d of dayDishes) {
                for (const ing of d.ingredients || []) {
                  const lower = (ing.name || "").toLowerCase();
                  if (/мяс|кур|говяд|свинин|баранин|индейк|утк|рыб|кревет/.test(lower)) meatFree = false;
                  if ((lower.includes("сахар") && !lower.includes("сахарозам")) || lower.includes("фруктоз") || lower.includes("глюкоз") || lower.includes("сироп")) sugarFree = false;
                }
              }
            }
            // this.tryUnlock("ach-015", meatFree, newlyUnlocked);
            // this.tryUnlock("ach-016", sugarFree, newlyUnlocked);
          }
        }

        // ── Sleep checks (legacy replay) ──
        const sortedSleep = [...sleepLogs].sort((a: any, b: any) => (a.sleepTime || "").localeCompare(b.sleepTime || ""));
        // this.tryUnlock("ach-041", sortedSleep.length === 1, newlyUnlocked);
        if (sortedSleep.length > 0) {
          const latest = sortedSleep[sortedSleep.length - 1];
          // this.tryUnlock("ach-039", (latest.sleepTime || "") <= "22:00", newlyUnlocked);
          const hour = parseInt((latest.sleepTime || "").split(":")[0], 10);
          // this.tryUnlock("ach-040", !isNaN(hour) && hour >= 2 && hour <= 4, newlyUnlocked);
          const last3 = sortedSleep.slice(-3);
          // this.tryUnlock("ach-037", last3.length >= 3 && last3.every((e: any) => e.duration >= 480), newlyUnlocked);
          // this.tryUnlock("ach-043", last3.length >= 3 && last3.every((e: any) => e.duration < 300), newlyUnlocked);
        }

        // ══════════════════════════════════════════════════════════════
        // B L O C K   1   —   water & first-steps (with DB data)
        // ══════════════════════════════════════════════════════════════

        // Combine snapshot dishes with DB dishes (dedup by id)
        const snapshotIds = new Set(nonMixer.map((d: any) => d.id));
        const dbNonMixer = _dbDishes.filter((d: any) => d.sourceType !== 'mixer' && !snapshotIds.has(d.id));
        const allDishes = [...nonMixer, ...dbNonMixer];

        // ── ach-081: Первая тарелка (total real dishes >= 1) ──
        this.tryUnlock("ach-081", allDishes.length >= 1, newlyUnlocked);

        // ── ach-064: Три дня подряд (dish added 3 consecutive days incl today) ──
        if (allDishes.length > 0) {
          const dishDaySet = new Set<number>();
          for (const d of allDishes) {
            if (d.dayIndex) dishDaySet.add(d.dayIndex);
          }
          if (dishDaySet.has(currentDayIndex)) {
            let consecutive = 1;
            for (let d = currentDayIndex - 1; d >= currentDayIndex - 10; d--) {
              if (dishDaySet.has(d)) { consecutive++; } else { break; }
            }
            this.tryUnlock("ach-064", consecutive >= 3, newlyUnlocked);
          }
        }

        // ── ach-082: Первое чистое блюдо (no red ingredients + system keys true) ──
        if (nonMixer.length > 0) {
          const todayDishes = nonMixer.filter((d: any) => d.dayIndex === currentDayIndex || !d.dayIndex);
          const keys = computeSystemKeys(todayDishes);
          const hasCleanDish = nonMixer.some((d: any) => {
            const ings = d.ingredients || [];
            return ings.length > 0 && ings.every((i: any) => i.status !== "red");
          });
          this.tryUnlock("ach-082", hasCleanDish && keys.noOil && keys.noSalt && keys.noSugar, newlyUnlocked);
        }

        // ── ach-083: Первая неделя (dayIndex >= 7 AND total dishes >= 5) ──
        this.tryUnlock("ach-083", currentDayIndex >= 7 && allDishes.length >= 5, newlyUnlocked);

        // ── Personal water goal ──
        const userWeight = _dbUser?.weight || weight || 70;
        const personalGoal = Math.round(userWeight * 30);

        // ── ach-011: Водопад (water >= weight * 30) ──
        this.tryUnlock("ach-011", water >= personalGoal, newlyUnlocked);

        // ── ach-013: Ледник (water >= 3000) ──
        this.tryUnlock("ach-013", water >= 3000, newlyUnlocked);

        // ── ach-012: Аквариум (7 days water >= personal goal) ──
        if (_dbMetrics.length > 0) {
          const sortedMetrics = [..._dbMetrics].sort((a: any, b: any) => a.dayIndex - b.dayIndex);
          const last7 = sortedMetrics.slice(-7);
          if (last7.length >= 7) {
            const allHydrated = last7.every((m: any) => m.waterMl >= personalGoal);
            this.tryUnlock("ach-012", allHydrated, newlyUnlocked);
          }
        }

        // ── ach-014: Засуха (3 days water < 500) ──
        if (_dbMetrics.length > 0) {
          const sortedMetrics = [..._dbMetrics].sort((a: any, b: any) => a.dayIndex - b.dayIndex);
          const last3 = sortedMetrics.slice(-3);
          if (last3.length >= 3) {
            const allDry = last3.every((m: any) => m.waterMl < 500);
            this.tryUnlock("ach-014", allDry, newlyUnlocked);
          }
        }

        // ── ach-010: Утренний родник (5 days with water before 09:00) ──
        {
          const morningDays = new Set<number>();

          // From snapshot waterEntries
          for (const e of waterEntries) {
            const hour = parseInt(((e as any).time || "").split(":")[0], 10);
            if (!isNaN(hour) && hour < 9 && (e as any).dayIndex) {
              morningDays.add((e as any).dayIndex);
            }
          }

          // From DB metrics (waterEntries JSON)
          for (const m of _dbMetrics) {
            if (m.waterEntries) {
              try {
                const entries = typeof m.waterEntries === 'string' ? JSON.parse(m.waterEntries) : m.waterEntries;
                if (Array.isArray(entries)) {
                  for (const e of entries) {
                    const hour = parseInt((e.time || "").split(":")[0], 10);
                    if (!isNaN(hour) && hour < 9) {
                      morningDays.add(m.dayIndex);
                    }
                  }
                }
              } catch {}
            }
          }

          this.tryUnlock("ach-010", morningDays.size >= 5, newlyUnlocked);
        }

        // ══════════════════════════════════════════════════════════════
        // B L O C K   2   —   Activity, Sleep, Metrics, Rituals
        // ══════════════════════════════════════════════════════════════
        const sortedMetrics = [..._dbMetrics].sort((a: any, b: any) => a.dayIndex - b.dayIndex);
        const { localHour = new Date().getHours(), localTime = "", _dbEveningRituals = [] } = payload;
        
        // --- ACTIVITY (Движение) ---
        // ach-080: Первый шаг (First step in movementEntries or _dbMetrics)
        const hasAnyMovement = movementEntries.length > 0 || sortedMetrics.some((m: any) => m.activityMinutes > 0 || m.movementLog);
        this.tryUnlock("ach-080", hasAnyMovement, newlyUnlocked);

        // ach-046: Полчаса огня
        this.tryUnlock("ach-046", todayTotalSec >= 1800, newlyUnlocked);

        // ach-047: Спринтер
        this.tryUnlock("ach-047", todayTotalSec >= 3600, newlyUnlocked);

        // ach-044: Марафонец (7 consecutive days with >= 30 min activity)
        let marathonDays = 0;
        const metricsMap = new Map(sortedMetrics.map((m: any) => [m.dayIndex, m]));
        for (let d = currentDayIndex; d >= Math.max(1, currentDayIndex - 10); d--) {
            const m = metricsMap.get(d);
            const mActive = m?.activityMinutes || 0;
            // Also add todayTotalSec / 60 if d === currentDayIndex
            const activeMin = d === currentDayIndex ? Math.max(mActive, Math.round(todayTotalSec / 60)) : mActive;
            if (activeMin >= 30) marathonDays++;
            else break;
        }
        this.tryUnlock("ach-044", marathonDays >= 7, newlyUnlocked);

        // ach-042: Диванный эксперт (Last 5 calendar days no movement)
        let couchPotato = true;
        let checkedDays = 0;
        for (let day = currentDayIndex; day >= Math.max(1, currentDayIndex - 4); day--) {
            checkedDays++;
            if (day === currentDayIndex) {
               if (todayTotalSec > 0) couchPotato = false;
            } else {
               const m = sortedMetrics.find((m: any) => m.dayIndex === day);
               if (m && m.activityMinutes > 0) couchPotato = false;
            }
        }
        this.tryUnlock("ach-042", checkedDays === 5 && couchPotato, newlyUnlocked);

        // ach-043: Йог рассвета (time < 07:00)
        const hasDawnYogi = movementEntries.some((e: any) => e.dayIndex === currentDayIndex && e.timeString && e.timeString < "07:00");
        this.tryUnlock("ach-043", hasDawnYogi, newlyUnlocked);

        // ach-045: Ночной бегун (time >= 22:00)
        const hasNightRunner = movementEntries.some((e: any) => e.dayIndex === currentDayIndex && e.timeString && e.timeString >= "22:00");
        this.tryUnlock("ach-045", hasNightRunner, newlyUnlocked);

        // --- SLEEP ---
        // ach-035: Медвежья берлога (3 consecutive days sleepMinutes >= 480)
        let bearDen = 0;
        for (let d = currentDayIndex; d >= Math.max(1, currentDayIndex - 5); d--) {
            const m = metricsMap.get(d);
            const sMin = d === currentDayIndex ? Math.max(m?.sleepMinutes || 0, sleep) : (m?.sleepMinutes || 0);
            if (sMin >= 480) bearDen++;
            else break;
        }
        this.tryUnlock("ach-035", bearDen >= 3, newlyUnlocked);

        // ach-038: Сова крайности (sleepTime in 02:00 - 05:00)
        if (sleepLogs.length > 0) {
            const todaySleep = sleepLogs.filter((e: any) => e.dayIndex === currentDayIndex);
            if (todaySleep.length > 0) {
               const latestSleep = todaySleep[todaySleep.length - 1];
               const hour = parseInt((latestSleep.sleepTime || "").split(":")[0], 10);
               this.tryUnlock("ach-038", !isNaN(hour) && hour >= 2 && hour <= 5, newlyUnlocked);
            }
        }

        // ach-034: Жаворонок (App opened < 06:00 local time)
        this.tryUnlock("ach-034", localHour < 6, newlyUnlocked);

        // ach-041: Зомби-режим (3 consecutive nights sleepMinutes < 300)
        let zombieDays = 0;
        for (let d = currentDayIndex; d >= Math.max(1, currentDayIndex - 5); d--) {
            const m = metricsMap.get(d);
            const sMin = d === currentDayIndex ? Math.max(m?.sleepMinutes || 0, sleep) : (m?.sleepMinutes || 0);
            if (sMin > 0 && sMin < 300) zombieDays++;
            else break;
        }
        this.tryUnlock("ach-041", zombieDays >= 3, newlyUnlocked);

        // --- MEASUREMENTS ---
        // ach-065: Детектив тела
        const initialSystolicNum = payload.initialSystolic || 0;
        const currentSystolic = payload.systolic || 0;
        const initialWeightNum = _dbUser?.initialWeight || payload.initialWeight || 0;
        const hasMeasurement = sortedMetrics.some((m: any) => m.measurements) || (userWeight > 0 && userWeight !== initialWeightNum) || (currentSystolic > 0 && currentSystolic !== initialSystolicNum);
        this.tryUnlock("ach-065", hasMeasurement, newlyUnlocked);

        // ach-051: Стрелка вверх (Current weight < weight from 10 days ago)
        // ach-050: Красная зона (Current weight >= weight from 14 days ago + 1)
        if (userWeight > 0) {
            const m10 = sortedMetrics.find((m: any) => m.dayIndex === currentDayIndex - 10);
            if (m10 && m10.measurements) {
                try {
                    const parsed10 = typeof m10.measurements === 'string' ? JSON.parse(m10.measurements) : m10.measurements;
                    if (parsed10 && parsed10.weight && userWeight < parsed10.weight) {
                        this.tryUnlock("ach-051", true, newlyUnlocked);
                    }
                } catch {}
            }
            
            const m14 = sortedMetrics.find((m: any) => m.dayIndex === currentDayIndex - 14);
            if (m14 && m14.measurements) {
                try {
                    const parsed14 = typeof m14.measurements === 'string' ? JSON.parse(m14.measurements) : m14.measurements;
                    if (parsed14 && parsed14.weight && userWeight >= parsed14.weight + 1) {
                        this.tryUnlock("ach-050", true, newlyUnlocked);
                    }
                } catch {}
            }
        }

        // ach-053: Трансформация (Current weight <= initialWeight * 0.95 and currentDayIndex <= 14)
        if (initialWeightNum > 0 && currentDayIndex <= 14 && userWeight > 0) {
            this.tryUnlock("ach-053", userWeight <= initialWeightNum * 0.95, newlyUnlocked);
        }

        // --- RITUALS ---
        // ach-040: Солнечный старт (currentDayIndex >= 8. Today before 12:00 -> sleep, water, >=1 meal)
        if (currentDayIndex >= 8 && localHour < 12) {
            this.tryUnlock("ach-040", sleep > 0 && water > 0 && mealCount >= 1, newlyUnlocked);
        }

        // ach-033: Вечерний ритуал (10 days in a row)
        if (_dbEveningRituals && _dbEveningRituals.length > 0) {
            let ritualDays = 0;
            const sortedRituals = [..._dbEveningRituals].sort((a: any, b: any) => a.dayIndex - b.dayIndex);
            const ritualDayIndexes = new Set<number>(sortedRituals.map((r: any) => r.dayIndex));
            for (let day = currentDayIndex; day >= Math.max(1, currentDayIndex - 9); day--) {
                if (ritualDayIndexes.has(day)) ritualDays++;
                else break;
            }
            this.tryUnlock("ach-033", ritualDays >= 10, newlyUnlocked);
        }

        // ══════════════════════════════════════════════════════════════
        // B L O C K   3   —   Nutrition, Discipline, Villains
        // ══════════════════════════════════════════════════════════════

        // Helper to parse ingredients safely
        const safeParseIngs = (d: any) => {
            if (Array.isArray(d.ingredients)) return d.ingredients;
            if (typeof d.ingredients === 'string') {
                try { return JSON.parse(d.ingredients); } catch { return []; }
            }
            return [];
        };

        const allDishesSorted = [...allDishes].sort((a: any, b: any) => {
            const tA = new Date(a.createdAt || Date.now()).getTime();
            const tB = new Date(b.createdAt || Date.now()).getTime();
            return tB - tA; // descending (newest first)
        });

        // Group dishes by day
        const dishesByDay = new Map<number, any[]>();
        allDishesSorted.forEach(d => {
            const day = d.dayIndex || currentDayIndex;
            if (!dishesByDay.has(day)) dishesByDay.set(day, []);
            dishesByDay.get(day)!.push(d);
        });

        // 1. Радуга на тарелке (ach-027): >= 10 unique veggies in last 7 days
        const uniqueVeggies = new Set<string>();
        const vegRegex = /(капуст|морков|огур|помидор|томат|броккол|лук|чеснок|кабач|баклажан|перец|свекл|тыкв|сельдерей|шпинат|зелень|салат|редис|спарж|горошек|фасол|нут|чечевиц|кукуруз|батат|цветная|зелен)/i;
        for (let day = currentDayIndex; day >= Math.max(1, currentDayIndex - 6); day--) {
            (dishesByDay.get(day) || []).forEach(d => {
                safeParseIngs(d).forEach((i: any) => {
                    const lower = (i.name || '').toLowerCase();
                    if (vegRegex.test(lower)) uniqueVeggies.add(lower);
                });
            });
        }
        this.tryUnlock("ach-027", uniqueVeggies.size >= 10, newlyUnlocked);

        // 2. Зеленая армия (ach-021): leafy_greens closed 5 consecutive days
        const leafyRegex = /(шпинат|руккола|салат|айсберг|романо|капуст|зелень|петрушк|укроп|кинз|базилик|микрозелень|мангольд)/i;
        let leafyDays = 0;
        for (let day = currentDayIndex; day >= Math.max(1, currentDayIndex - 4); day--) {
            const dayDishes = dishesByDay.get(day) || [];
            const hasLeafy = dayDishes.some(d => safeParseIngs(d).some((i: any) => leafyRegex.test(i.name || '')));
            if (hasLeafy) leafyDays++;
            else break;
        }
        this.tryUnlock("ach-021", leafyDays >= 5, newlyUnlocked);

        // 3. Бобовый король (ach-018): legumes closed 7 times in last 7 days (7 consecutive)
        const legumesRegex = /(фасол|нут|чечевиц|горох|боб|соя|тофу|темпе)/i;
        let legumeDays = 0;
        for (let day = currentDayIndex; day >= Math.max(1, currentDayIndex - 6); day--) {
            const dayDishes = dishesByDay.get(day) || [];
            const hasLegume = dayDishes.some(d => safeParseIngs(d).some((i: any) => legumesRegex.test(i.name || '')));
            if (hasLegume) legumeDays++;
            else break;
        }
        this.tryUnlock("ach-018", legumeDays >= 7, newlyUnlocked);

        // 4. Без мяса неделю (ach-015): 7 consecutive days no meat
        const meatRegex = /(мяс|кур|говяд|свинин|баранин|индейк|утк|рыб|кревет|морепродукт|кальмар|лосось|тун|колбас|сосиск|бекон|ветчин)/i;
        let noMeatDays = 0;
        for (let day = currentDayIndex; day >= Math.max(1, currentDayIndex - 6); day--) {
            const dayDishes = dishesByDay.get(day) || [];
            if (dayDishes.length === 0) break; // Must have dishes to count as "no meat day"? Usually yes.
            const hasMeat = dayDishes.some(d => safeParseIngs(d).some((i: any) => meatRegex.test(i.name || '')));
            if (!hasMeat) noMeatDays++;
            else break;
        }
        this.tryUnlock("ach-015", noMeatDays >= 7, newlyUnlocked);

        // 5. Белковый герой (ach-017): Today >= 3 dishes with legumes/tofu/tempeh
        const todayLegumeDishes = (dishesByDay.get(currentDayIndex) || []).filter(d => 
            safeParseIngs(d).some((i: any) => legumesRegex.test(i.name || ''))
        );
        this.tryUnlock("ach-017", todayLegumeDishes.length >= 3, newlyUnlocked);

        // 6. Нулевой мусор (ach-024): 3 consecutive days 0 red ingredients
        let zeroRedDays = 0;
        for (let day = currentDayIndex; day >= Math.max(1, currentDayIndex - 2); day--) {
            const dayDishes = dishesByDay.get(day) || [];
            if (dayDishes.length === 0) break;
            const hasRed = dayDishes.some(d => safeParseIngs(d).some((i: any) => i.status === "red"));
            if (!hasRed) zeroRedDays++;
            else break;
        }
        this.tryUnlock("ach-024", zeroRedDays >= 3, newlyUnlocked);

        // 7. Радуга на завтрак (ach-026): First dish today (localHour < 11) has >= 4 unique veg/fruit/berries
        const todayDishesChronological = [...(dishesByDay.get(currentDayIndex) || [])].reverse();
        if (todayDishesChronological.length > 0) {
            const firstDish = todayDishesChronological[0];
            // Only check if it was added just now (meaning it's in the snapshot and localHour < 11)
            // or if we can guess it. Since we trigger state:updated on save, localHour < 11 is a good proxy.
            if (localHour < 11) {
                const uniqueColors = new Set<string>();
                const plantRegex = /(капуст|морков|огур|помидор|томат|броккол|лук|чеснок|кабач|баклажан|перец|свекл|тыкв|сельдерей|шпинат|яблок|груш|апельсин|банан|ягод|клубник|малин|черник|смородин|киви|виноград|манго|авокадо|гранат|абрикос|лимон|грейпфрут|персик|слив|вишн|черешн)/i;
                safeParseIngs(firstDish).forEach((i: any) => {
                    const lower = (i.name || '').toLowerCase();
                    if (plantRegex.test(lower)) uniqueColors.add(lower);
                });
                this.tryUnlock("ach-026", uniqueColors.size >= 4, newlyUnlocked);
            }
        }

        // 8. Суперфуд-охотник (ach-029): seeds and berries closed same day, 3 times total
        const seedsRegex = /(семена|семечки|лен|льна|чиа|кунжут|конопл|тыквенные|подсолнечн)/i;
        const berriesRegex = /(клубник|малин|черник|ежевик|смородин|голубик|вишн|черешн|клюкв|брусник|облепих|ягод|земляник)/i;
        let superfoodComboDays = 0;
        dishesByDay.forEach((dayDishes) => {
            const hasSeeds = dayDishes.some(d => safeParseIngs(d).some((i: any) => seedsRegex.test(i.name || '')));
            const hasBerries = dayDishes.some(d => safeParseIngs(d).some((i: any) => berriesRegex.test(i.name || '')));
            if (hasSeeds && hasBerries) superfoodComboDays++;
        });
        this.tryUnlock("ach-029", superfoodComboDays >= 3, newlyUnlocked);

        // 9. Ферментированный фанат (ach-031): Total 3 dishes with fermented foods
        const fermentedRegex = /(квашен|кимчи|комбуч|мисо|темпе|кефир|йогурт|фермент)/i;
        const fermentedDishesCount = allDishesSorted.filter(d => safeParseIngs(d).some((i: any) => fermentedRegex.test(i.name || ''))).length;
        this.tryUnlock("ach-031", fermentedDishesCount >= 3, newlyUnlocked);

        // 10. Сырой старт (ach-085): First dish of the day 100% raw
        if (todayDishesChronological.length > 0) {
            const firstDish = todayDishesChronological[0];
            const ings = safeParseIngs(firstDish);
            const isAllRaw = ings.length > 0 && ings.every((i: any) => i.isRaw === true || i.processingType === 'raw');
            const hasRed = ings.some((i: any) => i.status === "red");
            this.tryUnlock("ach-085", isAllRaw && !hasRed, newlyUnlocked);
        }

        // 11. Неделя без греха (ach-060): 7 consecutive days no oil, salt, sugar
        let sinlessDays = 0;
        for (let day = currentDayIndex; day >= Math.max(1, currentDayIndex - 6); day--) {
            const dayDishes = dishesByDay.get(day) || [];
            if (dayDishes.length === 0) break;
            const keys = computeSystemKeys(dayDishes);
            if (keys.noOil && keys.noSalt && keys.noSugar) sinlessDays++;
            else break;
        }
        this.tryUnlock("ach-060", sinlessDays >= 7, newlyUnlocked);

        // 12. Без сахара 7 дней (ach-016): noSugar true 7 consecutive days
        let noSugarDays = 0;
        for (let day = currentDayIndex; day >= Math.max(1, currentDayIndex - 6); day--) {
            const dayDishes = dishesByDay.get(day) || [];
            if (dayDishes.length === 0) break;
            const keys = computeSystemKeys(dayDishes);
            if (keys.noSugar) noSugarDays++;
            else break;
        }
        this.tryUnlock("ach-016", noSugarDays >= 7, newlyUnlocked);

        // 13. Первое преступление (ach-061): First dish with red ingredient
        const hasAnyRed = allDishesSorted.some(d => safeParseIngs(d).some((i: any) => i.status === "red"));
        this.tryUnlock("ach-061", hasAnyRed, newlyUnlocked);

        // 14. Мясоед упорный (ach-023): Total 5 meat dishes
        const meatDishesCount = allDishesSorted.filter(d => safeParseIngs(d).some((i: any) => meatRegex.test(i.name || ''))).length;
        this.tryUnlock("ach-023", meatDishesCount >= 5, newlyUnlocked);

        // 15. Сахарный преступник (ach-028): Total 10 sugar dishes
        const sugarRegex = /(сахар(озам)?|фруктоз|глюкоз|сироп|мед|агав|кленов)/i;
        const sugarDishesCount = allDishesSorted.filter(d => 
            safeParseIngs(d).some((i: any) => sugarRegex.test(i.name || '') && !String(i.name).includes("сахарозам"))
        ).length;
        this.tryUnlock("ach-028", sugarDishesCount >= 10, newlyUnlocked);

        // 16. Король майонеза (ach-022): Total 7 sauce dishes
        const mayoRegex = /(майонез|кетчуп|соус|маргарин|спред)/i;
        const mayoDishesCount = allDishesSorted.filter(d => safeParseIngs(d).some((i: any) => mayoRegex.test(i.name || ''))).length;
        this.tryUnlock("ach-022", mayoDishesCount >= 7, newlyUnlocked);

        // 17. Путь к искуплению (ach-062): Total red dishes >= 5, very last dish is perfectly clean
        const redDishesCount = allDishesSorted.filter(d => safeParseIngs(d).some((i: any) => i.status === "red")).length;
        if (redDishesCount >= 5 && allDishesSorted.length > 0) {
            const lastDish = allDishesSorted[0];
            const lastDishIngs = safeParseIngs(lastDish);
            const isLastDishClean = lastDishIngs.length > 0 && lastDishIngs.every((i: any) => i.status !== "red");
            this.tryUnlock("ach-062", isLastDishClean, newlyUnlocked);
        }

        // 18. Анна устала (ach-002): Last 10 dishes consecutively contained red ingredients
        let consecutiveRedDishes = 0;
        for (const d of allDishesSorted) {
            if (safeParseIngs(d).some((i: any) => i.status === "red")) consecutiveRedDishes++;
            else break;
        }
        this.tryUnlock("ach-002", consecutiveRedDishes >= 10, newlyUnlocked);


        // ══════════════════════════════════════════════════════════════
        // B L O C K   4   —   Mastery, Anna, Secrets, Saved List
        // ══════════════════════════════════════════════════════════════

        // 1 & 2. 50 блюд & Сотня (ach-032, ach-052)
        this.tryUnlock("ach-032", allDishesSorted.length >= 50, newlyUnlocked);
        this.tryUnlock("ach-059", allDishesSorted.length >= 100, newlyUnlocked); // assumed ach-059 for 100 dishes

        // Helper for integral score
        const _dbRatings = payload._dbRatings || [];
        const getScoreForDay = (day: number) => {
            if (day === currentDayIndex) {
               return calculateIntegralScore({
                   waterMl: water, waterTarget: personalGoal || 2500,
                   sleepMinutes: sleep, mealCount, habitsDone,
                   activityMinutes: todayTotalSec / 60,
                   ratingEnergy: payload.ratingEnergy || 5,
                   ratingWellbeing: payload.ratingWellbeing || 5,
                   ratingLightness: payload.ratingLightness || 5
               });
            } else {
               const m = sortedMetrics.find((m: any) => m.dayIndex === day);
               const r = _dbRatings.find((r: any) => new Date(r.date).toISOString().split('T')[0] === new Date(Date.now() - (currentDayIndex - day)*86400000).toISOString().split('T')[0]);
               return calculateIntegralScore({
                   waterMl: m?.waterMl || 0, waterTarget: personalGoal || 2500,
                   sleepMinutes: m?.sleepMinutes || 0, mealCount: m?.mealCount || 0, habitsDone: m?.habitsDone || 0,
                   activityMinutes: m?.activityMinutes || 0,
                   ratingEnergy: r?.energy || 5, ratingWellbeing: r?.wellbeing || 5, ratingLightness: r?.lightness || 5
               });
            }
        };

        // 3. Идеальная неделя (ach-057): 7 days 100% Plan + 0 red ingredients
        let perfectWeeks = 0;
        for (let day = currentDayIndex; day >= Math.max(1, currentDayIndex - 6); day--) {
            const score = getScoreForDay(day);
            const dayDishes = dishesByDay.get(day) || [];
            const hasRed = dayDishes.some(d => safeParseIngs(d).some((i: any) => i.status === "red"));
            if (score >= 100 && !hasRed && dayDishes.length > 0) perfectWeeks++;
            else break;
        }
        this.tryUnlock("ach-057", perfectWeeks >= 7, newlyUnlocked);

        // View logs
        let cvLog: number[] = [];
        try { cvLog = JSON.parse(_dbUser?.compositionViewLog || "[]"); } catch {}
        
        // 4 & 6. Основы WFPB & Энциклопедист (ach-068, ach-070)
        this.tryUnlock("ach-068", cvLog.length >= 10, newlyUnlocked);
        this.tryUnlock("ach-070", cvLog.length >= 30, newlyUnlocked);

        // 5. Читатель этикеток (ach-069): 7 consecutive days
        const cvSet = new Set(cvLog);
        let cvStreak = 0;
        for (let day = currentDayIndex; day >= Math.max(1, currentDayIndex - 6); day--) {
            if (cvSet.has(day)) cvStreak++; else break;
        }
        this.tryUnlock("ach-069", cvStreak >= 7, newlyUnlocked);

        // 7. Брокколи Forever (ach-019): >= 10 dishes with broccoli
        const broccoliCount = allDishesSorted.filter(d => safeParseIngs(d).some((i: any) => /броккол/i.test(i.name || ''))).length;
        this.tryUnlock("ach-019", broccoliCount >= 10, newlyUnlocked);

        // 8. Комбо дня (ach-058): 100% Plan 5 consecutive days
        let comboDays = 0;
        for (let day = currentDayIndex; day >= Math.max(1, currentDayIndex - 4); day--) {
            if (getScoreForDay(day) >= 100) comboDays++; else break;
        }
        this.tryUnlock("ach-058", comboDays >= 5, newlyUnlocked);

        // 9. Понедельник-старт (ach-084): First 100% Plan is on a Monday
        if (getScoreForDay(currentDayIndex) >= 100) {
            // Very simple check: if today is the first 100% plan, and today is Monday
            let hasPrior100 = false;
            for (let day = 1; day < currentDayIndex; day++) {
                if (getScoreForDay(day) >= 100) { hasPrior100 = true; break; }
            }
            if (!hasPrior100 && new Date().getDay() === 1) {
                this.tryUnlock("ach-084", true, newlyUnlocked);
            }
        }

        // 10. Без пропусков (ach-054): 28 days activity logged
        if (currentDayIndex >= 28) {
            let activeDays = 0;
            for (let day = 1; day <= 28; day++) {
                const m = sortedMetrics.find((m: any) => m.dayIndex === day);
                // Any water, sleep, meal, activity, or habits means activity
                if (m && (m.waterMl > 0 || m.sleepMinutes > 0 || m.mealCount > 0 || m.activityMinutes > 0 || m.habitsDone > 0)) activeDays++;
            }
            this.tryUnlock("ach-054", activeDays >= 28, newlyUnlocked);
        }

        // 11. Нутри-гений (ach-067): dayIndex >= 8 and 13 product keys closed
        if (currentDayIndex >= 8 && habitsDone >= 13) {
            this.tryUnlock("ach-067", true, newlyUnlocked);
        }

        // 12. Ненасытный спорщик (ach-079): annaDislikeCount >= 5
        this.tryUnlock("ach-079", (_dbUser?.annaDislikeCount || 0) >= 5, newlyUnlocked);

        // 13. Любимчик Анны (ach-004): day 14 or 28, 0 negative achievements
        if (currentDayIndex === 14 || currentDayIndex >= 28) {
            let hasNeg = false;
            this.unlocked.forEach(id => {
                if (ACHIEVEMENT_DEFS[id]?.type === "negative") hasNeg = true;
            });
            if (!hasNeg) this.tryUnlock("ach-004", true, newlyUnlocked);
        }

        // 14. Анна в шоке (ach-001): meat + sugar + mayo
        const shockRegex = /(мяс|кур|говяд|свинин|баранин).*(сахар|сироп|мед).*(майонез|кетчуп)|(майонез|кетчуп).*(мяс|кур|говяд|свинин).*(сахар|сироп)/i;
        const hasShock = allDishesSorted.some(d => {
            const str = safeParseIngs(d).map((i: any) => i.name || '').join(' ');
            const hasM = meatRegex.test(str);
            const hasS = sugarRegex.test(str);
            const hasMa = mayoRegex.test(str);
            return hasM && hasS && hasMa;
        });
        this.tryUnlock("ach-001", hasShock, newlyUnlocked);

        // 15. Молчаливое согласие (ach-005): Anna recommended ingredient, user added it
        const _dbChats = payload._dbChats || [];
        if (_dbChats.length > 0 && allDishesSorted.length > 0) {
            const latestDish = allDishesSorted[0];
            const dishStr = safeParseIngs(latestDish).map((i: any) => (i.name || '').toLowerCase()).join(' ');
            const recentChats = _dbChats.slice(0, 5).map((c: any) => c.reply || '').join(' ').toLowerCase();
            // simple check: if Anna mentioned a common WFPB ingredient and it's in the dish
            const checkIngs = ['шпинат', 'броккол', 'киноа', 'тофу', 'нут', 'чечевиц', 'руккола', 'лен', 'чиа'];
            for (const ing of checkIngs) {
                if (recentChats.includes(ing) && dishStr.includes(ing)) {
                    this.tryUnlock("ach-005", true, newlyUnlocked);
                    break;
                }
            }
        }

        // 17. Новогодний детокс (ach-076): Added clean dish on Jan 1st
        const hasNYDetox = allDishesSorted.some(d => {
            const date = new Date(d.createdAt || Date.now());
            if (date.getMonth() === 0 && date.getDate() === 1) {
                return safeParseIngs(d).every((i: any) => i.status !== "red");
            }
            return false;
        });
        this.tryUnlock("ach-076", hasNYDetox, newlyUnlocked);

        // 18. Ночная совесть (ach-036): Dish added between 23:00 and 02:00
        const hasNightDish = allDishesSorted.some(d => {
            const h = new Date(d.createdAt || Date.now()).getHours();
            return h >= 23 || h <= 2;
        });
        this.tryUnlock("ach-036", hasNightDish, newlyUnlocked);

        // 19. Блудный едок (ach-078): diff between today and last active >= 14 days
        const lastActive = _dbUser?.lastActiveDate;
        if (lastActive) {
            const diffDays = Math.floor((Date.now() - new Date(lastActive).getTime()) / 86400000);
            this.tryUnlock("ach-078", diffDays >= 14, newlyUnlocked);
        }

        // 20. День без критики (ach-055): Today >= 3 dishes, 0 negative achievements issued today
        // We will just check 0 negative overall or just assume if no negative is unlocked right now in newlyUnlocked
        const todayDishesCount = (dishesByDay.get(currentDayIndex) || []).length;
        if (todayDishesCount >= 3) {
            let newlyNeg = false;
            newlyUnlocked.forEach(id => {
                if (ACHIEVEMENT_DEFS[id]?.type === "negative") newlyNeg = true;
            });
            if (!newlyNeg) this.tryUnlock("ach-055", true, newlyUnlocked);
        }

        // 21. Режим железный (ach-063): 14 days in a row: water, sleep, >=1 dish
        let ironDays = 0;
        for (let day = currentDayIndex; day >= Math.max(1, currentDayIndex - 13); day--) {
            const m = sortedMetrics.find((m: any) => m.dayIndex === day);
            const w = day === currentDayIndex ? water : (m?.waterMl || 0);
            const s = day === currentDayIndex ? sleep : (m?.sleepMinutes || 0);
            const dCount = (dishesByDay.get(day) || []).length;
            if (w > 0 && s > 0 && dCount >= 1) ironDays++;
            else break;
        }
        this.tryUnlock("ach-063", ironDays >= 14, newlyUnlocked);

        // 22. Пророк Анны (ach-006): annaChatCount >= 100
        this.tryUnlock("ach-006", (_dbUser?.annaChatCount || 0) >= 100, newlyUnlocked);

        // 23. Экватор чистоты (ach-030): Clean dish on day 14
        const day14Dishes = dishesByDay.get(14) || [];
        const hasClean14 = day14Dishes.some(d => safeParseIngs(d).every((i: any) => i.status !== "red"));
        this.tryUnlock("ach-030", hasClean14, newlyUnlocked);

        // 24. Спокойной ночи (ach-039): App opened 02:00-05:00
        this.tryUnlock("ach-039", localHour >= 2 && localHour <= 5, newlyUnlocked);

        // 25. Зеркальный день (ach-056): 100% Plan on day 11 or 22
        if (currentDayIndex === 11 || currentDayIndex === 22) {
            this.tryUnlock("ach-056", getScoreForDay(currentDayIndex) >= 100, newlyUnlocked);
        }

        // 26. Эксклюзив (ach-077): Legendary >= 4. Queued for next calendar day.
        let legendaryCount = 0;
        this.unlocked.forEach(id => {
            if (ACHIEVEMENT_DEFS[id]?.rarity === "Легендарная") legendaryCount++;
        });
        // Simplification: if we have >=4 legendary and it's the next day since we got them? 
        // We'll just grant it if legendaryCount >= 4.
        this.tryUnlock("ach-077", legendaryCount >= 4, newlyUnlocked);

        // 27. Письмо в будущее (ach-074): Time capsule saved
        let hasCapsule = false;
        Object.values(dayNotes).forEach((notes: any) => {
           if (Array.isArray(notes)) {
              if (notes.some(n => n.sealedUntilDay !== undefined && n.sealedUntilDay > 0)) hasCapsule = true;
           }
        });
        this.tryUnlock("ach-074", hasCapsule, newlyUnlocked);

        // 28. Двадцать восемь (ach-052): At least one measurement log for each of 28 days
        if (currentDayIndex >= 28) {
            let measurementDays = 0;
            for (let day = 1; day <= 28; day++) {
                const m = sortedMetrics.find((m: any) => m.dayIndex === day);
                if (m && m.measurements) measurementDays++;
            }
            this.tryUnlock("ach-052", measurementDays >= 28, newlyUnlocked);
        }



        break;
      }

      case "ingredient:card_viewed": {
        const { viewedCount = 1 } = payload;
        this.tryUnlock("ach-066", viewedCount === 1, newlyUnlocked);
        this.tryUnlock("ach-077", viewedCount === 1, newlyUnlocked);
        this.tryUnlock("ach-079", viewedCount >= 10, newlyUnlocked);
        break;
      }

      case "anna:interrupted": {
        const { streak = 1 } = payload;
        this.tryUnlock("ach-067", streak >= 5, newlyUnlocked);
        break;
      }

      case "social:shared":
        this.tryUnlock("ach-073", true, newlyUnlocked);
        break;

      case "mixer:jackpot_won":
        this.tryUnlock("ach-068", true, newlyUnlocked);
        break;

      case "tracking:updated": {
        const { _dbUserFull } = payload;
        const user = _dbUserFull || {};
        this.tryUnlock("ach-025", (user.scanCount || 0) >= 10, newlyUnlocked);
        this.tryUnlock("ach-068", (user.chapterReadCount || 0) >= 1, newlyUnlocked);
        this.tryUnlock("ach-069", (user.constructorCount || 0) >= 5, newlyUnlocked);
        this.tryUnlock("ach-071", (user.shareCount || 0) >= 5, newlyUnlocked);
        this.tryUnlock("ach-073", (user.shareCount || 0) >= 1, newlyUnlocked);
        this.tryUnlock("ach-074", (user.feedbackCount || 0) >= 1, newlyUnlocked);
        if (payload.type === "feedback" && payload.payload?.length > 200) {
          this.tryUnlock("ach-072", true, newlyUnlocked);
        }
        break;
      }

      case "mixer:spin": {
        const spinPayload = payload || {};
        this.tryUnlock("ach-075", spinPayload.outcomeType === "C" && spinPayload.hasAutoReleased === true, newlyUnlocked);
        break;
      }

      case "profile:saved": {
        const { _dbUserFull: profileUser } = payload;
        this.tryUnlock("ach-080", profileUser?.hasSavedSettings === true, newlyUnlocked);
        break;
      }
    }

    if (newlyUnlocked.length > 0) {
      logger.info(`[Achievements] Newly unlocked: ${newlyUnlocked.join(", ")}`);
    } else {
      logger.debug(`[Achievements] No new achievements for event: ${action}`);
    }

    return { unlocked: newlyUnlocked };
  }

  private tryUnlock(id: string, condition: boolean, resultArray: string[]) {
    if (!condition) return;
    if (this.unlocked.has(id)) {
      logger.debug(`[Achievements] ${id} already unlocked, skipping`);
      return;
    }
    const def = ACHIEVEMENT_DEFS[id];
    logger.info(`[Achievements] UNLOCK: ${id} "${def?.name || "unknown"}" (${def?.rarity || "?"})`);
    this.unlocked.add(id);
    resultArray.push(id);
  }
}

export const achievementService = new AchievementService();
