import {
  type AnnaRouteDecision,
  type AnnaTopicKey,
  type AnnaTopicMatch,
} from "./annaContextTypes";

const MAX_TOPICS = 3;

const TOPIC_PRIORITY: Record<AnnaTopicKey, number> = {
  digestion: 100,
  sleep: 90,
  water: 80,
  movement: 70,
  measurements: 65,
  wellbeing: 60,
  nutrition: 55,
  meals: 50,
  support: 45,
  book: 35,
  navigation: 30,
};

const TOPIC_PATTERNS: Record<AnnaTopicKey, RegExp[]> = {
  digestion: [
    /живот|животик/i,
    /болит.*живот|живот.*болит|живот.*крутит|крутит.*живот/i,
    /вздут|раздул|пучит|газы|метеоризм|бурлит|урчит/i,
    /тяжест|изжог|тошнит|тошно|рвот|отрыжк/i,
    /стул|запор|понос|диаре|консистенц|частот.*стул|туалет/i,
    /пищевар|жкт|кишечник|кишки|микробиот|дисбактериоз|брюх/i,
    /бристол|шкал.*стул|тип.*стул/i,
    /газообразовани|пукан|воняет.*живот/i,
    /тяжесть.*после.*еда|еда.*тяжесть/i,
  ],

  sleep: [
    /сон|спал|спала|сплю|уснул|уснула|заснул|заснула|выспал/i,
    /проснул|проснулась|недосып|бессонниц|плохо.*спал|плохо.*спала/i,
    /ночью|ночь|пробуждени|просыпал|просыпалась|рано.*проснул/i,
    /трудно.*уснул|трудно.*заснул|долго.*уснул|долго.*заснул/i,
    /кошмар|кошмары|ночн.*страх|ночн.*ужас/i,
    /режим.*сон|график.*сон|отход.*сон|подъём.*утро/i,
  ],

  water: [
    /вод[ауеы]|попи[лт]|пью|пить|жажд|гидратац/i,
    /стакан.*вод|литр.*вод|кружк.*вод|бутылк.*вод/i,
    /сух.*рот|сух.*во.*рту|хоч.*пить|сильн.*жажд/i,
    /моч|туалет.*по.*маленьк|цвет.*моч|част.*мочеиспускани/i,
    /отёк|отёк|отека|отеки|задержк.*жидкост/i,
  ],

  movement: [
    /движени|активност|шаг[аиов]|прогулк|тренировк/i,
    /зарядк|спорт|бегал|бегала|ходил|ходила|плавани|велосипед/i,
    /фитнес|качалк|тренажёр|тренажер|растяжк|йог/i,
    /устал.*сидеть|мало.*движени|сидяч.*образ.*жизн/i,
    /разминк|прогулять|пройтись|движ.*день/i,
  ],

  measurements: [
    /замер|вес[а]?|давлен|пульс|объем|объём|талия|бёдра|бедра/i,
    /похуд|набор.*вес|вес.*стоит|плато|скинул|скинула|потерял.*вес/i,
    /весы|взвесил|взвесила|контроль.*вес|мониторинг/i,
    /давлен.*верхн|давлен.*нижн|систолич|диастолич/i,
  ],

  wellbeing: [
    /устал|нет сил|мало сил|слабост|энерги|самочувств|тонус/i,
    /выжат[а-я]* лимон|разбит[а-я]*|не хочу ничего|апати|вял/i,
    /настроени|эмоциональн|тревож|тревог|стресс|подавлен|депресс/i,
    /голов.*бол|мигрен|головокруж|шум.*уш/i,
    /тяжесть.*день|трудно.*вставать|тяжело.*проснуться/i,
  ],

  nutrition: [
    /белок|протеин|b\s*12|витамин|дефицит|желез|цинк|кальци/i,
    /омега|магни|йод|селен|клетчатк|нутриент|нутрициолог/i,
    /растительн|веган|вегетариан|wfpb|цельн.*растит/i,
    /калори|кбжу|макрос|углевод|жир|сахар|сладк/i,
    /еда.*полезн|полезн.*питани|здоров.*питани|рацион/i,
  ],

  meals: [
    /что.*ел|что.*ела|что.*готовил|что.*готовила|что.*приготовил|что.*приготовила/i,
    /рацион|блюд|еда|завтрак|обед|ужин|перекус|полдник/i,
    /вчера.*ел|ел.*вчера|приготовил|приготовила|сегодня.*ел|сегодня.*ела/i,
    /меню|план.*питани|что.*приготовить|что.*сегодня.*есть/i,
    /рецепт|блюд|кушан|кулинар|готовк|приготов|готовить|готовил|готовиш|стряп|ингредиент|состав|порци|свари|запек|испеч|пожар|туши|завтрак|обед|ужин|перекус/i,
  ],

  support: [
    /срыв|сорвал|не получаетс|не выходит|не могу|не справляюсь/i,
    /боюсь|страшно|мотивац|нет времени|нет денег|устал.*бороть/i,
    /семь[яи]|бюджет|кредит|долг|финанс.*трудн|денег.*нет/i,
    /одиночеств|одиноко|никто.*не понимает|нет.*поддержк/i,
    /стыд|вина|самооценк|неудачник|всё.*бесполезн/i,
  ],

  book: [
    /книг|тетрад|страниц|1280|28\s*дн|книга.*рецепт|рецепт.*книг/i,
    /день.*программ|программ.*питани|план.*28|курс.*28/i,
    /что.*сегодня.*готовить|рецепт.*сегодня|меню.*день/i,
  ],

  navigation: [
    /куда.*нажат|где.*найт|какой.*раздел|как.*открыть|как.*включить/i,
    /модул|экран|кнопк|вкладк|навигац|меню|интерфейс/i,
    /не понимаю.*приложени|не могу.*найт|запутал|запуталась/i,
  ],
};

