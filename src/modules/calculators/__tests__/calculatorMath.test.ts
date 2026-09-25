import { describe, expect, it } from "vitest";
import {
  BODY_FAT_RANGE,
  MAX_TIMELINE_WEEKS,
  type BodyInputs,
  bodyInputsFrom,
  calculateHeartRateZones,
  calculateIdealWeightRange,
  calculateMacroGrams,
  calculatePaceDistance,
  calculateTdee,
  calculateUSNavyBodyFat,
  calculateWeightTimeline,
  distributeMacros,
  formatMinutes,
  macroSplits,
  parsePaceMmSs,
  withActivity,
} from "../lib/calculatorMath";

const body: BodyInputs = { gender: "female", age: 32, weight: 68, height: 172 };

describe("профиль → входы расчёта", () => {
  it("не выдумывает данные, которых нет", () => {
    expect(bodyInputsFrom({ gender: "female", ageYears: 32, heightCm: 172 })).toBeNull();
    expect(bodyInputsFrom({ gender: "female", ageYears: 32, heightCm: 172, weightKg: 68 })).toEqual({ gender: "female", age: 32, weight: 68, height: 172 });
  });

  it("активность — отдельный вход: BMR без неё считается, TDEE нет", () => {
    expect(withActivity(body, undefined)).toBeNull();
    expect(calculateTdee({ ...body, activity: 1.55 })).toBe(2223);
  });
});

describe("границы правдоподобия", () => {
  it("US Navy не отдаёт физиологически невозможный процент жира", () => {
    expect(calculateUSNavyBodyFat("male", 175, 40, 39)).toBeNull();
    expect(calculateUSNavyBodyFat("male", 175, 250, 20)).toBeNull();
    const value = calculateUSNavyBodyFat("male", 175, 90, 38)?.percentage ?? 0;
    expect(value).toBeGreaterThanOrEqual(BODY_FAT_RANGE.min);
    expect(value).toBeLessThanOrEqual(BODY_FAT_RANGE.max);
  });

  it("для женщин бёдра обязательны", () => {
    expect(calculateUSNavyBodyFat("female", 168, 78, 33)).toBeNull();
    expect(calculateUSNavyBodyFat("female", 168, 78, 33, 96)).not.toBeNull();
  });

  it("срок цели ограничен горизонтом и помечен как ограниченный", () => {
    const timeline = calculateWeightTimeline(150, 60, 0.25, new Date("2026-01-01"));
    expect(timeline?.weeks).toBe(MAX_TIMELINE_WEEKS);
    expect(timeline?.capped).toBe(true);
    expect(calculateWeightTimeline(70, 68, 0.5)?.capped).toBe(false);
    expect(calculateWeightTimeline(70, 70, 0.5)?.weeks).toBe(0);
    expect(calculateWeightTimeline(70, 68, 0)).toBeNull();
  });

  it("пульсовые зоны не строятся, если пульс в покое выше максимального", () => {
    expect(calculateHeartRateZones(30, 210)).toBeNull();
    expect(calculateHeartRateZones(30, 60)?.[0]).toMatchObject({ label: "Разминка", low: 125, high: 138 });
  });

  it("идеальный вес считается только по осмысленному росту", () => {
    expect(calculateIdealWeightRange("male", 0)).toBeNull();
    expect(calculateIdealWeightRange("male", 175)?.reference).toBe(70.5);
  });
});

describe("формат темпа", () => {
  it("принимает ММ:СС и отвергает всё остальное", () => {
    expect(parsePaceMmSs("06:40")).toBeCloseTo(6 + 40 / 60, 4);
    expect(parsePaceMmSs(" 6:40 ")).toBeCloseTo(6 + 40 / 60, 4);
    expect(parsePaceMmSs("6.4")).toBeNull();
    expect(parsePaceMmSs("6,4")).toBeNull();
    expect(parsePaceMmSs("06:60")).toBeNull();
    expect(parsePaceMmSs("")).toBeNull();
  });

  it("из двух величин восстанавливается третья", () => {
    expect(calculatePaceDistance("time", 5, undefined, 6 + 40 / 60)?.timeMinutes).toBeCloseTo(33.33, 2);
    expect(calculatePaceDistance("distance", undefined, 33.33, 6 + 40 / 60)?.distanceKm).toBeCloseTo(5, 1);
    expect(calculatePaceDistance("pace", 5, 33.33)?.paceMinutesPerKm).toBeCloseTo(6.67, 2);
    expect(formatMinutes(33.333)).toBe("33.33");
    expect(formatMinutes(30)).toBe("30");
  });
});

describe("КБЖУ", () => {
  it("пропорции дают граммы, а схема питания — сто процентов", () => {
    expect(calculateMacroGrams(2200, macroSplits.balanced.percentages)).toEqual({ protein: 165, fat: 73, carbs: 220 });
    expect(distributeMacros({ protein: 165, fat: 73, carbs: 220 }, "three").reduce((sum, meal) => sum + meal.percentage, 0)).toBe(100);
  });
});
