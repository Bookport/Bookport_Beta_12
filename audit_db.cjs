// This is a local analysis script - reads pre-collected data
const fs = require('fs');

// From schema.prisma we have all models. Let me build a comprehensive analysis
// of which fields are actually used in server.cjs

const report = `
========================================
SCHEMA.PRISMA — ПОЛНЫЙ АУДИТ
========================================

1. МОДЕЛИ И СВЯЗИ (полный список)
========================================

Всего моделей: 14

User (1) ─┬── DailyMetric[]        (1:M)
           ├── DailyRating[]        (1:M)
           ├── RecipeProgress[]     (1:M)
           ├── SavedDish[]          (1:M)
           ├── DiaryEntry[]         (1:M)
           ├── ShoppingItem[]       (1:M, onDelete: Cascade)
           ├── Purchase[]           (1:M)
           ├── AnnaChat[]           (1:M)
           ├── AnnaOverlayMessage[] (1:M)
           ├── UserAchievement[]    (1:M)
           └── EveningRitual[]      (1:M)

BookRecipe (1) ─── RecipeProgress[] (1:M через @@id([type, id]))

ПОСТОРОННИЕ (не привязанные к User):
- PurchaseToken (ссылается telegramId, но не User.id)
- AppLaunchToken (ссылается telegramId, но не User.id)
- Achievement (справочник, не зависит от пользователя)
- FoodItem (справочник USDA, не зависит от пользователя)

СВЯЗИ С КАСКАДНЫМ УДАЛЕНИЕМ:
- ShoppingItem → User (onDelete: Cascade) — ЕДИНСТВЕННАЯ

СВЯЗИ БЕЗ КАСКАДА (все остальные → User):
- DailyMetric         — "сироты" при удалении User
- DailyRating         — "сироты"
- RecipeProgress      — "сироты"  
- SavedDish           — "сироты"
- DiaryEntry          — "сироты"
- Purchase            — "сироты"
- AnnaChat            — "сироты"
- AnnaOverlayMessage  — "сироты"
- UserAchievement     — "сироты"
- EveningRitual       — "сироты"
`;

console.log(report);
