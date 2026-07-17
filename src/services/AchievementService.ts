import { logger } from "../utils/logger";

export interface AchievementEvent {
  action: string;
  payload?: Record<string, any>;
}

interface CheckResult {
  unlocked: string[];  // IDs of newly unlocked achievements
}

const ACHIEVEMENT_DEFS: Record<string, { id: string; name: string; category: string; type: string; rarity: string; xp: number }> = {
  "ach-001": { id: "ach-001", name: "Шок-контент", category: "dishes", type: "negative", rarity: "Необычная", xp: 50 },
  "ach-002": { id: "ach-002", name: "Хронический нарушитель", category: "violations", type: "negative", rarity: "Редкая", xp: 100 },
  "ach-003": { id: "ach-003", name: "Зелёная неделя", category: "streaks", type: "positive", rarity: "Редкая", xp: 150 },
  "ach-004": { id: "ach-004", name: "Абсолютный ноль", category: "streaks", type: "positive", rarity: "Эпическая", xp: 500 },
  "ach-008": { id: "ach-008", name: "Первый глоток", category: "water", type: "positive", rarity: "Обычная", xp: 10 },
  "ach-009": { id: "ach-009", name: "Утренний родник", category: "water", type: "positive", rarity: "Необычная", xp: 30 },
  "ach-010": { id: "ach-010", name: "Водопад", category: "water", type: "positive", rarity: "Редкая", xp: 150 },
  "ach-011": { id: "ach-011", name: "Дневная норма", category: "water", type: "positive", rarity: "Необычная", xp: 30 },
  "ach-012": { id: "ach-012", name: "Аквариум", category: "water", type: "positive", rarity: "Эпическая", xp: 300 },
  "ach-013": { id: "ach-013", name: "Всё включено", category: "water", type: "positive", rarity: "Редкая", xp: 100 },
  "ach-014": { id: "ach-014", name: "Засуха", category: "water", type: "negative", rarity: "Необычная", xp: 20 },
  "ach-015": { id: "ach-015", name: "Жизнь без мяса", category: "diet", type: "positive", rarity: "Эпическая", xp: 400 },
  "ach-016": { id: "ach-016", name: "Не подсади!", category: "diet", type: "positive", rarity: "Редкая", xp: 200 },
  "ach-017": { id: "ach-017", name: "Белковый герой", category: "dishes", type: "positive", rarity: "Необычная", xp: 40 },
  "ach-019": { id: "ach-019", name: "Брокколи forever", category: "dishes", type: "positive", rarity: "Необычная", xp: 50 },
  "ach-022": { id: "ach-022", name: "Соусный детектив", category: "dishes", type: "negative", rarity: "Необычная", xp: 30 },
  "ach-023": { id: "ach-023", name: "Мясоед упорный", category: "dishes", type: "negative", rarity: "Необычная", xp: 40 },
  "ach-024": { id: "ach-024", name: "Десятка", category: "streaks", type: "positive", rarity: "Эпическая", xp: 300 },
  "ach-026": { id: "ach-026", name: "Радуга на завтрак", category: "dishes", type: "positive", rarity: "Редкая", xp: 100 },
  "ach-032": { id: "ach-032", name: "50 оттенков зелёного", category: "dishes", type: "positive", rarity: "Эпическая", xp: 400 },
  "ach-037": { id: "ach-037", name: "Режим железный", category: "sleep", type: "positive", rarity: "Эпическая", xp: 300 },
  "ach-039": { id: "ach-039", name: "Ранний отбой", category: "sleep", type: "positive", rarity: "Необычная", xp: 30 },
  "ach-040": { id: "ach-040", name: "Сова крайности", category: "sleep", type: "negative", rarity: "Необычная", xp: 20 },
  "ach-041": { id: "ach-041", name: "Первая запись сна", category: "sleep", type: "positive", rarity: "Обычная", xp: 10 },
  "ach-043": { id: "ach-043", name: "Ночной бегун", category: "sleep", type: "negative", rarity: "Необычная", xp: 20 },
  "ach-044": { id: "ach-044", name: "Диванный эксперт", category: "movement", type: "negative", rarity: "Необычная", xp: 20 },
  "ach-048": { id: "ach-048", name: "Полчаса огня", category: "movement", type: "positive", rarity: "Необычная", xp: 30 },
  "ach-049": { id: "ach-049", name: "Марафонец", category: "movement", type: "positive", rarity: "Редкая", xp: 100 },
  "ach-056": { id: "ach-056", name: "Вторая натура", category: "journal", type: "positive", rarity: "Легендарная", xp: 500 },
  "ach-060": { id: "ach-060", name: "Первые шаги", category: "journal", type: "positive", rarity: "Необычная", xp: 30 },
  "ach-062": { id: "ach-062", name: "Идеальный день", category: "lifestyle", type: "positive", rarity: "Редкая", xp: 150 },
  "ach-064": { id: "ach-064", name: "Я сам!", category: "dishes", type: "negative", rarity: "Необычная", xp: 20 },
  "ach-067": { id: "ach-067", name: "Не дождётесь!", category: "anna", type: "positive", rarity: "Необычная", xp: 50 },
  "ach-068": { id: "ach-068", name: "Джекпот!", category: "mixer", type: "positive", rarity: "Редкая", xp: 200 },
  "ach-073": { id: "ach-073", name: "Первое преступление", category: "social", type: "positive", rarity: "Обычная", xp: 20 },
  "ach-076": { id: "ach-076", name: "Первый отзыв", category: "measurements", type: "positive", rarity: "Обычная", xp: 10 },
  "ach-077": { id: "ach-077", name: "Первый взгляд", category: "ingredients", type: "positive", rarity: "Обычная", xp: 10 },
  "ach-079": { id: "ach-079", name: "Детектив тела", category: "ingredients", type: "positive", rarity: "Редкая", xp: 100 },
  "ach-080": { id: "ach-080", name: "Понедельник — старт", category: "course", type: "positive", rarity: "Обычная", xp: 10 },
  "ach-081": { id: "ach-081", name: "Первая тарелка", category: "dishes", type: "positive", rarity: "Обычная", xp: 10 },
  "ach-082": { id: "ach-082", name: "Первое чистое блюдо", category: "dishes", type: "positive", rarity: "Необычная", xp: 20 },
  "ach-083": { id: "ach-083", name: "Первая неделя", category: "course", type: "positive", rarity: "Необычная", xp: 50 },
};

