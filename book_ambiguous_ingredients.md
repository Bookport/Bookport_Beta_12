# Спорные ингредиенты Книги — ручные продуктовые решения

Файл содержит только ингредиенты рецептов Книги, для которых требуется **ручное продуктовое решение**.
Он не содержит фактов-решений: все конкретные значения (action / foodKey / grams / components / note)
оставлены пустыми в блоке `manualDecision`.

**Источники:**
- полная инвентаризация `/tmp/opencode/inventory_out2.txt`;
- исходные back-data рецептов Книги (`src/data/*_back.ts`).

**Исключены (не входят в файл):**
- очевидные алиасы, перестановки слов, формы единственного/множественного числа;
- безопасные нормализации;
- вода, овощной бульон (всегда treated_as_water / excluded), соль;
- «по вкусу», щепотки, технологические культуры (кроме отдельных строк с закваской, где указано явно);
- стандартные мерные проблемы, решаемые общей таблицей объём→граммы;
- мусорные фрагменты парсинга и инструкции.

**Типы решения (enum):** `foodKey` / `split` / `excluded` / `needs_new_fooditem` / `needs_portion`.

---

## 1. Смеси и соусы

#### 1.1. смесь «Земляной умами»
- **sourceName:** смесь «Земляной умами»
- **решение:** split
- **recipes:** breakfast_24 «КРУГЛЯШКИ ТОФИ» (1)
- **sourceLine:** `"смесь «Земляной умами»** - 1,3 г (½ ч. л.);"`
- **sourceRecipe:** Нет

```yaml
manualDecision:
  action:
  foodKey:
  grams:
  components:
  note:
```

#### 1.2. смесь «Карри WFPB»
- **sourceName:** смесь «Карри WFPB»
- **решение:** split
- **recipes:** lunch_24 «ЗЛАТОЦВЕТ» (1)
- **sourceLine:** `"смесь «Карри WFPB»*** - 3 г;"`
- **sourceRecipe:** Нет

```yaml
manualDecision:
  action:
  foodKey:
  grams:
  components:
  note:
```

#### 1.3. смесь «Солнечный имбирь»
- **sourceName:** смесь «Солнечный имбирь»
- **решение:** split
- **recipes:** dinner_24 «НЕЖНЫЙ ЗАКАТ» (1)
- **sourceLine:** `"смесь «Солнечный имбирь» - ½ ч. л.;"`
- **sourceRecipe:** Нет

```yaml
manualDecision:
  action:
  foodKey:
  grams:
  components:
  note:
```

#### 1.4. смесь специй «Суперзаряд»
- **sourceName:** смесь специй «Суперзаряд»
- **решение:** split
- **recipes:** lunch_18 «ЖАРКИЙ ГЕРОЙ» (1)
- **sourceLine:** `"смесь специй «Суперзаряд»."` (вес не указан)
- **sourceRecipe:** Нет

```yaml
manualDecision:
  action:
  foodKey:
  grams:
  components:
  note:
```

#### 1.5. соус «Красный бархат»
- **sourceName:** соус «Красный бархат»
- **решение:** split
- **recipes:** lunch_15 «ИТАЛЬЯНО» (1)
- **sourceLine:** `"соус «Красный бархат» - 3 ст. л. (~45 г);"`
- **sourceRecipe:** Да — compliment_10 «КРАСНЫЙ БАРХАТ» (томатно-перечный соус)

```yaml
manualDecision:
  action:
  foodKey:
  grams:
  components:
  note:
```

#### 1.6. соус «Огненный поцелуй»
- **sourceName:** соус «Огненный поцелуй»
- **решение:** split
- **recipes:** dinner_23 «АДЖАПСАНДАЛ» (1)
- **sourceLine:** `"соус «Огненный поцелуй» - 45 г;"` (в том же рецепте есть инлайн-блок «Для соуса:»)
- **sourceRecipe:** Да — compliment_13 «ОГНЕННЫЙ ПОЦЕЛУЙ» (острый перечный соус); также инлайн-вариант в dinner_23

```yaml
manualDecision:
  action:
  foodKey:
  grams:
  components:
  note:
```

