# Production UI/UX Architecture Report

**Источник:** `kubectl exec -n bookport deployment/bookport -- cat /app/dist/assets/index-DetcCmci.js` (2.46MB compiled bundle)  
**Дата деплоя:** 2026-07-21 13:58  
**Фреймворк:** React + TypeScript (собран в единый SPA-бандл)  
**Стейт-менеджмент:** React Context (7 `createContext`, 25 `useContext`) — без Zustand/Redux  
**Анимации:** Framer Motion (`AnimatePresence`, `motion.div` с initial/animate/exit)  
**Стилизация:** Tailwind CSS + inline `dangerouslySetInnerHTML`  
**Аудио:** Web Audio API (синтез звуков без внешних файлов)  
**Навигация:** Кастомная state-based (`ScreenContext` + `setScreen(id)`) — без React Router  

---

## 1. Дерево экранов и навигация

### Главный контейнер (`App`)
Условный рендеринг экранов через `ScreenContext`:

```
a === "welcome"     ? <WelcomeScreen>     // Онбординг
a === "my-day"      ? <MyDayScreen>        // Главный день (дефолт)
a === "what-i-eat"  ? <WhatIEatScreen>     // Камера/фото
a === "check-composition" ? <CheckCompositionScreen>
a === "dish-analysis" ? <DishAnalysisScreen>
a === "my-dishes"   ? <MyDishesScreen>
a === "from-what-is" ? <FromWhatIsScreen>  // Конструктор рецептов
a === "book-recipes" ? <BookRecipesScreen>
a === "purchases"   ? <PurchasesScreen>    // Сканер штрихкодов
a === "diary"       ? <DiaryScreen>        // Дневник заметок
a === "anna"        ? <AnnaChatScreen>     // Чат с Анной
a === "state-now"   ? <StateNowScreen>     // Состояние сейчас
a === "rewards"     ? <RewardsScreen>      // Достижения/миксер
a === "settings"    ? <SettingsScreen>     // Настройки/профиль
a === "club"        ? <ClubScreen>         // Клуб
```

### Нижняя навигация (BottomNavBar)
Три кнопки:
1. **Главная** (home) — `setScreen("my-day")`
2. **Дневник** (diary) — `setScreen("what-i-eat")` 
3. **Аналитика** (analytics) — `setScreen("habits-twenty")`

Дополнительно: при `<BottomNavBar>` показывается только когда экран НЕ `anna` и НЕ `welcome`.

### Условия рендеринга всплывающих слоёв
- Календарь (overlay)
- Модалка рецепта книги
- Модалка ачивки (`show-achievement-overlay` event)
- Анна overlay панель (при `activeContextPill`)
- Подтверждение блюда (`onConfirmRecipe`)

---

## 2. Анатомия каждого экрана

### 2.1 `welcome` — Онбординг
- Первый экран при первом запуске
- Переключает в `settings` после заполнения
- Идентификатор: `screen_id:"settings"` (onboarding)

### 2.2 `my-day` — Главный экран дня
- **Данные через контекст:** `userProfile`, `dailyMetric`, `savedDishes`, `dayNotes`, `achievementState`
- **Локальный стейт:** `water` (вода), `sleep` (сон), `mealCount`, `activityPoints`, `habitsDone`, `ratingEnergy`, `ratingWellbeing`, `ratingLightness`
- **Компоненты:**
  - Верхняя панель: dayIndicator, имя, `ritualTime` обратный отсчёт
  - Кольца прогресса (воды, сна, еды, активности, привычек)
  - Anna-панель: аватар + фраза/рекомендация
  - Anna overlay panel (контекстная подсказка)
  - Блок вечернего ритуала (если `currentDayIndex >= 7`)
  - Секция анализов дня (`getCaringSupport`)
  - Нижняя навигация
- **API на монтировании:** `/api/user/init`, `/api/user/state-now`
- **Интегральные кнопки:** вода (quick-add), сон (toggle), приёмы пищи
- `screenContext` записывает: `water_ml`, `sleep_minutes`, `meals_completed`, `activity_points`, `habits_completed`, `active_modal_or_overlay`

### 2.3 `what-i-eat` — Что я ем (фото/камера)
- **Локальный стейт:** `photoBase64`, `isAnalyzing`, `analysisResult`, `ingredients`, `retryCount`, `supportMessages`
- **Два входа:** камера (`<input type="file" accept="image/*" capture="environment">`) и галерея
- **Flow:**
  1. Пользователь делает/выбирает фото
  2. `POST /api/analyze-image` (CV-анализ)
  3. Если ошибка — `POST /api/anna-supports` (поддерживающие сообщения)
  4. После успеха — `setScreen("check-composition")` + передача `ingredients`
- **Caring Support:** Циклический опрос `/api/anna-supports` каждые 10 секунд во время анализа
- `screen_id:"what-i-eat"` + `user_input_values:{photo_selected, analysis_status}`