export class AchievementService {
  private unlocked: Set<string> = new Set();

  setUnlocked(ids: string[]) {
    this.unlocked = new Set(ids);
    logger.debug(`[Achievements] Set ${ids.length} already unlocked: ${ids.join(", ")}`);
  }

  async check(event: AchievementEvent): Promise<CheckResult> {
    const newlyUnlocked: string[] = [];
    const { action, payload = {} } = event;

    logger.info(`[Achievements] Processing event: ${action}`, payload);

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
          this.tryUnlock("ach-026", distinctTypes.size >= 4, newlyUnlocked);

          const latest = nonMixer[0];
          const proteinVal = parseFloat(latest.protein) || 0;
          this.tryUnlock("ach-017", proteinVal >= 30, newlyUnlocked);

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
          this.tryUnlock("ach-064", hasManualOverride, newlyUnlocked);
          this.tryUnlock("ach-001", hasShockDish, newlyUnlocked);
          this.tryUnlock("ach-023", meatDishCount >= 5, newlyUnlocked);
          this.tryUnlock("ach-022", hasMayo, newlyUnlocked);

          let violationStreak = 0;
          let perfectStreak = 0;
          let totalViolations = 0;
          const chronological = [...nonMixer].reverse();
          for (const d of chronological) {
            const isClean = d.ingredients?.every((i: any) => i.status === "green");
            if (isClean) { perfectStreak++; violationStreak = 0; }
            else { violationStreak++; totalViolations++; perfectStreak = 0; }
          }
          this.tryUnlock("ach-002", violationStreak >= 10, newlyUnlocked);
          this.tryUnlock("ach-003", perfectStreak >= 3, newlyUnlocked);
          this.tryUnlock("ach-024", perfectStreak >= 10, newlyUnlocked);
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
            this.tryUnlock("ach-015", meatFree, newlyUnlocked);
            this.tryUnlock("ach-016", sugarFree, newlyUnlocked);
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
          this.tryUnlock("ach-039", (latest.sleepTime || "") <= "22:00", newlyUnlocked);
          const hour = parseInt((latest.sleepTime || "").split(":")[0], 10);
          this.tryUnlock("ach-040", !isNaN(hour) && hour >= 2 && hour <= 4, newlyUnlocked);
          const last3 = sorted.slice(-3);
          this.tryUnlock("ach-037", last3.length >= 3 && last3.every((e: any) => e.duration >= 480), newlyUnlocked);
          this.tryUnlock("ach-043", last3.length >= 3 && last3.every((e: any) => e.duration < 300), newlyUnlocked);
        }
        break;
      }

      case "movement:recorded":
      case "state:updated": {
        const { water = 0, mealCount = 0, sleep = 0, currentDayIndex = 1, dayNotes = {}, movementEntries = [], waterEntries = [], savedDishes = [], sleepLogs = [] } = payload;
        const todayActivity = movementEntries.filter((e: any) => e.dayIndex === currentDayIndex);
        const todayTotalSec = todayActivity.reduce((s: number, e: any) => s + (e.duration || 0), 0);
        this.tryUnlock("ach-048", todayTotalSec >= 1800, newlyUnlocked);
        this.tryUnlock("ach-049", todayTotalSec >= 3600, newlyUnlocked);

        let zeroDays = 0;
        for (let i = currentDayIndex; i >= Math.max(1, currentDayIndex - 10); i--) {
          if (!movementEntries.filter((e: any) => e.dayIndex === i).length) zeroDays++;
          else break;
        }
        this.tryUnlock("ach-044", zeroDays >= 5, newlyUnlocked);

        const hasActivity = todayActivity.length > 0;
        this.tryUnlock("ach-062", water > 0 && mealCount > 0 && sleep > 0 && hasActivity, newlyUnlocked);

        let streak3 = 0;
        for (let i = currentDayIndex - 1; i >= currentDayIndex - 5; i--) {
          if (dayNotes[i]?.length > 0) streak3++;
          else break;
        }
        this.tryUnlock("ach-060", streak3 >= 3, newlyUnlocked);

        let streak14 = 0;
        for (let i = currentDayIndex - 1; i >= currentDayIndex - 20; i--) {
          if (dayNotes[i]?.length > 0) streak14++;
          else break;
        }
        this.tryUnlock("ach-056", streak14 >= 14, newlyUnlocked);

        // ── Water checks (replay same logic as water:recorded) ──
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
          // Compute morning streak from full history
          let morningStreak = 0;
          let morningLastDay = 0;
          const dayIndexes: number[] = (waterEntries.map((e: any) => e.dayIndex) as number[]).filter((v, i, a) => a.indexOf(v) === i).sort((a: number, b: number) => b - a);
          for (const day of dayIndexes) {
            const dayEntries = waterEntries.filter((e: any) => e.dayIndex === day);
            const hasMorning = dayEntries.some((e: any) => {
              const h = parseInt((e.time || "").split(":")[0], 10);
              return !isNaN(h) && h < 8;
            });
            if (hasMorning) {
              morningStreak++;
              morningLastDay = day;
            } else {
              break;
            }
          }
          this.tryUnlock("ach-010", morningStreak >= 5, newlyUnlocked);
        }

        // ── Dish checks (replay same logic as dish:saved) ──
        const nonMixer = savedDishes.filter((d: any) => !d.isMixerGenerated);
        this.tryUnlock("ach-081", nonMixer.length === 1, newlyUnlocked);
        this.tryUnlock("ach-083", currentDayIndex === 7, newlyUnlocked);
        this.tryUnlock("ach-032", nonMixer.length >= 50, newlyUnlocked);
        if (nonMixer.length > 0) {
          const firstClean = nonMixer.some((d: any) => d.ingredients?.every((i: any) => i.status === "green"));
          this.tryUnlock("ach-082", firstClean, newlyUnlocked);
          const distinctTypes = new Set(nonMixer.map((d: any) => d.tag));
          this.tryUnlock("ach-026", distinctTypes.size >= 4, newlyUnlocked);
          const latest = nonMixer[0];
          const proteinVal = parseFloat(latest.protein) || 0;
          this.tryUnlock("ach-017", proteinVal >= 30, newlyUnlocked);
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
          this.tryUnlock("ach-064", hasManualOverride, newlyUnlocked);
          this.tryUnlock("ach-001", hasShockDish, newlyUnlocked);
          this.tryUnlock("ach-023", meatDishCount >= 5, newlyUnlocked);
          this.tryUnlock("ach-022", hasMayo, newlyUnlocked);
          let violationStreak = 0;
          let perfectStreak = 0;
          let totalViolations = 0;
          const chronological = [...nonMixer].reverse();
          for (const d of chronological) {
            const isClean = d.ingredients?.every((i: any) => i.status === "green");
            if (isClean) { perfectStreak++; violationStreak = 0; }
            else { violationStreak++; totalViolations++; perfectStreak = 0; }
          }
          this.tryUnlock("ach-002", violationStreak >= 10, newlyUnlocked);
          this.tryUnlock("ach-003", perfectStreak >= 3, newlyUnlocked);
          this.tryUnlock("ach-024", perfectStreak >= 10, newlyUnlocked);
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
            this.tryUnlock("ach-015", meatFree, newlyUnlocked);
            this.tryUnlock("ach-016", sugarFree, newlyUnlocked);
          }
        }

        // ── Sleep checks (replay same logic as sleep:recorded) ──
        const sortedSleep = [...sleepLogs].sort((a: any, b: any) => (a.sleepTime || "").localeCompare(b.sleepTime || ""));
        this.tryUnlock("ach-041", sortedSleep.length === 1, newlyUnlocked);
        if (sortedSleep.length > 0) {
          const latest = sortedSleep[sortedSleep.length - 1];
          this.tryUnlock("ach-039", (latest.sleepTime || "") <= "22:00", newlyUnlocked);
          const hour = parseInt((latest.sleepTime || "").split(":")[0], 10);
          this.tryUnlock("ach-040", !isNaN(hour) && hour >= 2 && hour <= 4, newlyUnlocked);
          const last3 = sortedSleep.slice(-3);
          this.tryUnlock("ach-037", last3.length >= 3 && last3.every((e: any) => e.duration >= 480), newlyUnlocked);
          this.tryUnlock("ach-043", last3.length >= 3 && last3.every((e: any) => e.duration < 300), newlyUnlocked);
        }
        break;
      }

      case "ingredient:card_viewed": {
        const { viewedCount = 1 } = payload;
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