#### 1.7. кешью-соус
- **sourceName:** кешью-соус (сырой кешью + вода, без добавок)
- **решение:** split
- **recipes:** breakfast_19 «ПЛЮШЕВЫЕ РАДОСТИ» (1)
- **sourceLine:** `"кешью-соус (сырой кешью + вода, без добавок)*** - 60 г."`
- **sourceRecipe:** Частично — паста-основа recipe_day_21 «ШЁЛКОВЫЙ ПУТЬ (кешью)»; состав указан инлайн

```yaml
manualDecision:
  action:
  foodKey:
  grams:
  components:
  note:
```

#### 1.8. кешью-паста с белой мисо и нори
- **sourceName:** кешью-паста с белой мисо и нори
- **решение:** split
- **recipes:** breakfast_22 «МОРСКОЙ РАССВЕТ» (1)
- **sourceLine:** `"кешью-паста с белой мисо и нори - 30 г (2 ст. л.);"`
- **sourceRecipe:** Нет

```yaml
manualDecision:
  action:
  foodKey:
  grams:
  components:
  note:
```

#### 1.9. паста из тыквенных семечек
- **sourceName:** паста из тыквенных семечек
- **решение:** split
- **recipes:** recipe_day_38 «Хумус Солнечный» (1)
- **sourceLine:** `"паста из тыквенных семечек - 2 ст. л.;"`
- **sourceRecipe:** Нет

```yaml
manualDecision:
  action:
  foodKey:
  grams:
  components:
  note:
```

#### 1.10. микс зелени
- **sourceName:** микс зелени
- **решение:** split
- **recipes:** dinner_20 «МАДАМ БРЮСЕЛЬЕ» (1)
- **sourceLine:** `"микс зелени - 100 г;"`
- **sourceRecipe:** Нет (compliment_20 «ЖИВАЯ ЗЕЛЕНЬ» — приправа, не зелень)

```yaml
manualDecision:
  action:
  foodKey:
  grams:
  components:
  note:
```

#### 1.11. смесь кунжута и дроблёных грецких орехов
- **sourceName:** смесь кунжута и дроблёных грецких орехов
- **решение:** split
- **recipes:** breakfast_13 «КНЯЖЕСКАЯ КАША» (1)
- **sourceLine:** `"смесь кунжута и дроблёных грецких орехов - 20 г (8 г кунжута + один орех)."`
- **sourceRecipe:** Нет (состав указан в скобках)

```yaml
manualDecision:
  action:
  foodKey:
  grams:
  components:
  note:
```

#### 1.12. укроп, петрушка (и варианты)
- **sourceName:** укроп, петрушка / петрушка, укроп / укроп, петрушка, руккола
- **решение:** split
- **recipes:** lunch_2 «СОКРОВИЩЕ ИНКОВ», lunch_3 «ЗОЛОТЫЕ РОССЫПИ», lunch_5 «СОЛО НА БАРАБАНЕ», compliment_7 «МЯГКИЙ ОРЕШЕК», recipe_day_7 «ПУХЛЯШИ-ДОБРЯШИ» (5)
- **sourceLine:**
  - lunch_2: `"укроп, петрушка*** - 10 г;"`
  - lunch_3: `"петрушка, укроп - 15 г мелко рубленой зелени."`
  - lunch_5: `"укроп, петрушка, руккола** - 20 г;"`
  - compliment_7: `"укроп, петрушка - 1 горсть;"`
  - recipe_day_7: `"укроп, петрушка - 1 ст. л;"`
- **sourceRecipe:** Нет (общее правило split)

```yaml
manualDecision:
  action:
  foodKey:
  grams:
  components:
  note:
```

#### 1.13. тмин + кориандр
- **sourceName:** тмин + кориандр
- **решение:** split
- **recipes:** compliment_13 «ОГНЕННЫЙ ПОЦЕЛУЙ» (1)
- **sourceLine:** `"тмин + кориандр - по 1 ч. л. (обжаренные и молотые);"`
- **sourceRecipe:** Нет

```yaml
manualDecision:
  action:
  foodKey:
  grams:
  components:
  note:
```

#### 1.14. орегано, тмин
- **sourceName:** орегано, тмин
- **решение:** split
- **recipes:** lunch_15 «ИТАЛЬЯНО» (1)
- **sourceLine:** `"орегано, тмин - по ½ ч. л.;"`
- **sourceRecipe:** Нет

```yaml
manualDecision:
  action:
  foodKey:
  grams:
  components:
  note:
```

