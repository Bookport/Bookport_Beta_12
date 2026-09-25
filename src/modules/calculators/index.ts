/**
 * Модуль «Калькуляторы».
 *
 * Подключение к приложению — двумя строками в `src/App.tsx`:
 *
 *   <CalculatorsWindow />                                   // host/CalculatorsWindow.tsx
 *   ) : screen === "calculators" ? null : (                  // ветка-заглушка в цепочке
 *
 * Окно само берёт `userProfile` из стора и закрывается на `setScreen("my-day")`.
 * Сам экран подключается и напрямую:
 *
 *   <CalculatorsScreen profile={user} onClose={() => setScreen("my-day")} />
 *
 * `profile` принимает как канонические поля (`ageYears`, `weightKg`), так и то,
 * что обычно лежит в модели пользователя (`age`, `weight`, `height`, `gender`,
 * а также `systolic`/`diastolic` из настроек). Закрытие ведёт на главный экран
 * приложения, а не на тот экран, откуда модуль открыли.
 *
 * Правки пользователя модуль держит в собственном кэше (`lib/profileStorage`,
 * ключ `calculators.profile.v1`) — они переживают закрытие окна и перезагрузку,
 * но в стор приложения не пишутся. Если хост после правки отдаёт другое
 * значение, оно считается свежим и перекрывает кэш.
 */

export { default as CalculatorsScreen } from "./screens/CalculatorsScreen";
export type { CalculatorsScreenProps } from "./screens/CalculatorsScreen";

export { ProfileProvider, useProfile } from "./contexts/ProfileContext";
export { toCalculatorProfile, type HostProfile } from "./lib/profileAdapter";
export { calculators, calculatorById, categoryMeta, categoryOrder, type CalculatorCategory, type CalculatorDefinition, type CalculatorId } from "./lib/calculatorCatalog";
export { readProfile, readinessCopy, profileFieldLabels } from "./lib/profileReadiness";
export type { ActivityLevel, CalorieGoal, CalculatorProfile, Gender } from "./types";
