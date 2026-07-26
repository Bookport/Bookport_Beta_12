# Backend Architecture Report

**Project:** Всё дело в еде! (Bookport 12.1 Beta)  
**File:** `server.ts` (2735 lines), 11 services in `src/services/`, Prisma schema  
**Focus:** Server entry, auth middleware, AI pipeline, achievement engine, data flow, photo storage

---

## 1. server.ts — Entry Point & Endpoint Map

### Structure

| Lines | Purpose |
|-------|---------|
| 1–37 | Imports, globals, env, constants (USDA key hardcoded) |
| 40–61 | `generateContentWithFallback()` — AI cascade `qwen-plus` → `qwen-turbo` via `callLLM()` |
| 63–104 | `pickAnnaTools()` — keyword-based tool selection for Anna chat |
| 106–117 | `buildAnnaToolGuidance()` — system instruction append for DB access |
| 120–275 | `getUsdaFallbackData()` — hardcoded per-ingredient nutrition table (~50 items) |
| 277–326 | `parseAndTranslateIngredients()` — LLM translates RU → EN for USDA API |
| 328–418 | `fetchUsdaNutrition()` — queries USDA FoodData Central (10s timeout, skip words) |
| 420–477 | `startServer()` — Express init, auth middleware (lines 436–477) |
| 479–493 | Request logging middleware |
| 496 | `setupTelegramWebhook(app)` — Telegram bot webhook |

### Middleware Stack

1. **`express.json({ limit: "50mb" })`** (line 431) — increased for camera photos
2. **Auth Middleware** `app.use("/api", …)` (line 436):
   - Reads `X-Telegram-Init-Data` header
   - Validates via `extractTelegramUser()` (HMAC-SHA256 with `WebAppData` key + bot token)
   - `findUnique({ telegramId })` or `create()` the user
   - Attaches `req.userId` (UUID)
3. **Request Logger** (line 481) — logs method, URL, status, duration, truncated userId

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/purchase/register` | WordPress landing; creates 7-day token; returns bot link |
| POST | `/api/logs/client` | Client-side error ingestion |
| POST | `/api/anna-chat` | **AI chat with tool-calling loop** (max 3 rounds) |
| POST | `/api/anna-tts` | TTS via DashScope `qwen3-tts-vc` (Anna voice clone) |
| POST | `/api/analyze-dish` | **Dual parallel**: LLM (micro + insights) + USDA API (KBJU macros) |
| POST | `/api/analyze-image` | **CV**: DashScope `qwen-vl-max` → Gemini fallback |
| POST | `/api/anna-supports` | Generates "system is analyzing" phrases during scan |
| POST | `/api/anna-sarcastic-reply` | Humor for non-food photo detection |
| POST | `/api/anna-comment` | Sarcastic dish comment using reaction matrix |
| POST | `/api/transcribe-audio` | STT via DashScope `qwen3-asr-flash` |
| GET | `/api/user/init` | Auto-advances `currentDayIndex` (max 28); returns profile |
| POST | `/api/user/profile` | Save/update profile |
| GET | `/api/user/profile` | Get profile |
| GET | `/api/user/data` | **All-in-one**: profile + dishes + diary + recipeProgress + achievements |
| GET | `/api/user/state-now` | StateNow screen data (with dayIndex filter) |
| POST | `/api/metrics/daily` | Upsert with **append merge** for JSON log arrays |
| GET | `/api/metrics/daily` | Last 30 daily metrics |
| POST | `/api/metrics/ratings` | Wellbeing/energy/lightness rating |
| POST | `/api/recipe/progress` | Upsert recipe progress |
| GET | `/api/recipe/progress` | All recipe progress |
| POST | `/api/saved-dishes` | Create dish (image as base64) |
| GET | `/api/saved-dishes` | List dishes (parsed ingredients) |
| PATCH | `/api/saved-dishes/:id` | Update category/favorite/isNew |
| POST | `/api/diary` | Create diary entry (photo as base64) |
| GET | `/api/diary` | List (optional dayIndex filter) |
| DELETE | `/api/diary/:id` | Delete entry |
| POST | `/api/evening-ritual` | Upsert ritual answers |
| GET | `/api/evening-ritual` | Get ritual by dayIndex |
| CRUD | `/api/shopping-list` | Full CRUD + clear-all |
| POST | `/api/anna-chats` | Save chat to DB |
| GET | `/api/anna-chats` | Last 100 chats |
| POST | `/api/anna-analysis/save` | Save daily Anna overlay |
| GET | `/api/anna-analysis` | Get daily overlay |
| POST | `/api/achievements/check` | Full eval: fetches 30 days metrics, dishes, rituals, ratings, chats → `achievementService.check()` |
| POST | `/api/achievements/track` | Increment counters (constructor, scan, share, etc.) |
| POST | `/api/achievements/debug-action` | `reset_all`, `set_day`, `force_queue` |
| GET | `/api/achievements/check-pending` | Pop next queued achievement (2h throttle) |
| POST | `/api/achievements/mark-shown` | Remove from queue, set `lastAchievementUnlockedAt` |

**Static**: Vite dev middleware or `dist/` production serving (lines 2694–2723).

---

## 2. Auth Middleware — `telegramInitData.ts`

File: `src/utils/telegramInitData.ts`

- Validates Telegram WebApp init data using HMAC-SHA256
- Secret key: `HMAC_SHA256("WebAppData", TELEGRAM_BOT_TOKEN)`
- Parses `tgWebAppData` query string, verifies `hash` against data-check-string
- Returns `{ id, first_name, username }` on success
- Server creates/finds user by `telegramId`, updates `telegramName`/`telegramUsername` each request

**Key observation**: User auto-creation on every authenticated request — no explicit sign-up flow.

---

## 3. AI Pipeline

### 3.1 Model Cascade (`server.ts:40`)

```
generateContentWithFallback(payload)
  → callLLM(payload)  // llmAdapter.ts
    → callDashScope(payload)  // hardcoded
      qwen-plus → qwen-turbo (with 1 retry per model)
