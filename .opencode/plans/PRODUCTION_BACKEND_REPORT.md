# Production Backend Report — Bookport 12.0 Beta

> **Source**: Kubernetes pod `deployment/bookport` at 194.87.252.101  
> **Bundle**: `/app/dist/server.cjs` — compiled CommonJS, 4741 lines  
> **Node**: 20.x (ESM + CommonJS mixed via esbuild)  
> **Date**: 2026-07-22  
> **Mode**: Read-only audit

---

## 1. Architecture Overview

```
                      Internet
                         |
              Telegram WebApp (TMA)
                         |
                   nginx (reverse proxy)
                         |
                  Express.js (:3000)
                    /          \
           static SPA          API routes
         (dist/index.html)    (41 endpoints)
                |                    |
           React SPA            Prisma ORM
       (Telegram WebApp)           |
                              PostgreSQL
```

- **Single-process** Express.js app, compiled into one CJS file via esbuild.
- **No clustering** — single `app.listen(3000)`.
- **Frontend** served as static SPA from `/app/dist/`.
- **Production-only condition**: `if (process.env.NODE_ENV !== "production")` wraps Vite dev server creation — never runs in prod.
- **Logger** wraps `res.end` for every `/api/*` route to log method, URL, status, duration, and truncated `userId`.

---

## 2. Environment Variables (12 total)

| Variable | Source | Used At | Purpose |
|---|---|---|---|
| `DASHSCOPE_API_KEY` | env | 67, 139, 195 | DashScope LLM auth (3 separate client instances) |
| `DASHSCOPE_BASE_URL` | env | 70 | Custom endpoint (validated: must be `*.aliyuncs.com`) |
| `TELEGRAM_BOT_TOKEN` | env | 2022, 2135 | Telegram bot auth |
| `TELEGRAM_BOT_USERNAME` | env | — | Bot username for deep links |
| `TELEGRAM_INIT_DATA_MAX_AGE_SECONDS` | env | — | TTL for Telegram WebApp initData validation |
| `SERVER_URL` | env | — | App base URL (default: `https://app.vsedelovede.ru`) |
| `APP_LAUNCH_TOKEN_TTL_MINUTES` | env | 1921 | Launch token TTL (default: 60) |
| `PURCHASE_API_KEY` | env | 2625 | Secret for `/api/purchase/register` (timing-safe comparison) |
| `RINGO_PROXY_URL` | env | — | SOCKS/HTTPS proxy for Telegram bot (via `https-proxy-agent`) |
| `SAVED_DISH_IMAGES_DIR` | env | 2179 | Filesystem directory for dish images |
| `LOG_LEVEL` | env | — | Winston log level |
| `NODE_ENV` | env | passim | `"production"` disables Vite; controls error formatting |

---

## 3. Full Route Inventory (41 API + 1 static)

### 3.1 Auth & Access (5 routes)

| Route | Method | Description |
|---|---|---|
| `/api/user/init` | POST | Telegram WebApp init → `createAppLaunchUrl()` → returns launch URL + `accessExpiresAt` |
| `/api/user/data` | GET | Full user data fetch after launch token validation |
| `/api/access` | GET | Returns `{ ok: true, accessExpiresAt }` from middleware |
| `/api/user/state-now` | GET | Current onboarding/screen state |
| `/api/user/reset` | POST | Full user reset — deletes diary, metrics, achievements, recipes, state |

### 3.2 AI & Anna (9 routes)

| Route | Method | Description |
|---|---|---|
| `/api/anna-chat` | POST | Main Anna chat — DashScope LLM with 6 tools |
| `/api/anna-tts` | POST | Text-to-speech via Anna |
| `/api/analyze-dish` | POST | Full dish analysis pipeline |
| `/api/analyze-image` | POST | Image → LLM → structured food data |
| `/api/anna-supports` | POST | Motivational support messages |
| `/api/anna-sarcastic-reply` | POST | Sarcastic Anna replies |
| `/api/anna-comment` | POST | Anna commentary on meals |
| `/api/transcribe-audio` | POST | Audio → text transcription |
| `/api/anna-analysis/save` | POST | Save Anna analysis result |
| `/api/anna-analysis` | GET | Fetch saved Anna analyses |

