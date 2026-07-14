## Objective
Complete the achievements module (all 85 achievements, triggers, overlay, Mixer, God Mode, server hydration, UI redesign) and the Shopping List module (Prisma schema, API CRUD, frontend integration).

## Important Details
- Achievement engine starts empty on page load — hydrated from server via `GET /api/user/data` response field `unlockedAchievementIds`.
- God Mode (`isGodModeEnabled()`) defaults `false`, controlled only via `AchievementsDebugPanel` / `localStorage`. In `AchievementModal`, `showMixer` depends **only** on `isFreshUnlock` (not `godMode`).
- Mixer button appears **only once** per achievement — when first unlocked via overlay (`isFreshUnlock: true`). Hall of Fame always passes `isFreshUnlock: false`.
- `userGender` in `App.tsx` was hardcoded `"female"` and never synced from server. Now synced reactively from Zustand store `userProfile.gender` via `useEffect`.
- `buildGeminiPrompt` gender instruction broadened: now covers verbs, adjectives, and nouns (not just verbs).
- `GET /api/user/data` now includes `unlockedAchievementIds` from `UserAchievement` table.
- `ShoppingItem` DB schema migrated: replaced `category`/`dayIndex` with `barcode`, `brand`, `imageUrl`, `verdictStatus`; FK now has `onDelete: Cascade`.

## Work State

### Completed
- **Gender fix**: `genderInstruction` in `mixerAI.ts` broadened to cover all speech parts; `App.tsx` now syncs `userGender` from Zustand store (`userProfile.gender`).
- **Avatar flicker fix**: `AnnaPanel.tsx` wraps `avatarConfig` in `useMemo` so it's stable during typing animation.
- **Hall of Fame redesign** (`MyRewardsScreen`, `RewardCard`, `StatsRow`, `FilterChips`, `RarityFilter`, `ShowUnearnedToggle`): dark gradient background (`#0f111a`), glassmorphism stats panel with neon progress bar, dark translucent filters, premium glass cards with rarity glow (slate→emerald→blue→purple→gold+`animate-pulse`), locked achievements have `grayscale contrast-125 opacity-40 blur-sm` + lock icon.
- **Achievement engine server hydration**: `setUnlockedIds()` method added to `AchievementEngine.ts`; `GET /api/user/data` now queries `UserAchievement` and returns `unlockedAchievementIds`; `App.tsx` calls `achievementEngine.setUnlockedIds(data.unlockedAchievementIds)` after data load.
- **God Mode debug badge removed** from `AchievementModal.tsx` (lines 199-202).
- **Mixer button production logic**: `showMixer = isFreshUnlock` (not `godMode || daysSince >= 3`). Overlay flow forces `isFreshUnlock: true`; Hall of Fame forces `isFreshUnlock: false`.
- **Images fixed**: `Капелька` and `Спокойной ночи` removed from `MISSING_ART`; achievements use `artFile()` directly.
- **Shopping list schema**: `ShoppingItem` model updated — added `barcode`, `brand`, `imageUrl`, `verdictStatus`; removed `category`, `dayIndex`; FK has `onDelete: Cascade`. Migration `20260714070000_add_shopping_fields` applied with data copy (`category` → `brand`).
- **Shopping API**: `POST /api/shopping-list` accepts new fields; `DELETE /api/shopping-list` added for bulk clear.
- **Shopping frontend**: `PersonalShoppingItem` interface updated to use `verdictStatus: "green" | "orange" | "red"`. `handleAddToShoppingList` maps verdict status (perfect/warning/oil-sugar/bad → green/orange/red), sends new fields (barcode, name, brand, imageUrl, verdictStatus), shows toast "Добавлено в список!", and navigates back to start. Clear-all uses single `DELETE /api/shopping-list`. Card render reads `item.verdictStatus` with lookup tables `vColor`/`vLabel`. Toast component renders as fixed overlay. Build passes.

### Active
- (none)

### Blocked
- (none)

## Next Move
- (none — all planned work is implemented)

## Relevant Files
- `prisma/schema.prisma`: `ShoppingItem` model (barcode, brand, imageUrl, verdictStatus, onDelete: Cascade).
- `prisma/migrations/20260714070000_add_shopping_fields/migration.sql`: schema migration + data migration.
- `server.ts`: `GET /api/user/data` includes `unlockedAchievementIds`; shopping endpoints updated.
- `src/modules/achievements/engine/AchievementEngine.ts`: `setUnlockedIds()` method.
- `src/App.tsx`: syncs `userGender` from store; hydrates `achievementEngine` after data load.
- `src/modules/mixer/services/mixerAI.ts`: broadened gender instruction.
- `src/modules/mixer/components/AnnaPanel.tsx`: `avatarConfig` memoized.
- `src/modules/achievements/screens/MyRewardsScreen.tsx`: dark theme, glassmorphism, `isFreshUnlock: false`.
- `src/modules/achievements/components/RewardCard.tsx`: glassmorphism, rarity glow, `blur-sm` on locked.
- `src/modules/achievements/components/AchievementModal.tsx`: debug badge removed, `showMixer = isFreshUnlock` only.
- `src/modules/achievements/display/AchievementOverlay.tsx`: forces `isFreshUnlock: true`.
- `src/modules/achievements/config/achievementContent.ts`: `Капелька`/`Спокойной ночи` use `artFile()`.
- `src/components/MyPurchasesScreen.tsx`: updated `PersonalShoppingItem` interface, POST body, toast + navigate back, clear-all endpoint, card render with `verdictStatus`.