#### 1.15. укроп + мята
- **sourceName:** укроп + мята
- **решение:** split
- **recipes:** recipe_day_39 «Хумус Весенний» (1)
- **sourceLine:** `"укроп + мята - ~30 г;"`
- **sourceRecipe:** Нет

```yaml
manualDecision:
  action:
  foodKey:
  grams:
  components:
  note:
```

#### 1.16. красный и жёлтый перец
- **sourceName:** красный и жёлтый перец
- **решение:** split
- **recipes:** breakfast_25 «НАРЯДНЫЙ КРАСАВЧИК» (1)
- **sourceLine:** `"красный и жёлтый перец (нарезанный полосками) - 150 г;"`
- **sourceRecipe:** Нет

```yaml
manualDecision:
  action:
  foodKey:
  grams:
  components:
  note:
```

#### 1.17. семена подсолнечника, тыквы, кунжута
- **sourceName:** семена подсолнечника, тыквы, кунжута
- **решение:** split
- **recipes:** dinner_2 «ОДНА В ЛОДКЕ» (1)
- **sourceLine:** `"семена подсолнечника, тыквы, кунжута - 1 ст. л. (~10 г);"`
- **sourceRecipe:** Нет

```yaml
manualDecision:
  action:
  foodKey:
  grams:
  components:
  note:
```

#### 1.18. смесь семян (тыква, кунжут, амарант, чёрный тмин, расторопша)
- **sourceName:** смесь семян (тыква, кунжут, амарант, чёрный тмин, расторопша)
- **решение:** split
- **recipes:** must_have_8 «УМНАЯ НАСЫЩАЮЩАЯ МАТРИЦА» (1)
- **sourceLine:** `"смесь семян (тыква, кунжут, амарант, чёрный тмин, расторопша) - 10 г;"`
- **sourceRecipe:** Нет (ингредиент собственного рецепта)

```yaml
manualDecision:
  action:
  foodKey:
  grams:
  components:
  note:
```

---

## 2. Альтернативы

#### 2.1. свежие или замороженные ягоды
- **sourceName:** свежие или замороженные ягоды (черника, малина, ежевика / клюква / клубника, голубика)
- **решение:** foodKey
- **recipes:** breakfast_3 «В ГОСТЯХ У БАБУШКИ», breakfast_4 «ИГРУШКА ОСЕНИ», compliment_1 «Анины бусы» (3)
- **sourceLine:**
  - breakfast_3: `"свежие или замороженные ягоды (черника, малина, ежевика)* - ½ стакана (~75 г);"`
  - breakfast_4: `"ягоды свежие или замороженные (черника, ежевика, малина, клюква) - 100 г;"`
  - compliment_1: `"свежие* или замороженные** ягоды (черника, малина, ежевика, клубника, голубика и т.д.) - 200 г;"`
- **sourceRecipe:** Частично — рецепты джемов recipe_day_13, recipe_day_14 (обобщение «ягоды» см. 4.11)

```yaml
manualDecision:
  action:
  foodKey:
  grams:
  components:
  note:
```

#### 2.2. томаты или томатная паста
- **sourceName:** томаты или томатная паста
- **решение:** foodKey
- **recipes:** dinner_28 «ПРИВЕТ ФРАНЦУЗУ!» (1)
- **sourceLine:** `"томаты или томатная паста - 30 г;"`
- **sourceRecipe:** Нет

```yaml
manualDecision:
  action:
  foodKey:
  grams:
  components:
  note:
```

#### 2.3. шпинат или листовая капуста
- **sourceName:** шпинат или листовая капуста
- **решение:** foodKey
- **recipes:** dinner_1 «ЯНТАРНАЯ ШКАТУЛКА» (1)
- **sourceLine:** `"шпинат или листовая капуста - 2 горсти (~60 г);"`
- **sourceRecipe:** Нет

```yaml
manualDecision:
  action:
  foodKey:
  grams:
  components:
  note:
```

#### 2.4. шпинат (или листовой салат)
- **sourceName:** шпинат (или листовой салат)
- **решение:** foodKey
- **recipes:** breakfast_25 «НАРЯДНЫЙ КРАСАВЧИК» (1)
- **sourceLine:** `"шпинат (или листовой салат) - несколько листьев;"`
- **sourceRecipe:** Нет

```yaml
manualDecision:
  action:
  foodKey:
  grams:
  components:
  note:
```