### 3.3 User Profile (2 routes)

| Route | Method | Description |
|---|---|---|
| `/api/user/profile` | GET | Get user profile |
| `/api/user/profile` | POST | Update user profile |

### 3.4 Diary & Nutrition (4 routes)

| Route | Method | Description |
|---|---|---|
| `/api/diary` | POST | Add diary entry |
| `/api/diary` | GET | Get diary entries |
| `/api/diary/:id` | DELETE | Delete diary entry |
| `/api/evening-ritual` | POST | Log evening ritual |
| `/api/evening-ritual` | GET | Get evening ritual data |

### 3.5 Recipes (2 routes)

| Route | Method | Description |
|---|---|---|
| `/api/recipe/progress` | POST | Mark recipe step complete |
| `/api/recipe/progress` | GET | Get recipe progress |

### 3.6 Saved Dishes (3 routes)

| Route | Method | Description |
|---|---|---|
| `/api/saved-dishes` | POST | Save a dish (with image upload) |
| `/api/saved-dishes` | GET | List saved dishes |
| `/api/saved-dishes/:id` | PATCH | Update saved dish |

### 3.7 Metrics (3 routes)

| Route | Method | Description |
|---|---|---|
| `/api/metrics/daily` | POST | Record daily metrics |
| `/api/metrics/daily` | GET | Get daily metrics history |
| `/api/metrics/ratings` | POST | Submit meal ratings |

### 3.8 Shopping List (5 routes)

| Route | Method | Description |
|---|---|---|
| `/api/shopping-list` | GET | Get shopping list |
| `/api/shopping-list` | POST | Add item |
| `/api/shopping-list/:id` | PATCH | Update item |
| `/api/shopping-list/:id` | DELETE | Delete item |
| `/api/shopping-list` | DELETE | Clear all items |

### 3.9 Anna Chats (2 routes)

| Route | Method | Description |
|---|---|---|
| `/api/anna-chats` | POST | Create or update chat session |
| `/api/anna-chats` | GET | List chat sessions |

### 3.10 Achievements (4 routes)

| Route | Method | Description |
|---|---|---|
| `/api/achievements/check` | POST | Check & award achievements (dual system) |
| `/api/achievements/track` | POST | Track achievement progress |
| `/api/achievements/check-pending` | GET | Check pending (unshown) achievements |
| `/api/achievements/mark-shown` | POST | Mark achievements as shown |

### 3.11 Purchase (1 route)

| Route | Method | Description |
|---|---|---|
| `/api/purchase/register` | POST | Register purchase → generates 7-day email link |

### 3.12 Club (3 routes — ALL STUBS)

| Route | Method | Response |
|---|---|---|
| `/api/club/generate-token` | POST | `{ deepLink: null, message: "Клуб скоро будет доступен" }` |
| `/api/club/status` | GET | `{ linked: false, message: "Клуб скоро будет доступен" }` |
| `/api/club/unlink` | POST | `{ ok: true, message: "Клуб скоро будет доступен" }` |

The entire Club feature is unimplemented — all three endpoints return stub responses.

### 3.13 Utility (1 route + static)

| Route | Method | Description |
|---|---|---|
| `/api/logs/client` | POST | Client-side error logging |
| `/saved-dishes/*` | GET | Static file serving for dish images (no dotfiles, no fallthrough) |

---

## 4. Deep Dive: Auth & Access Pipeline

### 4.1 Entry Flow

```
User opens TMA
       ↓
  GET / (index.html) — SPA loads
       ↓
  SPA calls POST /api/user/init
       ├─ Extracts Telegram.WebApp.initData from header
       ├─ Validates initData HMAC-SHA-256 signature
       ├─ Looks up / creates User by telegramId
       ├─ Calls createAppLaunchUrl(telegramId)
       │    ├─ Generates rawToken = crypto.randomBytes(32).base64url
       │    ├─ Computes SHA-256 hash → stored in DB
       │    ├─ TTL configurable via APP_LAUNCH_TOKEN_TTL_MINUTES (default: 60 min)
       │    ├─ Prisma transaction: delete expired tokens + create new
       │    └─ Returns: https://app.vsedelovede.ru/#launch_token=<rawToken>
       └─ Returns { launchUrl, accessExpiresAt }
```

