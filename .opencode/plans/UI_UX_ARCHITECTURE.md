# Bookport 12.0 Beta — UI/UX Architecture Report

## 1. Screen Tree (Navigation Graph)

```
welcome ──► settings ──► my-day ◄────────────────────── (central hub)
                              │
              ┌───────────────┼───────────────┬──────────────────┐
              ▼               ▼               ▼                  ▼
         my-page         habits-twenty     what-i-eat        diary
              │               │               │
              ▼               ▼               ▼
         settings        my-day (save)    check-composition
                                              │
                                              ▼
                                          dish-analysis
                                              │
                                              ▼
                                          my-dishes

  my-day ──► digestion ──► my-day
  my-day ──► diary ──► my-day
  my-day ──► purchases ──► my-day
  my-day ──► book-recipes ──► my-day
  my-day ──► from-what-is ──► check-composition ──► dish-analysis ──► my-dishes
  my-day ──► anna ──► my-day
  my-day ──► state-now ──► my-day
  my-day ──► club ──► my-day
  my-day ──► rewards ──► my-day (via custom event)
  anna ──► (held by BottomBar: anna-overlay-start-press / anna-overlay-cancel-press)
```

### Routing Mechanism

Single-page app: all routing is **conditional rendering** in `src/App.tsx:1168-1648` via a chained ternary inside `<AnimatePresence mode="wait">`. The active screen is a single string (`Screen` union type) stored in the Zustand store. Transitions use `motion/react` for enter/exit animations.

### Full Screen Registry (16 screens)

| Screen | Component | Lines in App.tsx |
|--------|-----------|-----------------|
| `welcome` | Inline (GlassRing, StartButton, BottomBar) | 1169-1261 |
| `my-page` | `<MyPageScreen>` | 1262-1279 |
| `digestion` | `<DigestionScreen>` | 1280-1294 |
| `habits-twenty` | `<HabitsTwentyScreen>` | 1295-1321 |
| `what-i-eat` | `<WhatIEatScreen>` (photo analysis) | 1322-1339 |
| `check-composition` | `<CheckCompositionScreen>` | 1340-1357 |
| `dish-analysis` | `<DishAnalysisScreen>` | 1358-1483 |
| `my-dishes` | `<RecipesScreen>` (cooked recipes list) | 1484-1498 |
| `from-what-is` | `<FromWhatIsScreen>` (DIY recipe) | 1499-1516 |
| `book-recipes` | `<BookRecipesScreen>` (3773 lines) | 1517-1532 |
| `purchases` | `<MyPurchasesScreen>` | 1533-1545 |
| `diary` | `<MyDiaryScreen>` | 1546-1560 |
| `anna` | `<AnnaScreen>` | 1561-1571 |
| `state-now` | `<StateNowScreen>` | 1572-1589 |
| `rewards` | `<MyRewardsScreen>` | 1590-1600 |
| `settings` | `<SettingsScreen>` | 1601-1615 |
| `club` | `<ClubScreen>` | 1616-1626 |
| *(default)* | `<MyDayScreen>` | 1627-1647 |

---

## 2. Component Anatomy per Screen

### 2.1 MyDayScreen (~3500 lines, `src/components/MyDayScreen.tsx`)

**Role**: Central dashboard ("Мой День") — 28-day WFPB course progress hub.

**Layout zones** (top to bottom):
1. **Branded Header** — slogan "Всё дело в еде!" + Calendar day counter ("1 из 28")
2. **Progress Circle** — glass-liquid animated integral score (0-100%) with bubble physics
3. **Right Cards Stack** — `clickCount` progress + Habits vessel ("ключи системы" N/20)
4. **Quick Actions Grid** (4×2) — image buttons: Water, Food, Movement, Sleep, Measurements, Recipes, Digestion, Book
5. **Premium Blocks** — Purchases, Diary, State Now buttons (images)
6. **Anna Recommendation Card** — AI-generated motivational text based on habitsDone
7. **BottomBar** — 5-tab navigation: Главная, Мои блюда, Anna (center), Клуб, Настройки

**Sub-screens mounted conditionally within** (replace main view via early return):
- `<WaterDetailsScreen>` — hydration analytics
- `<SleepDetailsScreen>` — sleep analytics
- `<MovementDetailsScreen>` — activity analytics
- `<MeasurementsDetailsScreen>` — body measurement analytics
- `<DigestionScreen>` — digestion analytics