### 2.4 `check-composition` — Проверка состава
- **Входные данные:** `ingredients[]` из `what-i-eat` или `from-what-is`
- **Локальный стейт:** редактирование веса, разрешённые/запрещённые ингредиенты
- **Компоненты:**
  - Список ингредиентов со статусами (green/error/blue)
  - Редактор веса (popup со слайдером)
  - Anna sarcastic reply при non-food (blue)
  - Модалка подтверждения
- **Действие:** `POST /api/analyze-dish` (параллельно LLM + USDA, с индикацией)
- `screen_id:"check-composition"` + `visible_items`, `user_input_values:{editing_ingredient, configured_weight}`

### 2.5 `dish-analysis` — Анализ блюда (результат)
- **Вход:** `result` из `/api/analyze-dish`
- **Компоненты:**
  - Название блюда
  - КБЖУ (калории, белки, жиры, углеводы, клетчатка)
  - Микронутриенты (9 показателей)
  - Инсайты (strengths, improvements, compliance)
  - Anna comment (саркастичный/поддерживающий) — через `POST /api/anna-comment`
  - Кнопка "Сохранить блюдо"
- **Действие:** `POST /api/saved-dishes` + `POST /api/anna-chat` (сохранение истории)
- `screen_id:"dish-analysis"` + `visible_items`, `user_input_values:{dish_name, calories, protein, ...}`

### 2.6 `from-what-is` — Конструктор "Из чего есть"
- **Локальный стейт:** `isLoading` (загрузка рецептов), `selectedCategory`, `selectedRecipe`, `constructorIngredients`
- Паттерн: Multi-step (категория → рецепт → подтверждение)
- **Два компонента:** `RecipesScreen` (категории) + `ConstructorDetail` (ингредиенты)
- `screen_id:"from-what-is"` + `user_input_values:{constructor_completed, selecting_components}`

### 2.7 `book-recipes` — Книга рецептов
- **Данные:** из `RecipesContext` (загружаются при старте)
- **Вкладки:** must_have → breakfast → lunch → dinner → recipe_of_day → drinks
- **Модалка:** `book-recipe-modal-panel` с деталями рецепта
- **Категории:** must_have (зелёный), breakfast (янтарный), lunch (изумрудный), dinner (розовый), recipe_of_day (фиолетовый), drinks (голубой)
- **Действие:** готово (cooked), запланировано, избранное → `POST /api/recipe/progress`
- `screen_id:"book-recipes"`

### 2.8 `my-dishes` — Мои блюда
- **Данные:** `savedDishes[]` из контекста
- **Функции:** toggle избранное, установка категории, удаление
- `screen_id:"my-dishes"`

### 2.9 `purchases` — Покупки (сканирование штрихкодов)
- **Локальный стейт:** `barcodeMode`, `scannedProduct`, `shoppingList`
- **Сканер:** `html5-qrcode` библиотека (браузерный, `getCameras` → `environment`)
- **Flow:**
  1. `scan()` → инициализация камеры `xb` (html5-qrcode)
  2. Поиск: `openfoodfacts.org/api/v2/product/{code}.json`
  3. Fallback: локальный `bf[]` (barcode food DB)
  4. Результат: `POST /api/shopping-list`
- **ScreenContext:** `screen_id:"purchases"` + `barcode`, `brands`, `categories`, `nova_group`
- **Состояния:** `scanning`, `scanned-success`, `searching-db`, `not-found`, `result`, `initializing`, `temp-error`

### 2.10 `diary` — Дневник
- **Локальный стейт:** `dayNotes`, `activeTab` (thoughts | food | health), `isRecording`, `searchQuery`
- **Компоненты:**
  - Canvas фон (амбиент-частицы через Web Audio API)
  - Список заметок (фильтр, поиск, важное)
  - Voice recording (Web Audio API)
  - Time capsule (sealed notes)
- **Типы заметок:** мысли (thoughts), еда (food), здоровье (health)
- **Действие:** `POST /api/diary`, `POST /api/metrics/daily` (digestionLog)
- `screen_id:"diary"` + `userName`, `metrics`, `user_input_values`

### 2.11 `anna` — Чат с Анной
- **Локальный стейт:** `messages[]`, `inputText`, `isVoiceMode`, `isLoading`
- **Flow:**
  1. Text input или голос (через `/api/transcribe-audio`)
  2. `POST /api/anna-chat` (LLM + tool calling)
  3. Если TTS включён — `POST /api/anna-tts` → `AudioContext.play()`
- **Голосовые ответы:** Anna TTS через DashScope (клонированный голос)
- **Overlay-режим:** при `screenContext === "anna-screen"` показывается плавающая панель
- `screen_id:"anna-screen"` + `visible_messages`, `user_input_values:{last_message, tts_enabled}`

### 2.12 `state-now` — Состояние сейчас
- **Данные:** `dailyMetric`, `dailyRating`, `savedDishes`, `dayNotes`, `sleep`, `activityLogs`
- **Компоненты:**
  - Интегральный score (0-100)
  - Сон: качество, рекомендации
  - Вода: норма
  - Еда: количество приёмов
  - Активность: минуты
  - Привычки
  - Anna summary
  - Recommended action