### 4.2 Launch Token Validation

```
SPA navigates to launchUrl
       ↓
  Middleware: hasValidAppLaunchToken(token)
       ├─ Computes SHA-256 hash
       ├─ Queries AppLaunchToken where:
       │    hash = computedHash
       │    AND expiresAt > now
       │    AND consumedAt = null
       ├─ If found:
       │    ├─ Marks token as consumed (consumedAt = now)
       │    ├─ Checks access: PurchaseToken OR User.accessExpiresAt
       │    └─ Attaches req.userId, req.accessExpiresAt
       └─ If not found: 401 Unauthorized
```

### 4.3 Access Control: PurchaseToken + User.accessExpiresAt

```
hasValidAppLaunchToken checks access:
  ├─ PurchaseToken records (from /api/purchase/register)
  │    └─ Has own expiresAt independent of launch token
  └─ User.accessExpiresAt column (legacy / manual grant)

Access expiresAt = MAX of all valid sources
```

### 4.4 PurchaseToken Registration (`/api/purchase/register`)

```typescript
// Security model:
const configuredApiKey = process.env.PURCHASE_API_KEY;
const providedApiKey = req.headers["x-api-key"];

// Timing-safe comparison:
const expected = Buffer.from(configuredApiKey);
const provided = Buffer.from(providedApiKey);
if (expected.length !== provided.length ||
    !crypto.timingSafeEqual(expected, provided)) {
  return res.status(403).json({ error: "Forbidden" });
}

// Payload validation:
// - email: required, validated via regex, normalized (trim + lowercase)
// - externalOrderId: required, max 200 chars, trimmed

// Token generation:
const token = `purchase_${crypto.randomUUID()}`;
const linkExpiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

// Upsert by externalOrderId (idempotent):
await prisma.purchaseToken.upsert({
  where: { externalOrderId: normalizedOrderId },
  update: {},
  create: {
    token,
    externalOrderId: normalizedOrderId,
    email: normalizedEmail,
    accessDurationDays: ACCESS_DURATION_DAYS, // configured constant
    expiresAt: linkExpiresAt
  }
});
```

**Key observations**:
- `PurchaseToken` is separate from `AppLaunchToken` — one is for purchase verification, the other for session auth.
- The purchase link is a 7-day expiring email link, not an in-app purchase verification.
- Purchase has **its own `accessDurationDays`** independently of launch token TTL.
- `externalOrderId` ensures idempotency — one purchase per order.

### 4.5 Auth Middleware Summary

```typescript
// Middleware chain (simplified):
app.use("/api/*", extractInitData);          // parse Telegram headers
app.use("/api/*", validateAppLaunchToken);    // verify & consume token
app.use("/api/*", attachUserId);             // set req.userId
app.use("/api/*", logRequest);               // request logging wrapper

// Specific routes may have additional checks:
// - /api/purchase/register: skip auth middleware, use x-api-key instead
// - /api/user/init: no auth, creates tokens
```

---

## 5. Deep Dive: Saved Dish Images — sharp Pipeline

### 5.1 Architecture

```
User uploads base64 image
       ↓
  POST /api/saved-dishes
       ↓
  persistSavedDishImage(base64String)
       ↓
  persistImageBytes(Buffer)
       ↓
  createWebpThumbnail(Buffer)
       ↓
     sharp pipeline
       ↓
  SHA-256 hash → .webp filename
       ↓
  Write to filesystem
       ↓
  Store "/saved-dishes/<hash>.webp" in DB
```

### 5.2 Parameters

| Parameter | Value |
|---|---|
| `MAX_SOURCE_IMAGE_BYTES` | 12 MB (12 × 1024 × 1024) |
| `THUMBNAIL_SHORT_SIDE` | 256 pixels |
| `QUALITY` | 68 (sharp WebP) |
| `EFFORT` | 6 (high compression effort) |
| `LIMIT_INPUT_PIXELS` | 40,000,000 (≈ 6300 × 6300) |
| `SMART_SUBSAMPLE` | enabled |
| Output format | `.webp` always |

