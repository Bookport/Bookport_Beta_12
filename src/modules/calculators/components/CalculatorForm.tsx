/*
 * Форма калькулятора. Личные данные берутся из профиля экрана (`useProfile`),
 * поэтому правка веса в одном калькуляторе видна во всех. Нейтральные параметры
 * расчёта (темп, длительность, целевая калорийность) живут в локальном черновике.
 */

import { useState, type ReactNode } from "react";
import { goalOptions, type CalculatorProfile, type Gender } from "../types";
import { useProfile } from "../contexts/ProfileContext";
import { disabledReason } from "../lib/validation";
import { profileFieldLabels, profileFieldOrder } from "../lib/profileReadiness";
import { GhostButton, NumericField, PaceField, PrimaryButton, RadioCards, ResultCard, SelectField, StateNote, type RadioOption } from "./fields";
import { BaseProfileFields, ProfileActivity, ProfileGender, ProfileGoal, ProfileNumber } from "./ProfileFields";
import type { CalculatorId } from "../lib/calculatorCatalog";
import {
  calculateActivityCalories,
  calculateBmi,
  calculateBmr,
  calculateCalorieGoal,
  calculateHeartRateZones,
  calculateIdealWeightRange,
  calculateMacroGrams,
  calculateMovementSpeed,
  calculatePaceDistance,
  calculateProteinRange,
  calculateStepsDistance,
  calculateStepGoal,
  calculateTdee,
  calculateUSNavyBodyFat,
  calculateWalkingPace,
  calculateWaistToHeight,
  calculateWaistToHip,
  calculateWeightTimeline,
  distributeMacros,
  formatMinutes,
  formatPace,
  macroSplits,
  runningPaces,
  walkingPaces,
  bodyInputsFrom,
  withActivity,
  type MacroPresetId,
  type MealPlan,
  type PaceDistanceMode,
  type ProteinGoal,
  type RunningPace,
  type WalkingPace,
} from "../lib/calculatorMath";

const rates: Array<{ value: string; label: string }> = [
  { value: "0.25", label: "0,25 кг в неделю" },
  { value: "0.5", label: "0,5 кг в неделю" },
  { value: "0.75", label: "0,75 кг в неделю" },
  { value: "1", label: "1 кг в неделю" },
];

const macroSections = (Object.keys(macroSplits) as Array<MacroPresetId>).reduce<Array<{ heading?: string; columns?: 1 | 2 | 3; options: Array<RadioOption<MacroPresetId>> }>>((sections, id, index) => {
  const option: RadioOption<MacroPresetId> = {
    value: id,
    label: macroSplits[id].label,
    hint: `Б ${macroSplits[id].percentages.protein}% · Ж ${macroSplits[id].percentages.fat}% · У ${macroSplits[id].percentages.carbs}%`,
  };
  const standard = index < 3;
  const heading = standard ? "Стандартные" : "Всё дело в еде!";
  const last = sections[sections.length - 1];
  if (last?.heading === heading) last.options.push(option);
  else sections.push({ heading, columns: standard ? 3 : 1, options: [option] });
  return sections;
}, []);

type FormSpec = { fields: ReactNode; result: ReactNode; missing: Array<keyof CalculatorProfile> };

