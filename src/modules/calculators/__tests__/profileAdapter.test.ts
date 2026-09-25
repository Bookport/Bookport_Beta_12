import { describe, expect, it } from "vitest";
import { toCalculatorProfile } from "../lib/profileAdapter";

describe("адаптер профиля хоста", () => {
  it("понимает сырые поля Bookport", () => {
    expect(toCalculatorProfile({ gender: "female", age: 32, height: 172, weight: 68 })).toEqual({
      gender: "female",
      ageYears: 32,
      heightCm: 172,
      weightKg: 68,
    });
  });

  it("нормализует пол и цель, включая русские варианты", () => {
    expect(toCalculatorProfile({ gender: "ЖЕНСКИЙ", goal: "Снижение" })).toEqual({ gender: "female", goal: "loss" });
    expect(toCalculatorProfile({ gender: "м", goal: "набор" })).toEqual({ gender: "male", goal: "gain" });
  });

  it("выбрасывает то, что не прошло бы ручную валидацию", () => {
    expect(toCalculatorProfile({ age: 7, height: 90, weight: 400, waistCm: 12 })).toEqual({});
  });

  it("терпит строки и запятую вместо точки", () => {
    expect(toCalculatorProfile({ age: "32", weight: "68,5", activity: "1,55" })).toEqual({ ageYears: 32, weightKg: 68.5, activity: 1.55 });
  });

  it("ближайший допустимый множитель активности, а не выдуманный", () => {
    expect(toCalculatorProfile({ activity: 1.5 })).toEqual({ activity: 1.55 });
    expect(toCalculatorProfile({ activity: 1.45 })).toEqual({});
    expect(toCalculatorProfile({ activity: null })).toEqual({});
  });

  it("подтягивает давление из настроек приложения", () => {
    expect(toCalculatorProfile({ systolic: 120, diastolic: 80 })).toEqual({ systolicMmHg: 120, diastolicMmHg: 80 });
    expect(toCalculatorProfile({ systolic: "135", diastolic: "88" })).toEqual({ systolicMmHg: 135, diastolicMmHg: 88 });
    // Вне правил — как и ручной ввод: значение не проходит и не подставляется.
    expect(toCalculatorProfile({ systolic: 300, diastolic: 30 })).toEqual({});
  });

  it("пустой хост даёт пустой профиль, а не объект из undefined", () => {
    expect(toCalculatorProfile(null)).toEqual({});
    expect(toCalculatorProfile({})).toEqual({});
    expect(Object.values(toCalculatorProfile({ gender: null, age: null })).some((value) => value === undefined)).toBe(false);
  });
});