### 5.3 sharp Processing Details

```typescript
sharp(source, { failOn: "error", limitInputPixels: 40_000_000 })
  .rotate()          // auto-rotate based on EXIF orientation
  .resize({
    width: 256,
    height: 256,
    fit: "outside",    // preserves aspect ratio, ensures 256px on short side
    withoutEnlargement: true  // never upscale small images
  })
  .webp({
    quality: 68,
    effort: 6,
    smartSubsample: true
  })
  .toBuffer();
```

### 5.4 Filesystem Layout

```
Directory: $SAVED_DISH_IMAGES_DIR || src/assets/images/saved-dishes/

File naming: <SHA256(thumbnailBuffer)>.webp
     (Hex digest of the processed WebP buffer)
     Atomic write: write to .tmp file → rename to target
     Collision handling: if EEXIST, skip (filename is content-addressable)

Example:
  /app/src/assets/images/saved-dishes/
    ├── a1b2c3d4e5f6...7890.webp
    ├── fedcba0987...6543.webp
    └── ...
```

### 5.5 DB ↔ Filesystem Linkage

```prisma
model SavedDish {
  id        Int
  userId    Int
  image     String   // "/saved-dishes/<hash>.webp" or legacy base64
  // ...
}
```

- The `image` column stores the **public URL path** (`/saved-dishes/<hash>.webp`).
- A static Express middleware serves these: `app.use("/saved-dishes", express.static(...))`.
- File deletion is **reference-counted**: `deleteSavedDishImage()` checks if any other `SavedDish` references the same image path before deleting.
- **Migration helper**: `migrateSavedDishImages()` — traverses all dishes with legacy `data:image/...` or `/saved-dishes/...` URLs, converts them to WebP thumbnails on disk. Runs at app startup.

### 5.6 Supported Upload Formats

```regex
data:(image/(jpeg|png|webp));base64,<base64>
```

Only JPEG, PNG, and WebP base64 are accepted. All are converted to WebP.

---

## 6. Deep Dive: Anna Chat Pipeline

### 6.1 Architecture

```
POST /api/anna-chat
       ↓
  System prompt builder (includes user profile, context)
       ↓
  Tools array (6 tools):
    1. get_current_date_time
    2. get_nutrition_info
    3. search_recipes
    4. check_food_compatibility
    5. get_user_metrics
    6. get_recipe_details (from Progress model)
       ↓
  DashScope LLM call with tool definitions
       ↓
  Runtime tool execution → results injected into conversation
       ↓
  Second LLM call with tool results → final response
```

### 6.2 DashScope Client Configuration

```typescript
// src/services/dashscopeClient.ts
const DEFAULT_BASE_URL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";

function getDashScopeConfig() {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  // Validates URL must be dashscope.aliyuncs.com or dashscope-intl.aliyuncs.com
  const url = new URL(configuredUrl);
  const isAlibabaDashScope = url.protocol === "https:" && 
    (url.hostname === "dashscope.aliyuncs.com" || 
     url.hostname === "dashscope-intl.aliyuncs.com");
  if (!isAlibabaDashScope) throw new Error("...");
  return { apiKey, baseUrl };
}

// All calls use directFetch (bypasses proxy):
const response = await directFetch(`${baseUrl}/chat/completions`, {
  method: "POST",
  headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
  body: JSON.stringify(payload),
  signal: controller.signal  // 60s timeout
});
```

### 6.3 Model Routing

| Use Case | Primary Model | Fallback Model |
|---|---|---|
| Image analysis | `qwen-vl-max` | `qwen-vl-plus` |
| Anna chat | DashScope chat model | — |
| Dish analysis | `qwen-vl-max` | `qwen-vl-plus` |
| Supports / Sarcasm | DashScope chat model | — |