#### 2.5. вода или растительное молоко (миндальное / кокосовое / кешью / домашнее овсяное)
- **sourceName:** вода или растительное молоко (миндальное / кокосовое / кешью / домашнее овсяное)
- **решение:** foodKey
- **recipes:** breakfast_1 «ОВСЯНКА, СЭР!», breakfast_10 «ГОСТЬ ИЗ МЕКСИКИ», breakfast_13 «КНЯЖЕСКАЯ КАША», breakfast_17 «ТЕПЛО ПЕРУАНСКОГО УТРА», recipe_day_2 «ПРОСТАЯ ИСТОРИЯ» (5)
- **sourceLine:**
  - breakfast_1: `"вода или миндальное молоко домашнего приготовления**** - 300 мл;"`
  - breakfast_10: `"вода или растительное молоко (миндальное, кокосовое) - 300 мл;"`
  - breakfast_13: `"вода или домашнее овсяное молоко (предпочтительно)** - 250 мл;"`
  - breakfast_17: `"вода (или растительное молоко: миндальное, кешью) - 360 мл;"`
  - recipe_day_2: `"вода или растительное молоко - 50-100 мл."`
- **sourceRecipe:** Частично — пасты-основы recipe_day_20/21/22; см. 4.3 «растительное молоко»

```yaml
manualDecision:
  action:
  foodKey:
  grams:
  components:
  note:
```

#### 2.6. зелень (петрушка, укроп, шпинат или руккола)
- **sourceName:** зелень (петрушка, укроп, шпинат или руккола)
- **решение:** foodKey
- **recipes:** compliment_3 «Подарок Персеи» (1)
- **sourceLine:** `"зелень (петрушка, укроп, шпинат или руккола**) - ½ пучка (~25 г);"`
- **sourceRecipe:** Нет

```yaml
manualDecision:
  action:
  foodKey:
  grams:
  components:
  note:
```

#### 2.7. хлеб (см. «Рецепт дня»/24 День)
- **sourceName:** хлеб (см. «Рецепт дня»/24 День)
- **решение:** foodKey
- **recipes:** breakfast_25 «НАРЯДНЫЙ КРАСАВЧИК» (1)
- **sourceLine:** `"хлеб (см. «Рецепт дня»/24 День) - 2 ломтика* (160 г);"`
- **sourceRecipe:** Возможно — ссылка на «Рецепт дня» 24 (проверить содержимое recipe_day_24)

```yaml
manualDecision:
  action:
  foodKey:
  grams:
  components:
  note:
```

#### 2.8. грибы (шампиньоны или лесные)
- **sourceName:** грибы (шампиньоны или лесные)
- **решение:** foodKey
- **recipes:** dinner_14 «ТРИО ПОД ЗЕЛЕНЬЮ» (1)
- **sourceLine:** `"грибы (шампиньоны или лесные)* - 300 г;"`
- **sourceRecipe:** Нет

```yaml
manualDecision:
  action:
  foodKey:
  grams:
  components:
  note:
```

---

## 3. Домашние продукты и полуфабрикаты

#### 3.1. льняное «яйцо»
- **sourceName:** льняное «яйцо»
- **решение:** split
- **recipes:** breakfast_24 «КРУГЛЯШКИ ТОФИ», breakfast_26 «НЕОЖИДАННОЕ ГОФРЕ», dinner_15 «КНЕЛИ ПОД ШУБКОЙ», recipe_day_32 «МОЯ ПРЕЛЕСТЬ!» (4)
- **sourceLine:**
  - breakfast_24: `"льняное «яйцо» - 1 ст. л. цельного льняного семени + 4 ст. л. воды;"`
  - breakfast_26: `"льняное «яйцо» - 1,5 ст. л. льна + 3 ст. л. воды, настоять 10 мин;"`
  - dinner_15: `"льняное «яйцо» - 1 шт;"`
  - recipe_day_32: `"льняное «яйцо» - 1 шт.;"`
- **sourceRecipe:** Нет (метод описан инлайн в breakfast_24)

```yaml
manualDecision:
  action:
  foodKey:
  grams:
  components:
  note:
```

#### 3.2. льняной гель
- **sourceName:** льняной гель
- **решение:** split
- **recipes:** dinner_18 «А В КАРМАШКАХ - ЗОЛОТО!», dinner_22 «КАПУСТА И ВСЕ, ВСЕ, ВСЕ...» (2)
- **sourceLine:**
  - dinner_18: `"льняной гель*** - 12 г."`
  - dinner_22: `"льняной гель** - 30 г;"`