- `isReadOnly` режим
- **Метрики:** `ratingEnergy`, `ratingWellbeing`, `ratingLightness`
- `screen_id:"state-now"`

### 2.13 `rewards` — Достижения и Миксер
- **Компоненты:**
  - Список ачивок (по категориям, rarity)
  - Миксер (spin-to-win рецептов, Wheel of Fortune)
  - Achievement overlay (при показе ачивки)
- **Стейт:** `selectedId`, `queueLength`, `isDisplaying`
- `POST /api/achievements/check-pending`, `POST /api/achievements/mark-shown`

### 2.14 `settings` — Настройки/Профиль
- **Поля:** имя, пол, возраст, рост, вес, давление, хронические болезни, цели, `ritualTime`
- **Компоненты:**
  - Onboarding flow (при первом входе)
  - Health goals selection (чекбоксы)
  - Chronic conditions
  - `POST /api/user/profile`
- `screen_id:"settings"` (также используется при онбординге)

### 2.15 `club` — Клуб
- Stub-экран («Клуб скоро будет доступен»)

### 2.16 `habits-twenty` — Системные ключи / Привычки
- **Компоненты:** `SystemKeysScreen` (xO)
- Категории продуктов: legumes, whole_grains, vegetables, leafy_greens, nuts, seeds, ground_flax, spices, fruits, berries, sprouts, must_have, healthy_drinks
- Прогресс по каждому ключу: `calculateKeysForDay()`
- **Действие:** сохранение прогресса через `updateManualKey()`

---

## 3. Context-провайдеры и глобальный стейт

| Контекст | refs | Назначение |
|----------|------|-----------|
| `ScreenContext` | 34 | Текущий экран (`setScreen(id)`), история навигации |
| `AudioContext` | 15 | Web Audio API для звуковых эффектов и TTS |
| `CanvasContext` | 9 | Canvas для фоновых анимаций |
| `RecipesContext` | 4 | Данные книги рецептов (загружаются при старте) |
| `DataContext` | 2 | Глобальные данные устройства (deviceId, userProfile) |
| `AnalysisProvider` | 1 | Состояние анализа блюда |
| `TextProvider` | 1 | Текстовые константы |

### `localStorage` ключи (14 обращений):
- `initData` — Telegram Init Data
- `deviceId` — ID устройства
- `telegramUser` — данные пользователя Telegram
- `launch_token` — токен для доступа (purchase flow)

---

## 4. Точки входа и инициализация

### HTML entry (`index.html`)
```html
<script src="https://telegram.org/js/telegram-web-app.js"></script>
<div id="root"></div>
```

### App init flow:
1. `window.Telegram.WebApp` — глобальный объект Telegram
2. Чтение `initData` из localStorage или `window.Telegram.WebApp.initData`
3. `POST /api/user/init` — создание/обновление пользователя, авто-advance `currentDayIndex`
4. `GET /api/user/data` — агрегированные данные (profile, dishes, diary, recipeProgress, achievements)
5. Загрузка книги рецептов в `RecipesContext`
6. Определение первого экрана:
   - Если `user.hasSavedSettings === false` → `welcome` → `settings`
   - Иначе → `my-day`

### Purchase/Access flow:
- `launch_token` в localStorage
- `/api/access` endpoint (новый, не было в локальной версии)
- При покупке: WordPress → `POST /api/purchase/register` → Telegram bot link → `/start {purchase_token}` → upsert user + `purchasedAt`

---

## 5. Ключевые особенности

### Аудио-дизайн
- Все звуки синтезируются через Web Audio API (OSCillator + Gain + BiquadFilter)
- 6+ звуковых схем: click, success, error, water-pour, movement-start, movement-done
- TTS Анны через внешний API (DashScope) с клонированным голосом

### Обработка фото
- Только через браузерный `input[type=file]` + `FileReader` → base64
- Нет нативного Camera API (navigator.mediaDevices) для основных фото
- Barcode-сканирование через `html5-qrcode` (браузерная библиотека)

### Ачивки
- Фронтовый класс `AchievementManager` (nY) управляет очередью
- Показ ачивок через CustomEvent `show-achievement-overlay`
- `/api/achievements/check-pending` — 2-часовой троттлинг на сервере
- `/api/achievements/mark-shown` — подтверждение просмотра

### Anna Chat
- Text + Voice input
- TTS-воспроизведение ответов
- Floating overlay-режим на других экранах
- Tool calling (8 functions) + LLM cascade

### ScreenContext (window глобал)
- Каждый экран записывает себя в `window.currentScreenContext` + очищает при unmount
- Передаёт `screen_id`, `screen_title`, `user_input_values`, `metrics`, `visible_items`
- Используется для передачи контекста в Anna-chat (без ручного указания экрана)