- **Image analysis** uses `qwen-vl-max` with automatic fallback to `qwen-vl-plus` on failure.
- **Text-only** Anna features use a standard DashScope chat completion model.
- **No Gemini** — the Gemini code that exists in the local dev repo has been completely removed from production.

### 6.4 WFPB Food Substitution Engine

The production bundle includes a comprehensive Russian-language ingredient substitution table:

```typescript
// src/data/wfpb_forbidden_ingredients.ts
const forbiddenPatterns = [
  { pattern: /молоч.../, reason: "Молочные продукты не соответствуют WFPB..." },
  { pattern: /яйц.../,    reason: "Яйца не входят в WFPB-рацион..." },
  { pattern: /мяс.../,    reason: "Мясо не входит в WFPB-рацион..." },
  // ... 14 categories total:
  // Dairy, Eggs, Meat, Poultry, Fish/Seafood, Honey,
  // Refined Sugar, White Flour, Vegetable Oils, Butter/Ghee,
  // Processed Canned Foods (with exclusion list for beans/tomatoes)
]
```

`findForbiddenInText(text)` checks user messages and suggests WFPB-compliant alternatives. This powers Anna's ability to reject non-vegan ingredients with contextual substitution suggestions.

---

## 7. Deep Dive: Achievement System — THE DUAL SYSTEM PROBLEM

### 7.1 Two Independent Achievement Engines

The production bundle contains **two separate achievement engines** that run in parallel:

#### Engine A: `checkBackgroundAchievements()` (Legacy)

```typescript
// Location: ~line 3315
// Called from: /api/achievements/check endpoint (~line 4430)
async function checkBackgroundAchievements(userId: number): Promise<AchievementResult[]> {
  // Direct SQL-like checks via Prisma:
  // - Count completed recipes
  // - Count saved dishes
  // - Count diary entries
  // - Check streaks
  // - Check first actions
  // - Award via Achievement record creation
  
  // Each check queries the DB directly and creates Achievement records
  // No progress tracking — binary awarded/not-awarded
}
```

**Characteristics**:
- Runs synchronously after certain user actions
- Checks raw DB counts
- Awards achievements instantly
- No progress percentage tracking
- No partial progress updates

#### Engine B: `AchievementService` (Newer)

```typescript
// Called from: /api/achievements/track endpoint (~line 4539)
// Also called contextually from various actions
class AchievementService {
  // Tracks progress using AchievementProgress model
  // Has defined thresholds and levels
  // Supports partial progress (e.g., 3/5 recipes completed)
  // Can return "almost there" messages
}
```

**Characteristics**:
- Event-driven tracking
- Uses `AchievementProgress` table for granular progress
- Supports percentage completion
- Can notify user when close to unlocking

### 7.2 How They Coexist

```
User action (e.g., saves a dish)
       ↓
  Both engines fire:

  1. AchievementService.track("saved_dish_count", +1)
     → Updates progress in AchievementProgress table
     → If threshold reached → award achievement
     → Returns progress update to client

  2. POST /api/achievements/check (via checkBackgroundAchievements)
     → Queries all relevant counts from scratch
     → If any threshold newly met → create Achievement record
     → Returns newly awarded achievements

  Potential duplicates:
  - Same achievement could be awarded by both engines
  - Race condition: Engine B awards → Engine A also awards
  - Double award notification to user
```

### 7.3 Endpoint Behavior

| Endpoint | Engine | Behavior |
|---|---|---|
| `POST /api/achievements/check` | Engine A (legacy) | Full scan of all check functions, awards any newly met criteria. Returns array of new achievements. |
| `POST /api/achievements/track` | Engine B (new) | Increment progress, check thresholds, award if met. Returns progress state. |
| `GET /api/achievements/check-pending` | Both | Queries `Achievement` model where `shownAt = null`. |
| `POST /api/achievements/mark-shown` | Both | Sets `shownAt` on specified achievements. |

### 7.4 Risk Assessment

| Risk | Severity | Explanation |
|---|---|---|
| Double awarding | Medium | Same achievement can be awarded by both engines independently |
| Progress inconsistency | Medium | Engine A doesn't update AchievementProgress, so Engine B may show stale progress |
| Race conditions | Low | Both engines use transactions, but check against different tables |
| Missing progress | Low | Engine A doesn't track "almost there" states for partial achievements |