- **sourceRecipe:** Нет

```yaml
manualDecision:
  action:
  foodKey:
  grams:
  components:
  note:
```

#### 3.3. ореховый сыр (быстрый)
- **sourceName:** ореховый сыр (быстрый)
- **решение:** split
- **recipes:** breakfast_12 «ОВСЯНЫШ» (1)
- **sourceLine:** `"ореховый сыр (быстрый)*** - 50 г;"`
- **sourceRecipe:** Да — compliment_7 «МЯГКИЙ ОРЕШЕК» (быстрый ореховый сыр с семенами, зеленью и лимоном)

```yaml
manualDecision:
  action:
  foodKey:
  grams:
  components:
  note:
```

#### 3.4. ферментированный миндальный сыр
- **sourceName:** ферментированный миндальный сыр
- **решение:** split
- **recipes:** breakfast_24 «КРУГЛЯШКИ ТОФИ» (1)
- **sourceLine:** `"ферментированный миндальный сыр*** - 25 г;"`
- **sourceRecipe:** Да — recipe_day_30 «Миндальный сыр»

```yaml
manualDecision:
  action:
  foodKey:
  grams:
  components:
  note:
```

#### 3.5. домашний тофу / тофу домашний
- **sourceName:** домашний тофу / тофу домашний (мягкий)
- **решение:** split
- **recipes:** breakfast_24 «КРУГЛЯШКИ ТОФИ», breakfast_28 «ОМ-НОМ-НОМ!» (2)
- **sourceLine:**
  - breakfast_24: `"домашний тофу* - 200 г;"`
  - breakfast_28: `"тофу домашний (мягкий) - 150 г;"`
- **sourceRecipe:** Да — recipe_day_29 «УМНЫЙ ТОФУ»

```yaml
manualDecision:
  action:
  foodKey:
  grams:
  components:
  note:
```

#### 3.6. домашнее кокосовое молоко
- **sourceName:** домашнее кокосовое молоко
- **решение:** needs_new_fooditem
- **recipes:** lunch_24 «ЗЛАТОЦВЕТ» (1)
- **sourceLine:** `"домашнее кокосовое молоко** - 50 мл;"`
- **sourceRecipe:** Нет (производится инлайн в lunch_6: `"вода - 120 мл (для кокосового молока);"`)

```yaml
manualDecision:
  action:
  foodKey:
  grams:
  components:
  note:
```

#### 3.7. пробиотическая закваска
- **sourceName:** пробиотическая закваска
- **решение:** excluded
- **recipes:** must_have_4 «Миндально-кешью йогурт» (1)
- **sourceLine:** `"пробиотическая закваска** - 1 ст. л. (15 мл);"`
- **sourceRecipe:** Частично — закваска-стартер делается инлайн в must_have_1

```yaml
manualDecision:
  action:
  foodKey:
  grams:
  components:
  note:
```

#### 3.8. закваска
- **sourceName:** закваска
- **решение:** excluded
- **recipes:** recipe_day_30 «Миндальный сыр» (1)
- **sourceLine:** `"закваска** - 2 ст. л.;"`
- **sourceRecipe:** Частично — закваска-стартер делается инлайн в must_have_1

```yaml
manualDecision:
  action:
  foodKey:
  grams:
  components:
  note:
```

#### 3.9. рисовая вода
- **sourceName:** рисовая вода
- **решение:** excluded
- **recipes:** must_have_1 «ОЧЕНЬ ВКУСНЫЕ ДЕЛА!» (1)
- **sourceLine:** `"рисовая вода - 90 мл;"`
- **sourceRecipe:** Нет (рецепт описан инлайн в instructions must_have_1)

```yaml
manualDecision:
  action:
  foodKey:
  grams:
  components:
  note:
```

#### 3.10. яблочный джем без сахара
- **sourceName:** яблочный джем без сахара
- **решение:** needs_new_fooditem
- **recipes:** breakfast_20 «ЗАВТРАК В ДЕРЕВНЕ» (1)
- **sourceLine:** `"яблочный джем без сахара*** - 50 г."`
- **sourceRecipe:** Частично — ягодные джемы recipe_day_13, recipe_day_14; яблочный конфитюр инлайн в breakfast_7