```

`llmAdapter.ts` also has `callGemini()` (dynamic import of `@google/genai`) — unused in normal flow. `callDashScope()` uses OpenAI-compatible client at `DASHSCOPE_BASE_URL`.

### 3.2 Provider Switching (`aiLayer.ts`)

- `AIProviderConfig` enum: `studio` / `server` / `hybrid`
- `AnnaTextResponse`, `RecognizedIngredient` interfaces
- Supports runtime provider switching based on `ANNA_AI_MODE` env var

### 3.3 Prompt Compilation (`promptCompiler.ts`)

Reads from `anna_wiki/` directory:

| Directory | Purpose |
|-----------|---------|
| `core/*.md` | Base personality + WFPB knowledge |
| `conduct/*.md` | Behavior instructions |
| `modules/{screenId}.md` | Screen-specific context |
| `knowledge/*.md` | Keyword-matched files (nutrition, psychology, etc.) |

**Keyword matching** (regex-based):
- Book/recipe questions → `book_structure.md`
- Nutrition/deficiency → `wfpb_nutrition.md`
- Relapse/fatigue → `psychology_support.md`
- UI navigation → `app_modules_map.md`

### 3.4 Computer Vision (`dashscopeAdapter.ts`)

```
analyzeFoodImage(imageBase64, prompt)
  → qwen-vl-max → qwen-vl-plus (fallback)
  temperature: 0.1, max_tokens: 2000
```

Gemini fallback in `server.ts:903` if DashScope fails entirely.

### 3.5 Speech Services

| Service | Model | Endpoint |
|---------|-------|----------|
| ASR | `qwen3-asr-flash` | `dashscope-intl.aliyuncs.com` |
| TTS | `qwen3-tts-vc-2026-01-22` (voice: `anna-voice-20260705…`) | Same endpoint |

### 3.6 Tool Calling (`annaTools.ts`)

8 function tools available to Anna:

| Tool | Description |
|------|-------------|
| `get_book_table_of_contents` | Chapters/recipes list |
| `get_book_recipe_details` | Single recipe |
| `get_dishes` | User's saved dishes, searchable/filterable |
| `get_recipe_progress` | Recipe tracking status |
| `get_daily_kbju_summary` | KBJU sum for a day |
| `get_diary_entries` | Day notes |
| `get_user_achievements` | Unlocked achievements |
| `get_user_profile` | User health profile |
| `get_daily_metrics` | Daily metrics |

### 3.7 `/api/anna-chat` Flow

```
POST /api/anna-chat
  1. Compile system prompt via PromptCompiler
  2. Inject evening ritual data if morning-related
  3. Add brevity rule
  4. Select tools via pickAnnaTools()
  5. Build OpenAI-format messages (context preamble + history + user msg)
  6. Tool-calling loop (max 3 rounds, temperature 0.8, max_tokens 500):
     generateContentWithFallback (with tools)
     → executeToolCall() for each
     → feed result back as tool role
  7. Save to annaChat table
  8. Return reply
```

---

## 4. Dish Analysis Pipeline

### `/api/analyze-dish` — Dual parallel architecture

```
LLM (micro+insights)          USDA API (macros)
        │                            │
        └───────── Promise.all ───────┘
                      │
              Merge results
              │
        Return { dishName, nutrients, micronutrients, insights }
```

**Step A** — LLM (structured JSON via `responseSchema`):  
  - Dish name  
  - 9 micronutrients (Fe, Zn, Mg, I, Se, VitC, B9, Lys, Met)  
  - 3 insights (strengths, improvements, compliance)  

**Step B** — USDA:  
  1. `parseAndTranslateIngredients()` — LLM translates RU → EN, strict JSON  
  2. `fetchUsdaNutrition()` — queries `api.nal.usda.gov/fdc/v1/foods/search` per ingredient (10s timeout, retry-on-fail)  
  3. Falls back to `getUsdaFallbackData()` (hardcoded local table)  

**Forbidden ingredient check**: `findForbiddenInText()` flags non-WFPB items pre-LLM.

### `/api/analyze-image` — CV Pipeline

```
1. Strip base64 prefix
2. Call analyzeFoodImage() — DashScope qwen-vl-max
3. If fail → generateContentWithFallback() — Gemini
4. JSON parse → retry once if invalid
5. Post-validate: run findForbiddenInText() on each ingredient
6. Return { dishes, ingredients } with status: green/error/blue
```

*Note*: The `/api/analyze-image` JSON schema does not include a `dishName` at the top level — it's `{ ingredients: [...] }` inside a `result` wrapper, with optional `dishName` within the inner object.

---

## 5. Achievement Engine — Dual System

### 5.1 New Class: `AchievementService` (`src/services/AchievementService.ts`)

- **1120 lines**, 80+ achievement definitions via `ACHIEVEMENT_DEFS` map
- **Event-driven**: single `check({ action, payload })` method
- **State machine**: `setUnlocked()` loads existing → `tryUnlock(id, condition)` gates
- **Events**: `state:updated`, `ingredient:card_viewed`, `anna:interrupted`, `social:shared`, `mixer:jackpot_won`
- **Integral score**: `calculateIntegralScore()` — weighted combination of water, sleep, meals, activity, ratings
- **Achievement categories**: positive, negative, secret, legendary
- **Unlock blocks**:
  - Block 1: Water, first-steps (ach-081→083)
  - Block 2: Activity, sleep, metrics, rituals (ach-080, 046, 047, 044, 042, 035, 038, 034, 041, 065, 051, 050, 053, 040, 033)
  - Block 3: Nutrition, discipline, villains (ach-027, 021, 018, 015, 017, 024, 026, 029, 031, 085, 060, 016, 061, 023, 028, 022, 062, 002)
  - Block 4: Mastery, Anna, secrets, saved list (ach-032, 059, 057, 068, 070, 069, 019, 058, 084, 054, 067, 079, 004, 001, 005, 076, 036, 078, 055, 063, 006, 030, 039, 056, 077, 074, 052)

### 5.2 Legacy System: `checkBackgroundAchievements()` (in `server.ts:1171`)

- Separate implementation with overlapping logic
- Fetches full user data with `include: { savedDishes, eveningRituals, dailyMetrics }`
- Evaluates achievements by `eventType`: `profile_saved`, `dish_saved`, `metric_saved`, `mixer_spin`, `tracking_updated`, `recipe_progress`
- Writes via `grantAchievements()` → upserts `userAchievement` + appends `pendingAchievementId`

### 5.3 Achievement Queue

- `pendingAchievementId`: comma-separated string stored on `User`
- Client polls `GET /api/achievements/check-pending` (2-hour throttle via `lastAchievementUnlockedAt`)
- Client shows overlay, then calls `POST /api/achievements/mark-shown` to dequeue

---

## 6. Data Flow — Photo Storage

**All images stored as base64 strings directly in PostgreSQL.**  
No file system, CDN, or S3 bucket.

| Table | Column | Type | Context |
|-------|--------|------|---------|
| `SavedDish` | `image` | `String?` | User's dish photo from camera |
| `DiaryEntry` | `photo` | `String?` | Day note photo |

**Implications**:
- `express.json({ limit: "50mb" })` needed
- Payloads can be very large (multi-MB base64 strings)
- No image compression/resizing on server side
- DB bloat over time
- No image CDN or caching

---

## 7. Database Schema (Prisma)

**16 models** across the schema:

| Model | Key Fields | Notes |
|-------|-----------|-------|
| `User` | `telegramId` (unique), `currentDayIndex` (1..28), counters | Central hub with relations to all other models |
| `PurchaseToken` | `token` (unique), `email`, `used`, `expiresAt` | 7-day token for WordPress purchase flow |
| `DailyMetric` | `@@unique([userId, date])`, 7 tracking fields + 6 JSON log fields | Water, sleep, meals, habits, activity, steps |
| `DailyRating` | `@@unique([userId, date])`, wellbeing/energy/lightness + per-time logs | Wellbeing/energy/lightness with intra-day logs |
| `BookRecipe` | `@@id([type, id])`, KBJU as string | Static recipe data |
| `RecipeProgress` | `@@unique([userId, bookRecipeType, bookRecipeId])` | User progress per recipe |
| `SavedDish` | `image` (base64), `ingredients` (JSON string), KBJU fields | Dish with photo |
| `DiaryEntry` | `photo` (base64), `tags` (JSON string) | Diary with photo |
| `ShoppingItem` | `barcode`, `verdictStatus` (green/red/yellow) | Barcode scan results |
| `Purchase` | `name`, `category`, `status` | Purchase list |
| `AnnaChat` | `message`, `reply`, `screen`, `dayIndex` | Chat history |
| `AnnaOverlayMessage` | `sender`, `text`, `dayIndex` | Daily analysis overlay |
| `Achievement` | Static definitions: id, name, category, type, rarity, XP | Central achievement catalog |
| `UserAchievement` | `@@unique([userId, achievementId])`, `unlocked`, `xp` | Per-user achievement state |
| `EveningRitual` | `@@unique([userId, dayIndex])`, 3 answer fields | Daily evening reflection |
| `FoodItem` | `fdcId` (unique), KBJU + 9 micronutrients, `wfpbStatus` | USDA cached food data |

---

## 8. Key Architectural Observations

### Strengths
1. **Comprehensive AI pipeline** — Prompt compilation from modular wiki files, model cascade, provider abstraction
2. **Rich achievement system** — 80+ achievements with multi-day streak logic, integral score, queued display
3. **Dish analysis dual path** — LLM (micros + insights) runs in parallel with USDA API (macros) for redundancy
4. **Rigorous auth validation** — Telegram HMAC verified on every request, auto user provisioning
5. **Local fallback data** — Hardcoded nutrition table for 50+ ingredients when USDA API fails
6. **Merge logic on metrics** — Appending to JSON log arrays rather than overwriting

### Concerns
1. **Image storage in DB** — Base64 photos in PostgreSQL will bloat DB; no CDN, compression, or offloading
2. **Dual achievement systems** — `checkBackgroundAchievements()` (server.ts) and `AchievementService` (class) overlap with different logic — risk of double-evaluation or inconsistent results
3. **Hardcoded API keys** — USDA key (`ywYviAkf…`) exposed in `server.ts:37`
4. **Gemini API key fallback** — Hardcoded fallback `AIzaSyBJg1Q4iJN3s7Tq5Zw3BKik-W4GZ-MozZg` in `llmAdapter.ts:104`
5. **Single-user assumptions** — `req.userId` attached from Telegram init, but no multi-device/session handling
6. **No request validation** — No Zod/schema validation on endpoints; `safeParseJSON` used ad-hoc
7. **No rate limiting** — No throttling on `/api/anna-chat` or `/api/analyze-image` (AI API cost exposure)
8. **Error handling pattern** — Many `catch` blocks return empty/silent fallbacks instead of 500s, making debugging harder
9. **Static file fallback in dev** — Vite SPA catch-all before API routes could mask issues
10. **Pending achievement queue** — Comma-separated string on User row (not normalized); 2-hour throttle is hardcoded