**Overlays/Modals** (bottom sheets):
- Fast Add Water (slider + amount selector)
- Fast Sleep (bedtime/wake-up recording + quality modal)
- Fast Movement (activity picker → stopwatch → summary)
- Fast Measurements (energy/mood/wellbeing/weight/BP)
- Fast Digestion (Bristol scale + comfort + note)
- Active Stopwatch (floating button during activity)
- Smart Reminder Toast (Anna's water nudge)
- Night Mode fullscreen overlay (sleep state)

**Local state categories**:
- Module visibility booleans (showWaterDetails, showFastAddWater, etc.)
- Module data (waterLogs, sleepLogs, measurementLogs, digestionLogs)
- Input form values (tempSelectedFastAmount, fastEnergy, etc.)
- Interaction timers (click/long-press/double-click refs for each button)
- Canvas animation (systemBubbles, splashParticles)
- Notification/pulsation state

**Global state consumed**: `screen`, `userProfile`, `clickCount`, `recipeStates`, `movementEntries`

### 2.2 AnnaScreen (~898 lines, `src/components/AnnaScreen.tsx`)

**Role**: Voice/text AI chat with Anna (WFPB coach).

**Layout zones**:
1. **Top Navigation** — Back, title "Анна", Settings button
2. **Avatar Orb** — animated state-reactive ring (слушаю/думаю/отвечаю/на связи)
3. **Dialog Area** — scrollable message list with bubbles
4. **Process Status Bar** — animated dots + state label
5. **Text Input** — text field with Send button
6. **Voice CTA** — hold-to-talk green mic button with pulsating rings
7. **BottomBar** — activeTab="anna"

**Overlays**: Settings drawer (motion slide-up) with reset conversation button

**Key mechanisms**:
- Speech-to-Text via `SpeechToTextSession` (webkitSpeechRecognition)
- Text-to-Speech via Yandex SpeechKit API + browser SpeechSynthesis fallback
- Chat history preserved in local state (`messages: Message[]`)
- `/api/anna-chat` for AI responses, `/api/anna-tts` for audio
- `window.currentScreenContext` exposes all user metrics to the AI

**Local state**: messages[], typedInput, annaState, isHoldingMic, showSettingsModal, currentlyPlayingMessageId

### 2.3 MyDiaryScreen (~1848 lines, `src/components/MyDiaryScreen.tsx`)

**Role**: Personal mindfulness diary ("Личный Дневник Осознанности") with 28-day timeline.

**Layout zones**:
1. **Header** — user name button (triggers profile modal), search toggle, night mode toggle, exit
2. **Search Box** (expandable) — full-history search with result navigation
3. **Cycle Day Navigation** — horizontal scroll of 28 day buttons with indicators
4. **Bookmarks & Mood Bar** — day tags (Победа/Инсайт/Важный/Прорыв) + mood selector
5. **Memory Block** — "Воспоминание" from 7 days ago
6. **Time Capsule Info** — sealed notes countdown
7. **Timeline Archive** — pinned note + chronological cards with module-colored tags
8. **Photo Anchor** — random recipe image of the day
9. **Evening Ritual** — Anna's 3-question daily check-in (countdown → active → completed)
10. **Input Field** — category selector, textarea, mic button (hold-to-dictate), send

**Key mechanisms**:
- Cross-module entries auto-imported from water/sleep/movement/measurements/digestion APIs
- Canvas particle animation (floating bubbles)
- Night mode (theme toggle for all colors)
- Time Capsule (seal notes until future day)
- Evening Ritual syncs with `ritualMatrix` and `/api/evening-ritual`

### 2.4 SettingsScreen (~970+ lines, `src/components/SettingsScreen.tsx`)

**Role**: Full user configuration hub with guided onboarding.

**Sub-screens** (2nd-level routing via `activeSection` state):
1. **Hub** — 5 category cards: Account, Nutrition, Recipes, Notifications, My Rewards
2. **Account** — name, gender, age, height, weight, BP, ritual time, export/clear/reset
3. **Nutrition** — chronic conditions (21 items), health goals (21 items), lifestyle traits
4. **Recipes** — book priority, simple dishes, fast variants, chronic consideration
5. **Notifications** — 6 notification types (water/sleep/measurements/habits/day-summary/anna-tip) each with: toggle, time windows (single/3-zone), preview template, AI phrase

**Key mechanism**: Onboarding modal (first-time user), section completion tracking (`completedSections[]`), "Старт" button after all 4 sections completed.

### 2.5 StateNowScreen (~844+ lines, `src/components/StateNowScreen.tsx`)

**Role**: Deep analytics dashboard with 6 tabbed sub-views.

**Tabs** (`statenow/` subcomponents):
| Tab | Component | Focus |
|-----|-----------|-------|
| `balance` | `<BalanceTab>` | Integral score, status descriptor |
| `scales` | `<ScalesTab>` | Water/sleep/habits gauges |
| `kbju` | `<KbjuTab>` | Calories, protein, fat, carbs, fiber |
| `micro` | `<MicroTab>` | Vitamins A/C/B9/E/K, minerals Fe/Mg/Zn/K/Se/Lysine |
| `composition` | `<CompositionTab>` | Ingredient breakdown with WFPB compliance colors |
| `dynamics` | `<DynamicsTab>` | Wellbeing/energy/lightness trends |

**Key mechanisms**:
- Aggregates data from API (`/api/user/state-now`, `/api/metrics/daily`)
- Computes cooked book recipes across 7 meal types (breakfast/lunch/dinner/must-have/compliments/recipe-of-day/drinks)
- AI analysis per tab via `getAnnaAnalysisForTab()` with contextual recommendations
- Auto-saves analysis to server (`/api/anna-analysis/save`)

### 2.6 ClubScreen (~351 lines, `src/components/ClubScreen.tsx`)

**Role**: Telegram Club linking — glass-morphism UI with dark gradient theme.

**States**: Loading → Unlinked (generate token → deeplink → poll for link) → Linked (success animation, unlink option)

### 2.7 WhatIEatScreen (~730 lines, `src/components/WhatIEatScreen.tsx`)

**Role**: Photo-based food analysis ("Что я ем") — AI ingredient recognition from camera/image.

**Key mechanisms**:
- Photo capture (camera/gallery) → base64 → `/api/confirm-ingredients`
- AI scanning with progressive Anna messages (received/processing/delayed/longWait/retries)
- Camera vs. gallery upload options

### 2.8 HabitsTwentyScreen (~1323 lines, `src/components/HabitsTwentyScreen.tsx`)

**Role**: 20-key WFPB compliance system ("Полезная двадцатка").

**Key mechanism**: Displays 20 system keys (legumes, grains, vegetables, leafy greens, fruits, seeds, nuts, spices, water, breakfast, lunch, dinner, whole food, no salt, no sugar, no oil, no animal, mindfulness, movement, sleep). Each key has: name, emoji, category, optimum, maxCircles, hasSuperlevel, subtext, whatsIncluded, portionSize, whyImportant.

### 2.9 BottomBar (~220 lines, `src/components/BottomBar.tsx`)

**Role**: Persistent 5-tab bottom navigation.

**Tabs**: Главная (Home) | Мои блюда (Recipes) | Anna (center, voice button with hold-to-overlay) | Клуб (Club) | Настройки (Settings)

**Anna button special behavior**: Short press → navigate to anna screen. Long press → dispatch `anna-overlay-start-press` / `anna-overlay-end-press` custom events on window (for ambient voice overlay).

---

## 3. State Architecture

### 3.1 Global State (Zustand: `src/store/useAppStore.ts`)

```typescript
interface AppState {
  screen: Screen;                         // Current screen identifier
  userProfile: UserProfile;               // Name, age, weight, BP, conditions, goals
  telegramUser: TelegramUser | null;      // Telegram identity
  isCalendarOpen: boolean;
  isOverlayOpen: boolean;
  activeNotification: AppNotification | null;
  waterEntries: WaterEntry[];
  sleepEntries: SleepEntry[];
  movementEntries: MovementEntry[];
  measurementEntries: MeasurementEntry[];
  digestionEntries: DigestionEntry[];
  recipeStates: Record<string, RecipeState>;
  calendarNotes: CalendarNotes;
  courseStartTimestamp: number | null;
  clickCount: number;                     // Gamification progress counter
  isGodMode: boolean;
}
```

**`initApp()`** — fetches `/api/user/profile` on startup, pre-populates userProfile and clickCount.

### 3.2 Local State Patterns

**Overwhelmingly local** — each screen manages its own state via `useState`. The global store is used only for:
- Screen routing (`screen`)
- User profile (read mostly)
- Movement entries (global because used by both MyDayScreen and sub-screens)
- Recipe states (global because used by MyDayScreen → DigestionScreen → StateNowScreen)
- Click count (global gamification counter)

**Cross-module sync** happens via API calls (fire-and-forget POSTs), not via global state:
- Water logs: localStorage cache + API → app re-fetches on mount
- Sleep logs: localStorage + API
- Measurements: API + local state
- Digestion: API + local state

### 3.3 Secondary Stores (Services)

| Service | Purpose |
|---------|---------|
| `SystemKeysStore` | 20-key WFPB compliance calculator |
| `UserPreferencesStore` | Notifications, nutrition settings, recipe prefs (localStorage) |
| `DailyNutritionStore` | Daily macro/micro aggregation from recipes |
| `SystemKeysStore` | Recipe state syncing + key calculation |

---

## 4. Entry Points

### 4.1 Telegram Mini App Entry

1. Telegram sends `tgWebAppData` (init data) via URL hash
2. `src/utils/telegramClient.ts` parses init data (see `getTelegramInitData()`)
3. All API calls include `X-Telegram-Init-Data` header for authentication
4. `src/App.tsx` mounts → calls `useAppStore.getState().initApp()` which fetches `/api/user/profile`
5. If profile has `hasSavedSettings: true` → auto-navigate to `"my-day"`, else show `"welcome"`

### 4.2 Welcome → Onboarding Flow

```
Telegram opens app
  → screen = "welcome" (Zustand default)
  → GlassRing animation + StartButton rendered
  → StartButton → setScreen("settings")
  → SettingsScreen shows onboarding modal (first time)
  → User fills 4 sections (Notifications → Nutrition → Recipes → Account)
  → "Старт" button → handleSaveAll() saves profile + UserPreferencesStore
  → onboardingComplete() → setScreen("my-day")
```

### 4.3 Returning User Flow

```
Telegram opens app
  → initApp() fetches profile
  → profile.hasSavedSettings === true
  → setScreen("my-day")
  → MyDayScreen renders directly
```

---

## 5. Key Architectural Observations

1. **No router library** — `screen` string in Zustand + conditional rendering. Zero URL-based routing. This is typical for Telegram Mini Apps.

2. **Monolithic screen components** — MyDayScreen (~3500 lines) is the largest. It conditionally mounts 5 sub-screens (WaterDetailsScreen, SleepDetailsScreen, etc.) via early returns based on boolean state flags.

3. **Modal/Overlay pattern** — Bottom sheets and modals are rendered inside screen components using `<AnimatePresence>` + absolute positioning relative to the screen container (not portal-based).

4. **Canvas animations** — Two screens use canvas: MyDayScreen (systemBubbles, SVG waves in habits vessel) and MyDiaryScreen (floating bubble particles).

5. **Anna as ambient presence** — `window.currentScreenContext` is set/unset on every screen. The Anna chat screen reads this context to provide AI with user metrics. BottomBar has long-press-to-voice-overlay for quick Anna access.

6. **"Screen Context" pattern** — Every major screen writes to `window.currentScreenContext` with `screen_id`, `screen_title`, `current_status`, `user_input_values`, and screen-specific metrics. This feeds the AI layer with awareness.

7. **API fire-and-forget** — Most data persistence uses optimistic local state + fire-and-forget POST requests. Error handling is minimal (mostly `.catch(() => {})`).

8. **Dual state sources** — Many screens resolve effective values via `props ?? apiData ?? default`. This creates a fallback chain: prop → API response → hardcoded default.

9. **No TypeScript strictness** — Heavy use of `any`, `as any`, and `window` global assignments. The `DiaryNote` and other interfaces have loose typing.

10. **Gamification** — `clickCount` is incremented on most interactions (1pt for clicks, up to 30pts for activities). Displayed as "прогресс" on MyDayScreen. No visible rewards screen implementation found in this read-only pass (rewards screen exists as route but component not analyzed).