**Recommendation**: Consolidate into a single `AchievementService` and deprecate `checkBackgroundAchievements`.

---

## 8. Hardcoded Secrets Inventory

| Secret | Location | Line | Severity | Notes |
|---|---|---|---|---|
| `USDA_API_KEY` | `var USDA_API_KEY = "ywYviAkfdnK8u2Sn19fMG7Kvmje8y2Bd66Hi2hlN"` | 2283 | **CRITICAL** | Hardcoded in source, exposed in plaintext in the bundle. Used for USDA FoodData Central API calls. |
| `DASHSCOPE_API_KEY` | `process.env.DASHSCOPE_API_KEY` | 67, 139, 195 | OK | Environment variable, used in 3 separate client instances |
| `TELEGRAM_BOT_TOKEN` | `process.env.TELEGRAM_BOT_TOKEN` | 2022, 2135 | OK | Environment variable |
| `PURCHASE_API_KEY` | `process.env.PURCHASE_API_KEY` | 2625 | OK | Environment variable, used with `timingSafeEqual` |
| `SERVER_URL` | `process.env.SERVER_URL` | — | Low | Falls back to public URL if unset |

### 8.1 USDA API Key Risk

The key `ywYviAkfdnK8u2Sn19fMG7Kvmje8y2Bd66Hi2hlN` is:
1. Visible in the compiled bundle served to anyone who can access the pod
2. Used at: `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${USDA_API_KEY}&query=...`
3. Rate-limited by USDA (likely 1000 req/day for free tier)
4. Should be moved to environment variable immediately

---

## 9. Key Differences: Production vs Local Repository

| Feature | Production (`server.cjs`) | Local (dev) | Significance |
|---|---|---|---|
| **Image storage** | Filesystem via `sharp` WebP thumbnails | Base64 in DB | Production avoids DB bloat; eliminates base64 overhead |
| **`sharp` dependency** | Yes | No | Production has image processing; local doesn't |
| **Gemini AI** | **Removed entirely** | Present in local | Production uses only DashScope |
| **Purchase registration** | `/api/purchase/register` with API key | Missing | Production has purchase flow absent in local |
| **Club endpoints** | Stub responses (3 endpoints) | Missing | Club feature range not yet built |
| **`undici` directFetch** | Yes — bypasses proxy for AI calls | Uses standard fetch | Production has explicit proxy bypass |
| **`MigrateSavedDishImages`** | Runs at startup | Missing | Production migration helper converts legacy images |
| **WFPB ingredient checker** | Full 14-category substitution table | Incomplete? | Production has extensive Russian-language food validation |
| **Audio transcription** | `/api/transcribe-audio` | Missing | Production supports voice input |
| **`RINGO_PROXY_URL`** | Used for Telegram bot | Not used | Production routes bot through proxy |
| **USDA key** | Hardcoded | Hardcoded | **Same issue in both** |
| **Launch token TTL** | Configurable via env (default 60 min) | Likely hardcoded | Production has runtime-configurable TTL |
| **`accessDurationDays`** | Constant in purchase module | Missing | Production purchase grants time-limited access |

---

## 10. Frontend — Notable Observations

From the SPA bundle analysis (`dist/assets/index-DetcCmci.js`):

### 10.1 Screen Navigation

- **No React Router** — navigation via `ScreenContext` state machine managing a `currentScreen` variable
- **Bottom navigation**: 3 tabs (Diary, Anna, Recipes) — React state, not URL-based
- **Back navigation**: Manual stack management in `ScreenContext`

### 10.2 Communication Patterns

- **HTTP for data**: `fetch()` calls wrapped in helper functions
- **Long-polling**: For Anna chat responses (not WebSocket)
- **Polling**: Periodic `GET /api/user/state-now` for state sync

### 10.3 localStorage Keys

| Key | Purpose |
|---|---|
| `initData` | Cached Telegram WebApp init data |
| `deviceId` | Unique device identifier |
| `launch_token` | Current launch token (consumed after use) |