```yaml
manualDecision:
  action:
  foodKey:
  grams:
  components:
  note:
```

#### 3.11. аквафаба (отвар нута)
- **sourceName:** аквафаба (отвар нута)
- **решение:** needs_new_fooditem
- **recipes:** breakfast_28 «ОМ-НОМ-НОМ!», lunch_28 «БОГАТЫРСКИЕ», recipe_day_11 «Майонез из белой фасоли» (Вариант Б) (3)
- **sourceLine:**
  - breakfast_28: `"аквафаба (отвар нута) - 45 мл;"`
  - lunch_28: `"аквафаба - 40 мл;"`
  - recipe_day_11: `"аквафаба - 60 мл;"`
- **sourceRecipe:** Да — recipe_day_10 «АКВА - ВИТА» (аквафаба из варёного нута)

```yaml
manualDecision:
  action:
  foodKey:
  grams:
  components:
  note:
```

---

## 4. Кандидаты на FoodItem

#### 4.1. мак
- **sourceName:** мак
- **решение:** needs_new_fooditem
- **recipes:** lunch_19 «ЕГИПЕТ РЯДОМ...», dinner_19 «НАСЛЕДИЕ МОНГОЛОВ» (2)
- **sourceLine:**
  - lunch_19: `"мак - 10 г."`
  - dinner_19: `"мак - 7 г."`
- **sourceRecipe:** Нет (используется как украшение)

```yaml
manualDecision:
  action:
  foodKey:
  grams:
  components:
  note:
```

#### 4.2. кокосовое молоко
- **sourceName:** кокосовое молоко
- **решение:** needs_new_fooditem
- **recipes:** dinner_25 «АРОМАТНЫЙ БРИЗ» (1)
- **sourceLine:** `"кокосовое молоко* - 20 мл;"`
- **sourceRecipe:** Нет (домашний вариант см. 3.6)

```yaml
manualDecision:
  action:
  foodKey:
  grams:
  components:
  note:
```

#### 4.3. растительное молоко (обобщение)
- **sourceName:** растительное молоко (обобщение)
- **решение:** needs_new_fooditem
- **recipes:** recipe_day_16 «ШАРЛАТАНКА» (1, явно) + варианты «вода или растительное молоко» в breakfast_1, breakfast_10, breakfast_13, breakfast_17, recipe_day_2 (см. 2.5)
- **sourceLine:** `"растительное молоко*** - 180 мл;"`
- **sourceRecipe:** Частично — пасты-основы recipe_day_20/21/22; отдельного рецепта молока нет

```yaml
manualDecision:
  action:
  foodKey:
  grams:
  components:
  note:
```

#### 4.4. семена конопли
- **sourceName:** семена конопли
- **решение:** needs_new_fooditem
- **recipes:** must_have_7 «ПОЛНЫЙ АМИНОКИСЛОТНЫЙ ПРОФИЛЬ» (1)
- **sourceLine:** `"семена конопли - для муки;"` (вес не указан; порция см. 5.8)
- **sourceRecipe:** Нет

```yaml
manualDecision:
  action:
  foodKey:
  grams:
  components:
  note:
```

#### 4.5. порошок из овсяных отрубей
- **sourceName:** порошок из овсяных отрубей
- **решение:** needs_new_fooditem
- **recipes:** must_have_8 «УМНАЯ НАСЫЩАЮЩАЯ МАТРИЦА» (1)
- **sourceLine:** `"порошок из овсяных отрубей - 15 г;"`
- **sourceRecipe:** Нет

```yaml
manualDecision:
  action:
  foodKey:
  grams:
  components:
  note:
```

#### 4.6. порошок из семян фенхеля / молотый фенхель
- **sourceName:** порошок из семян фенхеля / молотый фенхель
- **решение:** needs_new_fooditem
- **recipes:** compliment_17 «ПРОСЫПАЙСЯ!», breakfast_26 «НЕОЖИДАННОЕ ГОФРЕ» (2)
- **sourceLine:**
  - compliment_17: `"Порошок из семян фенхеля - 10 г;"`
  - breakfast_26: `"молотый фенхель***** - ¼ ч. л. (~0,5 г)."`
- **sourceRecipe:** Нет

```yaml
manualDecision:
  action:
  foodKey:
  grams:
  components:
  note:
```