const RED_FLAG_PATTERNS: RegExp[] = [
  /сильн.*боль|резк.*боль|остр.*боль/i,
  /кров[ьи]|кровотечени/i,
  /высок.*температур|лихорадк/i,
  /неукротим.*рвот|постоянн.*рвот/i,
  /обморок|потер[яи].*сознани/i,
  /резк.*ухудшени|очень.*плох/i,
];

const TOPIC_KNOWLEDGE: Partial<Record<AnnaTopicKey, string[]>> = {
  digestion: ["digestion_and_fiber.md"],
  sleep: ["sleep_and_appetite.md"],
  water: ["hydration.md"],
  nutrition: ["general_nutrition.md"],
  support: ["psychology_support.md"],
  book: ["book_structure.md"],
  navigation: ["app_modules_map.md"],
};

const TOPIC_MODULES: Partial<Record<AnnaTopicKey, string[]>> = {
  digestion: ["digestion.md"],
  sleep: ["sleep.md"],
  water: ["water.md"],
  measurements: ["measurements.md"],
};

function normalizeMessage(message: string): string {
  return message
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasPatternMatch(message: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(message));
}

function uniqueFiles(files: string[]): string[] {
  return [...new Set(files)];
}

const WFPB_COOKING_PATTERN =
  /приготов|готов(ить|лю|ишь|им|ите|ят|ил|ила|или)?|вар(ить|ю|ишь|им|ите|ят|ил|ила|или)?|туш(ить|у|ишь|им|ите|ат|ил|ила|или)?|запек(ать|у|аешь|аем|аете|ают|ал|ала|али)?|на\s+пару/i;

const WFPB_OIL_PATTERN =
  /без\s+масл|масл(о|а|е|ом|у)/i;

const WFPB_LEGUMES_PATTERN =
  /чечевиц|фасол|нут|горох|маш|со[ея]|тофу|темпе|бобов/i;

function getWfpbCookingKnowledgeFiles(message: string): string[] | null {
  if (
    !WFPB_COOKING_PATTERN.test(message) ||
    !WFPB_OIL_PATTERN.test(message)
  ) {
    return null;
  }

  return WFPB_LEGUMES_PATTERN.test(message)
    ? ["wfpb/wfpb_legumes.md", "wfpb/wfpb_cooking.md"]
    : ["wfpb/wfpb_cooking.md"];
}

export function routeAnnaContext(message: string): AnnaRouteDecision {
  const normalizedMessage = normalizeMessage(message);
  const matches: AnnaTopicMatch[] = [];

  for (const topic of Object.keys(TOPIC_PATTERNS) as AnnaTopicKey[]) {
    if (hasPatternMatch(normalizedMessage, TOPIC_PATTERNS[topic])) {
      matches.push({
        key: topic,
        priority: TOPIC_PRIORITY[topic],
      });
    }
  }

  const topics = matches
    .sort((left, right) => right.priority - left.priority)
    .slice(0, MAX_TOPICS)
    .map((match) => match.key);

  const knowledgeFiles =
    getWfpbCookingKnowledgeFiles(normalizedMessage) ??
    uniqueFiles(topics.flatMap((topic) => TOPIC_KNOWLEDGE[topic] || []));

  const moduleFiles = uniqueFiles(
    topics.flatMap((topic) => TOPIC_MODULES[topic] || []),
  );

  const needsPreviousDayMeals =
    topics.includes("digestion") ||
    topics.includes("meals") ||
    (topics.includes("nutrition") &&
      /\b(?:я|мне|мой|моя|мои|ел|ела|готовил|готовила)\b/i.test(
        normalizedMessage,
      ));

  const needsProfile =
    topics.includes("digestion") ||
    topics.includes("nutrition") ||
    topics.includes("measurements") ||
    topics.includes("wellbeing") ||
    topics.includes("support");

  const needsDiary =
    topics.includes("wellbeing") ||
    topics.includes("support") ||
    /настроени|эмоц|как.*прош[её]л.*день|итог.*дня|рефлекс|что.*со.*мной|почему.*я/i.test(normalizedMessage);

  return {
    topics,
    needsMedicalSafety: hasPatternMatch(
      normalizedMessage,
      RED_FLAG_PATTERNS,
    ),
    needsPreviousDayMeals,
    needsProfile,
    needsDiary,
    knowledgeFiles,
    moduleFiles,
  };
}