export function CalculatorForm({ calculatorId, onOpenProfile, onDone }: { calculatorId: CalculatorId; onOpenProfile?: () => void; onDone?: () => void }) {
  const { profile } = useProfile();
  const [numbers, setNumbers] = useState<Record<string, number | undefined>>({});
  const [rate, setRate] = useState("0.5");
  const [macroPreset, setMacroPreset] = useState<MacroPresetId>("balanced");
  const [proteinGoal, setProteinGoal] = useState<ProteinGoal>("maintain");
  const [mealPlan, setMealPlan] = useState<MealPlan>("threePlusSnack");
  const [walkingPace, setWalkingPace] = useState<WalkingPace>("usual");
  const [runningPace, setRunningPace] = useState<RunningPace>("easy");
  const [paceMode, setPaceMode] = useState<PaceDistanceMode>("time");

  const number = (key: string) => numbers[key];
  const setNumber = (key: string) => (value: number | undefined) => setNumbers((current) => ({ ...current, [key]: value }));
  /** Порядок подсказки фиксированный (как в подписях полей), а не по порядку аргументов. */
  const need = (...fields: Array<keyof CalculatorProfile>) =>
    fields
      .filter((field) => profile[field] === undefined)
      .sort((a, b) => profileFieldOrder.indexOf(a) - profileFieldOrder.indexOf(b));
  /** Пол — обязательный аргумент части формул, но в профиле он может отсутствовать. */
  const withGender = <T,>(calculate: (gender: Gender) => T): T | null => (profile.gender === undefined ? null : calculate(profile.gender));

  const body = bodyInputsFrom(profile);
  const energy = withActivity(body, profile.activity);
  const bmr = body === null ? null : calculateBmr(body);
  const tdee = energy === null ? null : calculateTdee(energy);

  const spec = ((): FormSpec => {
    switch (calculatorId) {
      case "bmr":
        return {
          fields: <BaseProfileFields />,
          result: body === null ? null : <ResultCard eyebrow="Базовый обмен" value={String(bmr)} unit="ккал" note="Энергия, которую тело расходует в покое." accent="#B95D47" />,
          missing: need("gender", "ageYears", "weightKg", "heightCm"),
        };

      case "tdee":
        return {
          fields: <BaseProfileFields includeActivity />,
          result: energy === null ? null : (
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              <ResultCard eyebrow="Базовый обмен" value={String(bmr)} unit="ккал" accent="#B95D47" />
              <ResultCard eyebrow="Суточный расход" value={String(tdee)} unit="ккал" note="Ориентир энергии с учётом активности." accent="#A65E3B" />
            </div>
          ),
          missing: need("gender", "ageYears", "weightKg", "heightCm", "activity"),
        };

      case "bmi": {
        const bmi = body === null ? null : calculateBmi(body.weight, body.height);
        return {
          fields: <BaseProfileFields />,
          result: bmi === null ? null : <ResultCard eyebrow="Индекс массы тела" value={bmi.value.toFixed(1)} note={bmi.category} accent="#6972A4" />,
          missing: need("gender", "ageYears", "weightKg", "heightCm"),
        };
      }

      case "calorie-goal": {
        const goal = energy === null || profile.goal === undefined ? null : calculateCalorieGoal(energy, profile.goal);
        return {
          fields: (
            <div className="space-y-4">
              <BaseProfileFields includeActivity />
              <ProfileGoal />
            </div>
          ),
          result: goal === null ? null : <ResultCard eyebrow="Ваш диапазон" value={`${goal.lower}–${goal.upper}`} unit="ккал" note={`Целевое значение: ${goal.goalCalories} ккал · Суточный расход: ${tdee} ккал · Базовый обмен: ${bmr} ккал`} accent="#9B651F" />,
          missing: need("gender", "ageYears", "weightKg", "heightCm", "activity", "goal"),
        };
      }

      case "weight-timeline": {
        const timeline = body === null ? null : calculateWeightTimeline(body.weight, number("targetWeight") ?? NaN, Number(rate));
        return {
          fields: (
            <div className="grid gap-4 sm:grid-cols-2">
              <ProfileNumber field="weightKg" label="Текущий вес" />
              <NumericField label="Целевой вес" unit="кг" fieldId="target-weight" value={number("targetWeight")} rule={{ label: "Целевой вес", min: 30, max: 300, positive: true }} step={0.1} onChange={setNumber("targetWeight")} />
              <div className="sm:col-span-2">
                <SelectField label="Темп изменения" value={rate} onChange={setRate}>
                  {rates.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </SelectField>
              </div>
            </div>
          ),
          result: timeline === null ? null : (
            <ResultCard
              eyebrow="Ориентировочный срок"
              value={String(timeline.weeks)}
              unit="нед."
              note={`Ориентировочная дата завершения: ${timeline.completionDate.toLocaleDateString("ru-RU")}. ${timeline.capped ? "Расчёт ограничен горизонтом в 5 лет: реальный темп почти никогда не бывает ровным." : "Оценка ровного темпа; ориентируйтесь на динамику, а не на точную дату."}`}
              accent="#B4565F"
            />
          ),
          missing: need("weightKg"),
        };
      }

      case "macro-goal":
      case "meal-macros": {
        const targetKcal = number("targetKcal");
        const macros = targetKcal === undefined ? null : calculateMacroGrams(targetKcal, macroSplits[macroPreset].percentages);
        const kcalField = (
          <div className="space-y-2">
            <NumericField label="Целевая калорийность" unit="ккал" fieldId="target-kcal" value={targetKcal} rule={{ label: "Целевая калорийность", min: 800, max: 10000, integer: true, positive: true }} onChange={setNumber("targetKcal")} />
            {targetKcal === undefined && tdee !== null && <GhostButton label={`Взять суточный расход: ${tdee} ккал`} onClick={() => setNumber("targetKcal")(tdee)} />}
          </div>
        );
        if (calculatorId === "macro-goal") {
          return {
            fields: (
              <div className="space-y-4">
                {kcalField}
                <RadioCards<MacroPresetId> legend="Пропорция КБЖУ" value={macroPreset} sections={macroSections} onChange={setMacroPreset} />
              </div>
            ),
            result: macros === null ? null : (
              <div className="grid min-w-0 grid-cols-3 gap-2">
                <ResultCard compact eyebrow="Белки" value={String(macros.protein)} unit="г" accent="#507C5F" />
                <ResultCard compact eyebrow="Жиры" value={String(macros.fat)} unit="г" accent="#B95D47" />
                <ResultCard compact eyebrow="Углеводы" value={String(macros.carbs)} unit="г" accent="#587E8A" />
              </div>
            ),
            missing: [],
          };
        }
        return {
          fields: (
            <div className="space-y-4">
              {kcalField}
              <RadioCards<MacroPresetId> legend="Пропорция КБЖУ" value={macroPreset} sections={macroSections} onChange={setMacroPreset} />
              <SelectField label="Схема питания" value={mealPlan} onChange={(value) => setMealPlan(value as MealPlan)}>
                <option value="three">3 приёма пищи</option>
                <option value="threePlusSnack">3 приёма + 1 перекус</option>
              </SelectField>
            </div>
          ),
          result: macros === null ? null : <MacroRows macros={macros} plan={mealPlan} />,
          missing: [],
        };
      }

      case "protein": {
        const protein = calculateProteinRange(profile.weightKg ?? NaN, proteinGoal, profile.activity ?? NaN);
        return {
          fields: (
            <div className="grid gap-4 sm:grid-cols-2">
              <ProfileNumber field="weightKg" />
              <SelectField label="Цель" value={proteinGoal} onChange={(value) => setProteinGoal(value as ProteinGoal)}>
                {goalOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </SelectField>
              <div className="sm:col-span-2"><ProfileActivity /></div>
            </div>
          ),
          result: protein === null ? null : <ResultCard eyebrow="Диапазон белка" value={`${protein.min}–${protein.max}`} unit="г/день" note="Коэффициент выбран по цели и уровню активности." accent="#507C5F" />,
          missing: need("weightKg", "activity"),
        };
      }

      case "ideal-weight": {
        const ideal = withGender((gender) => calculateIdealWeightRange(gender, profile.heightCm ?? NaN));
        return {
          fields: (
            <div className="grid gap-4 sm:grid-cols-2">
              <ProfileGender />
              <ProfileNumber field="heightCm" />
            </div>
          ),
          result: ideal === null ? null : <ResultCard eyebrow="Ориентир по формуле Devine" value={`${ideal.min}–${ideal.max}`} unit="кг" note={`Центральное значение: ${ideal.reference} кг. ${ideal.formulaLabel}. Формула описывает взрослых, это не медицинская норма.`} accent="#8A6C9A" />,
          missing: need("gender", "heightCm"),
        };
      }

      case "waist-height": {
        const ratio = calculateWaistToHeight(profile.waistCm ?? NaN, profile.heightCm ?? NaN);
        return {
          fields: (
            <div className="grid gap-4 sm:grid-cols-2">
              <ProfileNumber field="heightCm" />
              <ProfileNumber field="waistCm" />
            </div>
          ),
          result: ratio === null ? null : <ResultCard eyebrow="Талия / рост" value={ratio.value.toFixed(2)} note={`${ratio.status}. ${ratio.interpretation}`} accent="#6972A4" />,
          missing: need("heightCm", "waistCm"),
        };
      }

      case "waist-hip": {
        const ratio = withGender((gender) => calculateWaistToHip(profile.waistCm ?? NaN, profile.hipsCm ?? NaN, gender));
        return {
          fields: (
            <div className="space-y-4">
              <ProfileGender />
              <div className="grid gap-4 sm:grid-cols-2">
                <ProfileNumber field="waistCm" />
                <ProfileNumber field="hipsCm" />
              </div>
            </div>
          ),
          result: ratio === null ? null : <ResultCard eyebrow="Талия / бёдра" value={ratio.value.toFixed(2)} note={`${ratio.status}. ${ratio.interpretation}`} accent="#B4565F" />,
          missing: need("gender", "waistCm", "hipsCm"),
        };
      }

      case "body-fat": {
        const bodyFat = profile.gender === undefined ? null : calculateUSNavyBodyFat(profile.gender, profile.heightCm ?? NaN, profile.waistCm ?? NaN, profile.neckCm ?? NaN, profile.hipsCm);
        return {
          fields: (
            <div className="grid gap-4 sm:grid-cols-2">
              <ProfileGender />
              <ProfileNumber field="heightCm" />
              <ProfileNumber field="waistCm" />
              <ProfileNumber field="neckCm" />
              {profile.gender === "female" && <ProfileNumber field="hipsCm" />}
            </div>
          ),
          result: bodyFat === null ? null : <ResultCard eyebrow="Оценка процента жира" value={bodyFat.percentage.toFixed(1)} unit="%" note={`${bodyFat.category}. ${bodyFat.formulaLabel}. Это ориентировочная оценка, не медицинское измерение.`} accent="#8A6C9A" />,
          missing: profile.gender === "female" ? need("gender", "heightCm", "waistCm", "neckCm", "hipsCm") : need("gender", "heightCm", "waistCm", "neckCm"),
        };
      }

      case "walking-calories":
      case "running-calories": {
        const isWalking = calculatorId === "walking-calories";
        const met = isWalking ? walkingPaces[walkingPace].met : runningPaces[runningPace].met;
        const paceLabel = isWalking ? walkingPaces[walkingPace].label : runningPaces[runningPace].label;
        const paceEntries = Object.entries(isWalking ? walkingPaces : runningPaces);
        const calories = calculateActivityCalories(profile.weightKg ?? NaN, number("duration") ?? NaN, met);
        return {
          fields: (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <ProfileNumber field="weightKg" />
                <NumericField label="Длительность" unit="мин" fieldId="duration" value={number("duration")} rule={{ label: "Длительность", min: 1, max: 1440, positive: true }} onChange={setNumber("duration")} />
              </div>
              <SelectField label={isWalking ? "Темп ходьбы" : "Темп бега"} value={isWalking ? walkingPace : runningPace} onChange={(value) => (isWalking ? setWalkingPace(value as WalkingPace) : setRunningPace(value as RunningPace))}>
                {paceEntries.map(([key, pace]) => <option key={key} value={key}>{pace.label}</option>)}
              </SelectField>
            </div>
          ),
          result: calories === null ? null : <ResultCard eyebrow="Ориентировочный расход" value={String(calories)} unit="ккал" note={`Оценка по MET для темпа «${paceLabel}». Результат приблизительный.`} accent={isWalking ? "#568567" : "#70648C"} />,
          missing: need("weightKg"),
        };
      }

      case "steps-distance": {
        const distance = calculateStepsDistance(number("steps") ?? NaN, number("stride") ?? NaN);
        return {
          fields: (
            <div className="grid gap-4 sm:grid-cols-2">
              <NumericField label="Количество шагов" unit="шагов" fieldId="steps" value={number("steps")} rule={{ label: "Количество шагов", min: 1, max: 200000, positive: true }} onChange={setNumber("steps")} />
              <NumericField label="Длина шага" unit="см" fieldId="stride" value={number("stride")} rule={{ label: "Длина шага", min: 20, max: 200, positive: true }} step={0.1} onChange={setNumber("stride")} />
            </div>
          ),
          result: distance === null ? null : <ResultCard eyebrow="Примерное расстояние" value={distance.toFixed(2)} unit="км" note="Расчёт использует только число шагов и введённую длину шага; данные устройства не используются." accent="#5D7B99" />,
          missing: [],
        };
      }

      case "step-goal": {
        const goal = calculateStepGoal(number("currentSteps") ?? NaN, number("targetSteps") ?? NaN);
        return {
          fields: (
            <div className="grid gap-4 sm:grid-cols-2">
              <NumericField label="Текущие шаги" unit="шагов" fieldId="current-steps" value={number("currentSteps")} rule={{ label: "Текущие шаги", min: 0, max: 200000, positive: false }} onChange={setNumber("currentSteps")} />
              <NumericField label="Целевые шаги" unit="шагов" fieldId="target-steps" value={number("targetSteps")} rule={{ label: "Целевые шаги", min: 1, max: 200000, positive: true }} onChange={setNumber("targetSteps")} />
            </div>
          ),
          result: goal === null ? null : <ResultCard eyebrow={goal.status} value={String(goal.remaining)} unit="шагов осталось" note={`${goal.percentage}% выполнения. Если текущие шаги выше цели, остаток ограничен нулём.`} accent="#66805D" />,
          missing: [],
        };
      }

      case "heart-zones": {
        const zones = calculateHeartRateZones(profile.ageYears ?? NaN, profile.restingHeartRateBpm ?? NaN);
        return {
          fields: (
            <div className="grid gap-4 sm:grid-cols-2">
              <ProfileNumber field="ageYears" />
              <ProfileNumber field="restingHeartRateBpm" />
            </div>
          ),
          result: zones === null ? null : (
            <div className="space-y-2">
              {zones.map((zone) => (
                <div key={zone.label} className="flex items-center justify-between rounded-xl bg-[#F9E3E3] px-4 py-3 text-sm">
                  <span className="font-semibold text-[#1E293B]">{zone.label}</span>
                  <span className="font-semibold text-[#A65459]">{zone.low}–{zone.high} уд/мин</span>
                </div>
              ))}
              <p className="pt-2 text-xs leading-5 text-[#475569]">Ориентир по формуле Карвонена и оценке максимального пульса 220 − возраст; это не медицинская рекомендация.</p>
            </div>
          ),
          missing: need("ageYears", "restingHeartRateBpm"),
        };
      }

      case "pace": {
        const distance = number("paceDistance");
        const time = number("paceTime");
        const pace = number("paceMmSs");
        const result = paceMode === "time"
          ? calculatePaceDistance("time", distance, undefined, pace)
          : paceMode === "distance"
            ? calculatePaceDistance("distance", undefined, time, pace)
            : calculatePaceDistance("pace", distance, time, undefined);
        return {
          fields: (
            <div className="space-y-4">
              <SelectField label="Режим расчёта" value={paceMode} onChange={(value) => setPaceMode(value as PaceDistanceMode)}>
                <option value="time">Рассчитать время</option>
                <option value="distance">Рассчитать дистанцию</option>
                <option value="pace">Рассчитать темп</option>
              </SelectField>
              <div className="grid gap-4 sm:grid-cols-2">
                {paceMode !== "distance" && <NumericField label="Дистанция" unit="км" fieldId="pace-distance" value={distance} rule={{ label: "Дистанция", min: 0.01, max: 1000, positive: true }} step={0.01} onChange={setNumber("paceDistance")} />}
                {paceMode !== "time" && <NumericField label="Время" unit="мин" fieldId="pace-time" value={time} rule={{ label: "Время", min: 0.01, max: 100000, positive: true }} step={0.01} onChange={setNumber("paceTime")} />}
              </div>
              {paceMode !== "pace" && <PaceField label="Темп, ММ:СС / км" value={pace} onValueChange={setNumber("paceMmSs")} />}
            </div>
          ),
          result: result === null ? null : (
            <div className="grid min-w-0 gap-3 sm:grid-cols-3">
              <ResultCard eyebrow="Дистанция" value={result.distanceKm.toFixed(2)} unit="км" accent="#5D7B99" />
              <ResultCard eyebrow="Время" value={formatMinutes(result.timeMinutes)} unit="мин" accent="#6F6998" />
              <ResultCard compact eyebrow="Темп" value={formatPace(result.paceMinutesPerKm)} accent="#8D694C" />
            </div>
          ),
          missing: [],
        };
      }

      case "walking-pace": {
        const result = calculateWalkingPace(number("walkDistance") ?? NaN, number("walkTime") ?? NaN);
        return {
          fields: (
            <div className="grid gap-4 sm:grid-cols-2">
              <NumericField label="Дистанция" unit="км" fieldId="walk-distance" value={number("walkDistance")} rule={{ label: "Дистанция", min: 0.01, max: 1000, positive: true }} step={0.01} onChange={setNumber("walkDistance")} />
              <NumericField label="Время" unit="мин" fieldId="walk-time" value={number("walkTime")} rule={{ label: "Время", min: 0.01, max: 100000, positive: true }} step={0.01} onChange={setNumber("walkTime")} />
            </div>
          ),
          result: result === null ? null : (
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              <ResultCard eyebrow="Темп ходьбы" value={formatPace(result.paceMinutesPerKm)} accent="#6F6998" />
              <ResultCard eyebrow="Средняя скорость" value={result.speedKmh.toFixed(2)} unit="км/ч" accent="#568567" />
            </div>
          ),
          missing: [],
        };
      }

      case "movement-speed": {
        const speed = calculateMovementSpeed(number("moveDistance") ?? NaN, number("moveTime") ?? NaN);
        return {
          fields: (
            <div className="grid gap-4 sm:grid-cols-2">
              <NumericField label="Дистанция" unit="км" fieldId="move-distance" value={number("moveDistance")} rule={{ label: "Дистанция", min: 0.01, max: 1000, positive: true }} step={0.01} onChange={setNumber("moveDistance")} />
              <NumericField label="Время" unit="мин" fieldId="move-time" value={number("moveTime")} rule={{ label: "Время", min: 0.01, max: 100000, positive: true }} step={0.01} onChange={setNumber("moveTime")} />
            </div>
          ),
          result: speed === null ? null : <ResultCard eyebrow="Средняя скорость" value={speed.toFixed(2)} unit="км/ч" note="Расчёт не учитывает остановки, уклон и покрытие." accent="#8D694C" />,
          missing: [],
        };
      }

      default: {
        // Полнота покрытия `CalculatorId` проверяется компилятором.
        const uncovered: never = calculatorId;
        return uncovered;
      }
    }
  })();

  const canCompute = spec.result !== null;

  return (
    <div className="space-y-6">
      {spec.fields}
      {canCompute ? spec.result : (
        <StateNote
          text={`${disabledReason}.`}
          hint={spec.missing.length > 0 ? `Не заполнено: ${spec.missing.map((field) => profileFieldLabels[field]).join(", ")}.` : undefined}
          action={spec.missing.length > 0 && onOpenProfile ? <GhostButton label="Заполнить личные данные" onClick={onOpenProfile} /> : undefined}
        />
      )}
      <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-[#64748B]">Расчёт выполняется на устройстве и никуда не сохраняется.</p>
        <PrimaryButton label="Готово" disabled={!canCompute} reason={disabledReason} onClick={() => onDone?.()} />
      </div>
    </div>
  );
}
function MacroRows({ macros, plan }: { macros: { protein: number; fat: number; carbs: number }; plan: MealPlan }) {
  return (
    <div className="grid min-w-0 gap-3 sm:grid-cols-2">
      {distributeMacros(macros, plan).map((meal) => (
        <div key={meal.label} className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <span className="min-w-0 break-words font-semibold text-[#1E293B]">{meal.label}</span>
            <span className="shrink-0 text-xs text-[#64748B]">{meal.percentage}%</span>
          </div>
          <div className="mt-3 grid min-w-0 grid-cols-3 gap-2 text-center text-xs">
            <span className="min-w-0 break-words rounded-lg bg-[#E3F1E5] px-2 py-2 text-[#507C5F]"><b className="block text-sm">{meal.protein}</b>белка</span>
            <span className="min-w-0 break-words rounded-lg bg-[#FBE4DA] px-2 py-2 text-[#B95D47]"><b className="block text-sm">{meal.fat}</b>жиров</span>
            <span className="min-w-0 break-words rounded-lg bg-[#E1F0F2] px-2 py-2 text-[#587E8A]"><b className="block text-sm">{meal.carbs}</b>угл.</span>
          </div>
        </div>
      ))}
    </div>
  );
}