#### 4.7. семена сельдерея (молотые)
- **sourceName:** семена сельдерея (молотые)
- **решение:** needs_new_fooditem
- **recipes:** compliment_20 «ЖИВАЯ ЗЕЛЕНЬ» (1)
- **sourceLine:** `"Семена сельдерея (молотые) - 15 г;"`
- **sourceRecipe:** Нет

```yaml
manualDecision:
  action:
  foodKey:
  grams:
  components:
  note:
```

#### 4.8. жёлтый горох колотый
- **sourceName:** жёлтый горох колотый (сухой)
- **решение:** needs_new_fooditem
- **recipes:** lunch_11 «ЖЁЛТЫЙ БАРХАТ» (1)
- **sourceLine:** `"жёлтый горох колотый (сухой)* - 80 г;"`
- **sourceRecipe:** Нет (главный ингредиент супа; в БД есть только «Горох зелёный сырой»)

```yaml
manualDecision:
  action:
  foodKey:
  grams:
  components:
  note:
```

#### 4.9. порошок сушёных шиитаке
- **sourceName:** порошок сушёных шиитаке
- **решение:** needs_new_fooditem
- **recipes:** compliment_18 «ТЁПЛЫЙ КОРЕНЬ» (1)
- **sourceLine:** `"Порошок сушеных шиитаке - 10 г;"`
- **sourceRecipe:** Нет (в БД есть «грибы шиитаке» — сырые)

```yaml
manualDecision:
  action:
  foodKey:
  grams:
  components:
  note:
```

#### 4.10. порошок чили / зелёный перец чили / острый перец чили
- **sourceName:** порошок чили / зелёный перец чили / острый перец чили
- **решение:** needs_new_fooditem
- **recipes:** breakfast_26 «НЕОЖИДАННОЕ ГОФРЕ», lunch_13 «ПРЯНАЯ ФИЕСТА», compliment_13 «ОГНЕННЫЙ ПОЦЕЛУЙ» (3)
- **sourceLine:**
  - breakfast_26: `"порошок чили (щепотка) - ~0,1 г;"`
  - lunch_13: `"зелёный перец чили (по желанию) - 6,5 г;"`
  - compliment_13: `"острый перец чили - 1 шт;"`
- **sourceRecipe:** Нет (в БД есть «перец острый (чили)»)

```yaml
manualDecision:
  action:
  foodKey:
  grams:
  components:
  note:
```

#### 4.11. ягоды (обобщение)
- **sourceName:** ягоды / ягоды свежие / замороженные ягоды
- **решение:** needs_new_fooditem
- **recipes:** breakfast_11 «ГРАТЕН АМАРА», breakfast_18 «ПИСЬМЕЦО ИЗ ДЕТСТВА», recipe_day_13 «ЯГОДКА ОПЯТЬ (классический)», recipe_day_14 «ЯГОДКА ОПЯТЬ (сырой)», recipe_day_19 «ЛЕТО В КОРЗИНКЕ», recipe_day_23 «ЯГОДЫ В ШОКЕ!» (6) + варианты «свежие или замороженные ягоды» в breakfast_3, breakfast_4, compliment_1 (см. 2.1)
- **sourceLine:**
  - breakfast_11: `"ягоды (черника/малина/ежевика)*** - 100 г."`
  - breakfast_18: `"ягоды (черника/малина) - 150 г;"`
  - recipe_day_13: `"ягоды - 250 г;"`
  - recipe_day_14: `"ягоды (свежие) - 150 г;"`
  - recipe_day_19: `"ягоды - 400 г;"`
  - recipe_day_23: `"замороженные ягоды - 150 г;"`
- **sourceRecipe:** Частично — рецепты джемов recipe_day_13, recipe_day_14 (используют сами ягоды)

```yaml
manualDecision:
  action:
  foodKey:
  grams:
  components:
  note:
```

---

## 5. Информационные рецепты без определённой порции

#### 5.1. чечевица (для проращивания)
- **sourceName:** Чечевица (зелёная, коричневая, красная)
- **решение:** needs_portion
- **recipes:** must_have_5 «Проростки» (1)
- **sourceLine:** `"Чечевица (зелёная, коричневая, красная) - для проращивания;"`
- **sourceRecipe:** Нет

```yaml
manualDecision:
  action:
  foodKey:
  grams:
  components:
  note:
```