---

## 11. Error Handling & Logging

### 11.1 Global Error Handler (line 4710+)

```typescript
app.use((err, req, res, next) => {
  if (process.env.NODE_ENV === "production") {
    // Generic message in production
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
    // Full error logged server-side only
    logger.error("Unhandled error:", err);
  } else {
    // Dev mode returns full stack
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});
```

### 11.2 Request Logging

Every API call is logged via a middleware that wraps `res.end`:
```
[2026-07-22T10:30:00] INFO: POST /api/anna-chat 200 2345ms user_abc12345
```

### 11.3 Client Error Logging

`POST /api/logs/client` accepts structured error reports from the SPA:
```typescript
// Log levels: error → logger.error, warn → logger.warn, else → logger.info
{ level: "error", message: "...", source: "RecipeScreen", url: "...", stack: "..." }
```

---

## 12. Performance & Security Notes

### 12.1 Performance

| Aspect | Observation |
|---|---|
| **JSON body limit** | 50MB (`express.json({ limit: "50mb" })`) — very high, intended for base64 images |
| **Static files** | `dotfiles: "deny", fallthrough: false` — safe configuration |
| **Image size limit** | 12MB via sharp pipeline (additional safeguard beyond 50MB body limit) |
| **LLM timeout** | 60 seconds for DashScope calls |
| **No response caching** | No Express caching middleware detected |
| **No rate limiting** | No `express-rate-limit` or similar middleware |

### 12.2 Security

| Aspect | Observation |
|---|---|
| **USDA key hardcoded** | Publicly exposed in bundle |
| **Timing-safe comparison** | Used for purchase API key verification |
| **SHA-256 for tokens** | Launch tokens hashed before DB storage |
| **No Helmet** | No `helmet` middleware detected |
| **No CORS** | No CORS middleware — relies on TMA origin isolation |
| **No CSRF** | CSRF not applicable (TMA uses initData) |
| **Prisma SQL injection** | Mitigated by Prisma parameterized queries |
| **Directory traversal** | `basename()` check in image deletion prevents path traversal |

---

## 13. Dependencies (from require() statements)

| Package | Usage |
|---|---|
| `express` | HTTP server framework |
| `cors` | Cross-origin (minimal) |
| `path` | File path resolution |
| `fs/promises` | Async file operations |
| `crypto` | SHA-256 hashing, random token generation, timing-safe comparison |
| `dotenv` | Environment variable loading |
| `@prisma/client` | Database ORM |
| `telegraf` | Telegram bot framework |
| `https-proxy-agent` | Proxy support for Telegram bot |
| `undici` | Direct HTTP fetch (bypasses proxy for AI) |
| `sharp` | Image processing (WebP thumbnails) |
| `winston` | Structured logging |
| `vite` | Dev server only (never loaded in production) |

---

## 14. Summary of Findings

1. **Architecture**: Single-process Express.js + Prisma ORM + DashScope LLM. No React Router on frontend — ScreenContext state machine.
2. **Auth**: Two-tier token system — `AppLaunchToken` (60min session) + `PurchaseToken` (7-day access grant). SHA-256 hashed tokens.
3. **Image Pipeline**: `sharp` WebP thumbnails → filesystem storage → content-addressed by SHA-256 hash. 12 MB limit, 256px short side.
4. **Dual Achievement System**: `checkBackgroundAchievements()` (legacy full-scan) + `AchievementService` (event-driven progress tracking) run in parallel — **duplication risk**.
5. **Hardcoded Secret**: `USDA_API_KEY` in plaintext at line 2283 — **critical**.
6. **Club Feature**: Stub-only — returns "скоро будет доступен" for all 3 endpoints.
7. **No Gemini**: Removed from production bundle — only DashScope remains.
8. **Purchase Flow**: External email-link system with `timingSafeEqual` API key verification — separate from TMA auth.
9. **No Rate Limiting, No Helmet, No CORS headers** — potential security hardening opportunities.
10. **Dev vs Prod**: 8+ significant differences identified between local repository and production bundle.