#### 5.2. маш (для проращивания)
- **sourceName:** Маш (зелёный горошек)
- **решение:** needs_portion
- **recipes:** must_have_5 «Проростки» (1)
- **sourceLine:** `"Маш (зелёный горошек) - для проращивания;"`
- **sourceRecipe:** Нет

```yaml
manualDecision:
  action:
  foodKey:
  grams:
  components:
  note:
```

#### 5.3. нут (для проращивания)
- **sourceName:** Нут
- **решение:** needs_portion
- **recipes:** must_have_5 «Проростки» (1)
- **sourceLine:** `"Нут - для проращивания;"`
- **sourceRecipe:** Нет

```yaml
manualDecision:
  action:
  foodKey:
  grams:
  components:
  note:
```

#### 5.4. соя (для проращивания)
- **sourceName:** Соя (специальные сорта)
- **решение:** needs_portion
- **recipes:** must_have_5 «Проростки» (1)
- **sourceLine:** `"Соя (специальные сорта) - для проращивания."`
- **sourceRecipe:** Нет

```yaml
manualDecision:
  action:
  foodKey:
  grams:
  components:
  note:
```

#### 5.5. соевые бобы (для ферментации)
- **sourceName:** соевые бобы
- **решение:** needs_portion
- **recipes:** must_have_6 «Мисо-паста» (1)
- **sourceLine:** `"соевые бобы - для ферментации;"`
- **sourceRecipe:** Нет (рецепт отсылает к книге «Всё дело в еде!»)

```yaml
manualDecision:
  action:
  foodKey:
  grams:
  components:
  note:
```

#### 5.6. Aspergillus oryzae (кодзи)
- **sourceName:** Aspergillus oryzae (кодзи)
- **решение:** excluded
- **recipes:** must_have_6 «Мисо-паста» (1)
- **sourceLine:** `"Aspergillus oryzae (кодзи) - закваска;"`
- **sourceRecipe:** Нет (технологическая культура)

```yaml
manualDecision:
  action:
  foodKey:
  grams:
  components:
  note:
```

#### 5.7. рис или ячмень (для основы)
- **sourceName:** рис или ячмень
- **решение:** needs_portion
- **recipes:** must_have_6 «Мисо-паста» (1)
- **sourceLine:** `"рис или ячмень - для основы."`
- **sourceRecipe:** Нет (рецепт отсылает к книге «Всё дело в еде!»)

```yaml
manualDecision:
  action:
  foodKey:
  grams:
  components:
  note:
```

#### 5.8. семена конопли (для муки)
- **sourceName:** семена конопли
- **решение:** needs_portion
- **recipes:** must_have_7 «ПОЛНЫЙ АМИНОКИСЛОТНЫЙ ПРОФИЛЬ» (1)
- **sourceLine:** `"семена конопли - для муки;"`
- **sourceRecipe:** Нет (FoodItem см. 4.4)

```yaml
manualDecision:
  action:
  foodKey:
  grams:
  components:
  note:
```

#### 5.9. семена тыквы (для муки)
- **sourceName:** семена тыквы
- **решение:** needs_portion
- **recipes:** must_have_7 «ПОЛНЫЙ АМИНОКИСЛОТНЫЙ ПРОФИЛЬ» (1)
- **sourceLine:** `"семена тыквы - для муки;"`
- **sourceRecipe:** Нет

```yaml
manualDecision:
  action:
  foodKey:
  grams:
  components:
  note:
```

#### 5.10. кунжут (для муки)
- **sourceName:** кунжут
- **решение:** needs_portion
- **recipes:** must_have_7 «ПОЛНЫЙ АМИНОКИСЛОТНЫЙ ПРОФИЛЬ» (1)
- **sourceLine:** `"кунжут - для муки;"`
- **sourceRecipe:** Нет

```yaml
manualDecision:
  action:
  foodKey:
  grams:
  components:
  note:
```

#### 5.11. амарант (для муки)
- **sourceName:** амарант
- **решение:** needs_portion
- **recipes:** must_have_7 «ПОЛНЫЙ АМИНОКИСЛОТНЫЙ ПРОФИЛЬ» (1)
- **sourceLine:** `"амарант - для муки."`
- **sourceRecipe:** Нет

```yaml
manualDecision:
  action:
  foodKey:
  grams:
  components:
  note:
```