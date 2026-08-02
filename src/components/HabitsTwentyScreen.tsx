import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, Info, Sparkles, Award, Check } from "lucide-react";
import { HabitsState } from "../types";
import { SystemKeysStore, SYSTEM_KEY_DEFS, SystemKeyProgress } from "../services/SystemKeysStore";
import BottomBar from "./BottomBar";
import { useAppStore } from "../store/useAppStore";

interface HabitsTwentyScreenProps {
  dayNotes: Record<number, { text: string; time: string }[]>;
  setDayNotes?: React.Dispatch<React.SetStateAction<Record<number, { text: string; time: string }[]>>>;
  currentDayIndex: number;
  onBack?: () => void;
  onSaveProgress?: (updatedHabits: any) => void;
  initialHabits?: HabitsState;
  recordClickExternally?: (pts: number) => void;
  screen?: string;
  onOpenCalendar?: () => void;
  savedDishes?: any[];
  water?: number;
  setWater?: (val: number) => void;
  onNavigateHome?: () => void;
  onNavigateDiary?: () => void;
  onNavigateProgress?: () => void;
}

interface SystemKey {
  id: string;
  num: number;
  name: string;
  emoji: string;
  category: "product" | "action";
  optimum: number;
  maxCircles: number;
  hasSuperlevel?: boolean;
  subtext: string;
  whatsIncluded: string;
  portionSize: string;
  optimumText: string;
  superlevelText?: string;
  whyImportant: string;
  excessLimitText?: string;
  specialNote?: string;
}

const SYSTEM_KEYS: SystemKey[] = [
  {
    id: "legumes",
    num: 1,
    name: "Бобовые",
    emoji: "🫘",
    category: "product",
    optimum: 2,
    maxCircles: 2,
    hasSuperlevel: true,
    subtext: "чечевица, нут, фасоль, маш, горох, соевые бобы (эдамаме, тофу, темпе)",
    whatsIncluded: "чечевица (все виды), нут, фасоль (все виды), маш, горох (колотый, цельный, свежий), соевые бобы (эдамаме, тофу, темпе — тоже считаются).",
    portionSize: "1 кнопка = 50–70 г сухих бобовых. При варке вес увеличивается в ~2,5 раза.",
    optimumText: "100–140 г сухих бобовых (2 кнопки).",
    superlevelText: "150–210 г сухих (3 кнопки) — для спортсменов, при высоких физических нагрузках или в период восстановления после травм, операций и т.д.",
    whyImportant: "главный источник растительного белка, железа, цинка и клетчатки. Снижают холестерин, сахар и риск рака кишечника."
  },
  {
    id: "whole_grains",
    num: 2,
    name: "Цельные злаки",
    emoji: "🌾",
    category: "product",
    optimum: 2,
    maxCircles: 2,
    hasSuperlevel: false,
    subtext: "овёс (цельный), зелёная гречка, киноа, бурый рис, сорго, пшено",
    whatsIncluded: "овёс (цельный, если хлопья, то не хлопья быстрого приготовления), зелёная гречка, киноа, бурый рис, чёрный рис, красный рис, сорго, пшено.",
    portionSize: "1 кнопка = 40–60 г сухой крупы или 1 ломтик хлеба из муки из цельного зерна (~30 г). Вес после варки ≈ 100–150 г.",
    optimumText: "80–120 г сухих злаков (2 кнопки).",
    whyImportant: "дают энергию, витамины группы B, магний, селен. В отличие от рафинированных злаков, сохраняют клетчатку и не вызывают скачков сахара."
  },
  {
    id: "vegetables",
    num: 3,
    name: "Овощи (кроме листовых)",
    emoji: "🥕",
    category: "product",
    optimum: 4,
    maxCircles: 4,
    hasSuperlevel: true,
    subtext: "кабачок, томаты, огурцы, тыква, болгарский перец, баклажаны",
    whatsIncluded: "брокколи, цветная капуста, кабачки, тыква, морковь, свёкла, перец, помидоры, огурцы, баклажаны, стручковая фасоль, кукуруза, картофель, батат, редис, репа, сельдерей корневой и т.д. Сюда входят также все виды капусты: белокочанная, краснокочанная, пекинская, савойская, брюссельская, кольраби (кроме листовой капусты кейл, которая относится к листовым).",
    portionSize: "1 кнопка = 80–120 г (≈ 1 средний помидор или полстакана нарезанных). Учитывается сырой или приготовленный вес.",
    optimumText: "320–480 г (4 кнопки).",
    superlevelText: "420–540 г (5 кнопок) — при высокой активности.",
    whyImportant: "антиоксиданты, витамины, клетчатка, калий. Снижают давление, защищают сердце и глаза. Ешьте разноцветные!",
    excessLimitText: "приветствуется, особенно при высокой физической активности. Овощи низкокалорийны, богаты клетчаткой и водой, поэтому даже 600–800 г в день безопасны и полезны."
  },
  {
    id: "leafy_greens",
    num: 4,
    name: "Листовые овощи и зелень",
    emoji: "🌿",
    category: "product",
    optimum: 5,
    maxCircles: 5,
    hasSuperlevel: true,
    subtext: "шпинат, руккола, кейл, петрушка, укроп, микрозелень",
    whatsIncluded: "шпинат, руккола, салат (все виды), капуста кейл, мангольд, петрушка, укроп, кинза, базилик, мята, зелёный лук, сельдерей листовой, микрозелень.",
    portionSize: "1 кнопка = 40–60 г свежих листьев (≈ большая горсть). При тушении вес уменьшается, но питательная ценность сохраняется.",
    optimumText: "200–300 г (5 кнопок = 5 горстей).",
    superlevelText: "240–360 г (6 кнопок) — рекордная доза витамина K и фолата.",
    whyImportant: "рекордное содержание витамина K, фолата, лютеина. Защищают мозг, кости и зрение. Каждому нужна хотя бы горсть в день.",
    excessLimitText: "приветствуется. Увеличение порции до 400–500 г в день безопасно и даёт дополнительную защиту от хронических заболеваний благодаря высокому содержанию антиоксидантов."
  },
  {
    id: "nuts",
    num: 5,
    name: "Орехи",
    emoji: "🌰",
    category: "product",
    optimum: 1,
    maxCircles: 1,
    hasSuperlevel: false,
    subtext: "грецкие, кешью, миндаль, фундук, фисташки",
    whatsIncluded: "грецкие, миндаль, фундук, кешью, фисташки, бразильский орех, кедровые, макадамия, пекан.",
    portionSize: "1 кнопка = 15–30 г. Максимум орехов в день – 60 г.",
    optimumText: "15–30 г (1 кнопка).",
    whyImportant: "полезные жиры, белок, антиоксиданты, витамин E. Снижают холестерин, защищают сосуды сердца и улучшают работу мозга."
  },
  {
    id: "seeds",
    num: 6,
    name: "Семена",
    emoji: "🌻",
    category: "product",
    optimum: 1,
    maxCircles: 1,
    hasSuperlevel: false,
    subtext: "семена подсолнечника, тыквы, кунжут, конопляные, чиа",
    whatsIncluded: "семена подсолнечника, тыквы, кунжут, чиа, семена конопли, мак.",
    portionSize: "1 кнопка = 15 г (≈ 1 столовая ложка).",
    optimumText: "15 г (1 кнопка).",
    whyImportant: "богаты магнием, цинком, железом и полезными жирами. Поддерживают гормональное здоровье и красоту кожи."
  },
  {
    id: "ground_flax",
    num: 7,
    name: "Молотый лён",
    emoji: "🤎",
    category: "product",
    optimum: 2,
    maxCircles: 2,
    hasSuperlevel: false,
    subtext: "молотые семена льна",
    whatsIncluded: "свежемолотые семена коричневого и золотистого льна. Цельные семена не перевариваются, поэтому важно использовать именно молотые.",
    portionSize: "1 кнопка = 8 г (≈ 1 столовая ложка молотого льна).",
    optimumText: "16 г (2 кнопки).",
    whyImportant: "лучший растительный источник омега-3 (ALA) и лигнанов (сильнейших антиоксидантов, защищающих от гормонозависимого рака)."
  },
  {
    id: "spices",
    num: 8,
    name: "Травы и специи",
    emoji: "🌶️",
    category: "product",
    optimum: 3,
    maxCircles: 3,
    hasSuperlevel: false,
    subtext: "куркума, имбирь, корица, чёрный перец, сушеные травы",
    whatsIncluded: "куркума, чёрный перец, имбирь, орегано, розмарин, тимьян, корица, кайенский перец, паприка, кардамон, гвоздика, мускатный орех и т.д.",
    portionSize: "1 кнопка = 1.5–2 г сушеных трав или специй (≈ 1/4 чайной ложки). Свежая зелень в больших количествах относится к категории листовой зелени.",
    optimumText: "4.5–6 г сухих специй в день (3 кнопки).",
    whyImportant: "специи и травы обладают высочайшим антиоксидантным потенциалом (индекс ORAC). Они стимулируют секрецию ферментов, улучшают пищеварение, снижают газообразование, борются со скрытым системным воспалением."
  },
  {
    id: "fruits",
    num: 9,
    name: "Фрукты",
    emoji: "🍎",
    category: "product",
    optimum: 1,
    maxCircles: 1,
    hasSuperlevel: false,
    subtext: "яблоки, груши, апельсины, бананы, персики, абрикосы",
    whatsIncluded: "яблоки, груши, апельсины, мандарины, грейпфруты, бананы, персики, нектарины, абрикосы, сливы, хурма, гранат, ананас, манго, дыня, арбуз, инжир.",
    portionSize: "1 кнопка = 120–150 г (≈ 1 средний фрукт или стакан нарезанных).",
    optimumText: "120–150 г (1 кнопка).",
    whyImportant: "ощелачивают плазму, поставляют клеткам легкоусвояемые структурированные моносахариды и биофлавоноиды молодости."
  },
  {
    id: "berries",
    num: 10,
    name: "Ягоды",
    emoji: "🍇",
    category: "product",
    optimum: 1,
    maxCircles: 1,
    hasSuperlevel: true,
    subtext: "черника, голубика, малина, клубника, ежевика, вишня, клюква",
    whatsIncluded: "черника, голубика, жимолость, малина, клубника, ежевика, смородина (чёрная, красная), вишня, черешня, клюква, брусника, облепиха.",
    portionSize: "1 кнопка = 80 г (≈ полстакана свежих или замороженных ягод).",
    optimumText: "80 г (1 кнопка).",
    superlevelText: "160 г (2 кнопки) — максимальная антиоксидантная защита.",
    whyImportant: "защищают почечные клубочки и сосудистую сеть глаз от оксидативной деструкции, активируя долголетие генов SIRT1."
  },
  {
    id: "sprouts",
    num: 11,
    name: "Проростки",
    emoji: "🌱",
    category: "product",
    optimum: 1,
    maxCircles: 1,
    hasSuperlevel: true,
    subtext: "люцерна, брокколи, клевер, горчица, подсолнечник, чечевица",
    whatsIncluded: "proroщенные бобовые (маш, нут, чечевица), злаки (зелёная гречка, пшеница, овёс), семена (люцерна, брокколи, клевер, горчица, подсолнечник).",
    portionSize: "1 кнопка = 30 г проростков (≈ 1-2 столовые ложки). Можно добавлять в салаты, роллы, смузи.",
    optimumText: "30 г (1 кнопка).",
    superlevelText: "60 г (2 кнопки) — максимальная концентрация ферментов и антиоксидантов.",
    whyImportant: "запускают мощную фазу II печеночной конъюгации через сульфорафановые индукторы, убирая органический застой. Повышают доступность микроэлементов."
  },
  {
    id: "must_have",
    num: 12,
    name: "MUST HAVE (ферментированные продукты)",
    emoji: "🧄",
    category: "product",
    optimum: 1,
    maxCircles: 1,
    hasSuperlevel: false,
    subtext: "квашеная капуста, кимчи, мисо-паста, соленые огурцы (без уксуса), темпе",
    whatsIncluded: "натурально ферментированные продукты без добавления уксуса и сахара: квашеная капуста, кимчи, квашеные овощи, темпе, мисо-паста, комбуча и водный кефир домашнего приготовления.",
    portionSize: "1 кнопка = 50 г ферментированных продуктов (≈ 2-3 столовые ложки).",
    optimumText: "50 г (1 кнопка).",
    whyImportant: "стабилизирует защитную микробиологическую биопленку в ЖКТ и повышает абсорбцию аминокислот высокой чистоты. Обеспечивает организм ценными пробиотиками."
  },
  {
    id: "healthy_drinks",
    num: 13,
    name: "Полезные напитки",
    emoji: "🍵",
    category: "product",
    optimum: 3,
    maxCircles: 3,
    hasSuperlevel: false,
    subtext: "тёплая вода, травяные настои, цикорий, отвар шиповника",
    whatsIncluded: "чистая питьевая вода (особенно тёплая), травяные чаи (ромашка, мята, иван-чай, липа), цикорий, настои ягод (шиповник).",
    portionSize: "1 кнопка = 200–250 мл (1 стакан). Чай и кофе с кофеином в эту категорию не входят.",
    optimumText: "600–750 мл полезных напитков в день (3 кнопки).",
    whyImportant: "увеличивает объем циркулирующей плазмы, тонизирует блуждающий нерв (Вагус), ускоряет лимфоток и вымывает накопленный натрий."
  },
  {
    id: "compliment",
    num: 14,
    name: "Комплимент дня",
    emoji: "💬",
    category: "action",
    optimum: 1,
    maxCircles: 1,
    subtext: "одно блюдо из категории «Комплимент дня» в вашем меню",
    whatsIncluded: "блюда из категории «Комплимент дня» в вашем 28-дневном меню. Это могут быть полезные хлебцы, соусы, заправки, лёгкие пашеты, хумус или другие приятные добавки к основному рациону.",
    portionSize: "целое блюдо или порция, рекомендованная в рецепте.",
    optimumText: "1 блюдо-комплимент на выбор в день (из любой недели курса).",
    whyImportant: "эти блюда приносят радость и разнообразие, позволяют побаловать себя без срывов, содержат максимум нутриентов (клетчатка, антиоксиданты, полезные жиры) и помогают не заскучать на цельном растительном рационе. Их удобно готовить заранее, чтобы всегда под рукой был здоровый перекус."
  },
  {
    id: "recipe",
    num: 15,
    name: "Рецепт дня",
    emoji: "🍳",
    category: "action",
    optimum: 1,
    maxCircles: 1,
    subtext: "один новый рецепт из раздела «Рецепт дня» в вашем меню",
    whatsIncluded: "один новый рецепт из раздела «Рецепт дня» в вашем 28-дневном меню. Это может быть полезный десерт (шарлотка, брауни, печенье, пудинг), домашний сыр, хлеб, лепёшки, хумус, аквафаба, тофу, пицца и другие блюда.",
    portionSize: "ориентируйтесь на порцию, указанную в рецепте. Достаточно приготовить и съесть это блюдо в текущий день (остатки можно хранить в холодильнике или морозилке).",
    optimumText: "1 новый рецепт в день (одно блюдо на выбор из категории блюд «Рецепт дня» (из любого дня курса)).",
    whyImportant: "рецепт дня расширяет кулинарный кругозор, помогает освоить новые техники готовки без масла, соли и сахара, а также вносит разнообразие в рацион. Многие из этих блюд можно приготовить заранее и использовать как перекус, добавку к основным блюдам или как полноценный десерт без «пустых» калорий."
  },
  {
    id: "soaking",
    num: 16,
    name: "Замачивание ингредиентов",
    emoji: "💧",
    category: "action",
    optimum: 1,
    maxCircles: 1,
    subtext: "бобовые, цельные злаки, семена и орехи перед готовкой",
    whatsIncluded: "процесс замачивания бобовых, цельных злаков, семян и орехов в воде перед готовкой. В отличие от обычной кулинарии, где замачивание просто размягчает продукты, в цельном растительном рационе это важный этап «пробуждения» еды, который запускает природные механизмы, делающие продукт более полезным и безопасным.",
    portionSize: "Правила замачивания: Бобовые: замачивайте на 8–12 часов в холодной воде с добавлением лимонного сока или яблочного уксуса (1 ст. ложка на 1 литр воды). Кислая среда помогает разрушить фитаты. Перед варкой воду слейте и промойте бобы. Злаки и псевдозлаки: замачивайте на 5–8 часов. Кислота (лимонный сок) уличшит усвоение минералов. Орехи: замачивайте на 4–8 часов в чистой воде. Кислота не нужна и может навредить. Семена: семена льна и чиа замачивайте для получения геля. Масличные семена (подсолнечник, тыква) — 4–6 часов с лимоном. Достаточно покрыть продукт водой с запасом, так как при замачивании он увеличивается в объёме.",
    optimumText: "обязательно при использовании бобовых, цельных злаков, семян и орехов.",
    whyImportant: "замачивание нейтрализует «защитные» вещества растений (фитаты, лектины), которые мешают усвоению железа, цинка и магния, а также могут раздражать желудочно-кишечный тракт. В результате вы получаете максимум пользы от еды: белок и минералы усваиваются лучше, а риск вздутия и дискомфорта значительно снижается."
  },
  {
    id: "no_oil_cook",
    num: 17,
    name: "Готовка без масла",
    emoji: "🍲",
    category: "action",
    optimum: 1,
    maxCircles: 1,
    subtext: "приготовление горячих блюд совершенно без добавления масел",
    whatsIncluded: "приготовление любых блюд без добавления растительных масел (оливкового, подсолнечного, кокосового, авокадо и др.). Жарка, пассеровка, тушение осуществляются на воде, овощном бульоне, соке овощей или просто на сухой сковороде с антипригарным покрытием. Масло не используется ни для жарки, ни для заправки готовых блюд.",
    portionSize: "все горячие блюда должны быть приготовлены без масла. Это обязательное условие, а не опция.",
    optimumText: "все горячие блюда приготовлены абсолютно без добавления масла.",
    whyImportant: "масла — это рафинированные, изолированные жиры, лишённые клетчатки, фитонутриентов и большинства витаминов. Они вызывают постпрандиальное воспаление (даже «полезные» оливковое и авокадо); повышают нагрузку на печень и жёлчный пузырь; нарушают чувствительность вкусовых рецепторов, делая еду «пресной» без масла; при нагреве окисляются, образуя свободные радикалы и альдегиды (токсичные соединения). В цельном растительном рационе все необходимые жиры организм получает из цельных продуктов: орехов, семян, авокадо, оливок. Они поставляют жиры в естественной волокнистой матрице, что обеспечивает постепенное усвоение и отсутствие окислительного стресса."
  },
  {
    id: "no_salt_cook",
    num: 18,
    name: "Готовка без соли",
    emoji: "🍃",
    category: "action",
    optimum: 1,
    maxCircles: 1,
    subtext: "приготовление и употребление блюд абсолютно без добавления соли",
    whatsIncluded: "приготовление любых блюд без добавления поваренной соли (хлорида натрия), морской, гималайской или любой другой соли. Соль не используется ни в процессе готовки, ни при подаче. Вкус блюд формируется за счёт специй, трав, кислоты (лимон, яблочный уксус), овощного бульона, водорослей и ферментированных продуктов.",
    portionSize: "все блюда должны быть приготовлены без соли. Это обязательное правило, а не рекомендация.",
    optimumText: "все блюда приготовлены полностью без добавления соли.",
    whyImportant: "соль (NaCl) — в природе натрий и хлор встречаются в цельных растениях в ионной форме, в комплексе с калием, магнием, кальцием и органическими кислотами, что обеспечивает их сбалансированное усвоение. При введении изолированного NaCl повышается артериальное давление и нагрузка на почки; возникает задержка жидкости и отёки; нарушается чувствительность вкусовых рецепторов — вы перестаёте чувствовать истинный вкус овощей, круп и бобовых; соль стимулирует аппетит, вызывая переедание без реального голода. Через 7–10 дней без соли вкусовые сосочки обновляются, и вы начинаете различать естественную сладость моркови, кислинку помидора, глубину вкуса бобовых — без «усилителя»."
  },
  {
    id: "no_caffeine_day",
    num: 19,
    name: "День без кофеина",
    emoji: "☕",
    category: "action",
    optimum: 1,
    maxCircles: 1,
    subtext: "исключение всех кофеин-содержащих напитков и продуктов",
    whatsIncluded: "полное исключение из рациона всех напитков и продуктов, содержащих кофеин. Под запрет попадают: кофе (включая декофеинизированный), чёрный и зелёный чай, мате, матча, какао в больших количествах, энергетические напитки, а также продукты с добавлением кофеина (некоторые десерты, шоколад и т.д.).",
    portionSize: "чем заменить кофеин в этот день: травяные чаи (ромашка, мята, мелисса, липа, шиповник, иван-чай, лимонная вербена); цикорий (натуральный заменитель кофе без кофеина, с пребиотическими свойствами); тёплая вода с лимоном; настои из сушёных ягод и фруктов (яблоко, груша, шиповник, рябина).",
    optimumText: "полное отсутствие источников кофеина на протяжении дня.",
    whyImportant: "кофеин — это психоактивный стимулятор, который повышает уровень кортизола («гормона стресса») даже в состоянии покоя; нарушает естественные циркадные ритмы и качество сна (даже если вы засыпаете, глубокая фаза сна укорачивается); создаёт зависимость: регулярное употребление кофеина приводит к тому, что без него вы чувствуете вялость, головную боль и раздражительность; раздражает слизистую желудочно-кишечного тракта, что особенно важно при чувствительном ЖКТ или гастрите; может усиливать тревожность и провоцировать сердцебиение. Совет: если вы привыкли пить кофе или чай каждый день, при отказе в течение первой недели возможна головная боль, тошнота, усталость — это нормальная реакция отмены. Пейте больше чистой воды и травяных настоев, ложитесь спать чуть раньше. Через 2–3 таких дня зависимость заметно снизится."
  },
  {
    id: "no_sugar_day",
    num: 20,
    name: "День без сахара и подсластителей",
    emoji: "🚫",
    category: "action",
    optimum: 1,
    maxCircles: 1,
    subtext: "отказ от любых подсластителей, сахара, сиропов и меда",
    whatsIncluded: "отказаться от любых подсластителей: белый и коричневый сахар, сиропы (агавы, кленовый, топинамбура), мёд, стевия, эритрит, сукралоза, ксилит, сорбит. Избегать продуктов с их содержанием.",
    portionSize: "полный отказ от чистого или добавленного сахара, а также любых сахарозаменителей.",
    optimumText: "отсутствие добавленного сахара и сахарозаменителей во всех блюдах.",
    whyImportant: "даже натуральные заменители поддерживают сладкий вкус и тягу. Отсутствие сахара, сахарозаменителей перезагружает рецепторы, снижает воспаление и помогает уменьшить общее потребление сладкого."
  }
];

const PRODUCT_KEYS_LIST = [
  "legumes", "whole_grains", "vegetables", "leafy_greens", "nuts", "seeds",
  "ground_flax", "spices", "fruits", "berries", "sprouts", "must_have", "healthy_drinks"
];

const BUBBLES_TEMPLATE = [
  { id: 1, size: 4, left: "15%", duration: 4.5, delay: 0 },
  { id: 2, size: 6, left: "45%", duration: 5.8, delay: 1.2 },
  { id: 3, size: 3, left: "75%", duration: 3.5, delay: 0.5 },
  { id: 4, size: 5, left: "28%", duration: 5.0, delay: 2.0 },
  { id: 5, size: 2, left: "60%", duration: 6.2, delay: 0.8 },
  { id: 6, size: 4, left: "85%", duration: 4.8, delay: 1.5 },
  { id: 7, size: 5, left: "18%", duration: 5.4, delay: 2.8 },
  { id: 8, size: 3, left: "68%", duration: 4.2, delay: 3.3 }
];

export default function HabitsTwentyScreen({
  dayNotes,
  currentDayIndex,
  initialHabits,
  onBack: propsOnBack,
  onSaveProgress: propsOnSaveProgress,
  screen: propsScreen,
  onOpenCalendar: propsOnOpenCalendar,
  savedDishes: propsSavedDishes,
  water: propsWater,
  setWater: propsSetWater,
  onNavigateHome: propsOnNavigateHome,
  onNavigateDiary: propsOnNavigateDiary,
  onNavigateProgress: propsOnNavigateProgress,
  recordClickExternally: propsRecordClick,
}: HabitsTwentyScreenProps) {
  const setScreen = useAppStore((s) => s.setScreen);
  const appScreen = useAppStore((s) => s.screen);
  const onBack = propsOnBack || (() => setScreen("my-day"));
  const screen = propsScreen || appScreen;
  const onOpenCalendar = propsOnOpenCalendar || (() => {});
  const onSaveProgress = propsOnSaveProgress || (() => {});
  const onNavigateHome = propsOnNavigateHome || (() => setScreen("my-day"));
  const onNavigateDiary = propsOnNavigateDiary || (() => setScreen("what-i-eat"));
  const onNavigateProgress = propsOnNavigateProgress || (() => setScreen("habits-twenty"));
  const savedDishes = propsSavedDishes || [];
  const water = propsWater || 0;
  const setWater = propsSetWater || (() => {});
  const [activeTab, setActiveTab] = useState<"products" | "actions">("products");
  
  // Bridge recipe states from useAppStore into SystemKeysStore
  const recipeStates = useAppStore((s) => s.recipeStates);
  SystemKeysStore.syncRecipeStates(recipeStates);

  // Track detailed information sheet target
  const [selectedKey, setSelectedKey] = useState<SystemKeyProgress | null>(null);

  // Local state trigger to recalculate when users make clicks or add weights
  const [updateTrigger, setUpdateTrigger] = useState(0);

  // Temporary container state for manual weight entry
  const [tempManualGrams, setTempManualGrams] = useState<number | "">("");

  // Live keys compilation
  const { keys, closedCount, progressPercentage, hasWaterAuto } = useMemo(() => {
    return SystemKeysStore.calculateKeysForDay(currentDayIndex, savedDishes, water);
  }, [currentDayIndex, savedDishes, water, updateTrigger, recipeStates]);

  // Set initial text value when modal shifts
  useEffect(() => {
    if (selectedKey) {
      setTempManualGrams(selectedKey.manualGrams || "");
    }
  }, [selectedKey]);

  // Helper trigger for click metrics
  const triggerClick = (pts: number = 1) => {
    if (recordClickExternally) {
      recordClickExternally(pts);
    }
  };

  const recordClickExternally = (pts: number) => {
    // Falls back inside parent dispatching if passed
  };

  // Safe portion changes: maps chosen circle limit into a precise manual offset weight
  const handleProductPortionClick = (
    keyId: string, 
    circleIdx: number, 
    currentPortionsFilled: number,
    portionGrams: number,
    autoGrams: number
  ) => {
    triggerClick(1);
    const clickedPortionCount = circleIdx + 1;
    let nextPortionCount = clickedPortionCount;

    // Toggle down by 1 if they click the exact current portion limit
    if (currentPortionsFilled === clickedPortionCount) {
      nextPortionCount = circleIdx;
    }

    const totalNeededGrams = nextPortionCount * portionGrams;
    const manualResult = Math.max(0, totalNeededGrams - autoGrams);

    if (keyId === "healthy_drinks") {
      setWater(totalNeededGrams);
    } else {
      SystemKeysStore.updateManualKey(currentDayIndex, keyId, true, { manualGrams: manualResult });
    }
    setUpdateTrigger(prev => prev + 1);

    // Sync selected Key if open
    if (selectedKey && selectedKey.id === keyId) {
      setSelectedKey(prev => prev ? {
        ...prev,
        manualGrams: manualResult,
        totalGrams: autoGrams + manualResult,
        portionsFilled: nextPortionCount,
        optimalDone: nextPortionCount >= prev.optimum
      } : null);
    }
  };

  // Toggle state binary for Action Keys
  const handleActionToggle = (keyId: string, checkedStatus: boolean) => {
    triggerClick(1);
    const nextStatus = !checkedStatus;
    SystemKeysStore.updateManualKey(currentDayIndex, keyId, false, { checked: nextStatus });
    setUpdateTrigger(prev => prev + 1);

    // Sync selected Key if open
    if (selectedKey && selectedKey.id === keyId) {
      setSelectedKey(prev => prev ? {
        ...prev,
        portionsFilled: nextStatus ? 1 : 0,
        optimalDone: nextStatus
      } : null);
    }
  };

  // Direct manual grams input from key main grid rows
  const handleGramsInputChangeDirectly = (keyId: string, val: number) => {
    const finalVal = Math.max(0, val);
    if (keyId === "healthy_drinks") {
      setWater(finalVal);
    } else {
      SystemKeysStore.updateManualKey(currentDayIndex, keyId, true, { manualGrams: finalVal });
    }
    setUpdateTrigger(prev => prev + 1);
  };

  const richKeyInfo = useMemo(() => {
    if (!selectedKey) return null;
    return SYSTEM_KEYS.find(sk => sk.id === selectedKey.id) || null;
  }, [selectedKey]);

  // Adjust manual grams directly via text input or custom quick-paddings
  const handleGramsFieldChange = (newGrams: number) => {
    if (!selectedKey) return;
    const finalVal = Math.max(0, newGrams);
    
    if (selectedKey.id === "healthy_drinks") {
      setWater(finalVal);
    } else {
      SystemKeysStore.updateManualKey(currentDayIndex, selectedKey.id, true, { manualGrams: finalVal });
    }
    
    setTempManualGrams(finalVal);
    setUpdateTrigger(prev => prev + 1);

    // Live sync modal state parameters
    setSelectedKey(prev => {
      if (!prev) return null;
      const total = prev.autoGrams + finalVal;
      const portions = Math.min(prev.maxCircles, Math.floor(total / prev.portionSizeInGrams));
      return {
        ...prev,
        manualGrams: finalVal,
        totalGrams: total,
        portionsFilled: portions,
        optimalDone: portions >= prev.optimum
      };
    });
  };

  // Trigger global save when clicking main CTA or on return
  const handleSave = () => {
    onSaveProgress({
      completedCount: closedCount,
      nutrition: [],
      lifestyle: []
    });
  };

  return (
    <div 
      className="absolute inset-0 bg-[#F8FAFC] flex flex-col text-slate-800 overflow-hidden" 
      id="system-keys-screen" 
      style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
    >
      {/* HEADER SECTION */}
      <div className="shrink-0 w-full bg-white/90 backdrop-blur-md sticky top-0 z-30 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <button 
          id="keys-header-back"
          type="button"
          onClick={() => {
            onSaveProgress({
              completedCount: closedCount,
              nutrition: [],
              lifestyle: []
            });
          }}
          className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-50 border border-slate-100 text-slate-600 hover:bg-slate-100 active:scale-95 transition-all cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
        </button>
        <h1 className="text-[18px] sm:text-[20px] font-black tracking-tight text-slate-800">
          Ключи системы
        </h1>
        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* CONTENT SCROLLABLE GRID */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-6 flex flex-col gap-4.5 max-w-lg mx-auto w-full scrollbar-none">
        
        {/* PREMIUM VESSEL SUMMARY CARD */}
        <div className="w-full bg-gradient-to-br from-[#10B981] via-[#059669] to-[#0D9488] text-white rounded-3xl p-5 relative overflow-hidden shadow-[0_12px_28px_rgba(16,185,129,0.22)] flex gap-4 items-center border border-white/10 shrink-0">
          {/* Accent decoration glow filters */}
          <div className="absolute top-[-20px] right-[-20px] w-28 h-28 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-[-10px] left-10 w-20 h-20 bg-teal-300/20 rounded-full blur-xl pointer-events-none" />

          {/* ACTIVE ORGANIC FLOAT-AND-BURST BUBBLES IN BACKGROUND */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[
              { id: "kb-01", size: 6, left: "12%", delay: 0 },
              { id: "kb-02", size: 10, left: "28%", delay: 1.5 },
              { id: "kb-03", size: 5, left: "45%", delay: 0.8 },
              { id: "kb-04", size: 9, left: "62%", delay: 2.2 },
              { id: "kb-05", size: 7, left: "78%", delay: 1.2 },
              { id: "kb-06", size: 11, left: "90%", delay: 3.1 },
              { id: "kb-07", size: 6, left: "38%", delay: 2.7 },
              { id: "kb-08", size: 8, left: "72%", delay: 0.5 }
            ].map(b => (
              <motion.div
                key={b.id}
                className="absolute rounded-full bg-white/15 border border-white/20"
                style={{
                  width: b.size,
                  height: b.size,
                  left: b.left,
                  bottom: "-15px"
                }}
                animate={{
                  y: ["0px", "-260px"],
                  x: ["0px", b.size % 2 === 0 ? "12px" : "-12px", b.size % 3 === 0 ? "-8px" : "8px", "0px"],
                  scale: [1, 1.1, 1.2, 1.5, 0], // Scale burst explosion and pop to zero!
                  opacity: [0, 0.8, 0.8, 0.9, 0]
                }}
                transition={{
                  duration: 4.8 + (b.size % 3),
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: b.delay,
                  times: [0, 0.15, 0.82, 0.92, 1.0]
                }}
              />
            ))}
          </div>

          {/* Micro Glass dynamic vessel render */}
          <div className="w-14 h-24 border border-white/30 rounded-full relative overflow-hidden bg-white/10 backdrop-blur-md shadow-[inset_0_4px_12px_rgba(255,255,255,0.2)] shrink-0 flex flex-col justify-end">
            <div className="absolute top-1.5 left-2 right-2 h-1/5 bg-white/15 rounded-full pointer-events-none" />
            
            {/* Liquid level fluid */}
            <div 
              className="w-full bg-gradient-to-t from-emerald-500 via-[#34D399] to-[#6EE7B7] transition-all duration-[800ms] relative overflow-hidden"
              style={{ height: `${Math.max(6, (closedCount / 20) * 100)}%` }}
            >
              {/* Animated wave lines */}
              {closedCount > 0 && closedCount < 20 && (
                <div className="absolute top-0 left-[-150%] w-[400%] h-6 -mt-4.5 pointer-events-none z-10">
                  <motion.svg
                    viewBox="0 0 1200 120"
                    preserveAspectRatio="none"
                    className="absolute inset-0 w-full h-full fill-emerald-400/40 opacity-80"
                    animate={{ x: [0, -600] }}
                    transition={{ repeat: Infinity, ease: "linear", duration: 2.8 }}
                  >
                    <path d="M0,60 C150,115 350,5 500,60 C650,115 850,5 1000,60 C1150,115 1300,5 1500,60 L1500,120 L0,120 Z" />
                  </motion.svg>
                </div>
              )}

              {/* Rising bubbles micro particles inside fluid */}
              {BUBBLES_TEMPLATE.slice(0, 5).map(b => (
                <motion.div
                  key={`vessel-inner-${b.id}`}
                  className="absolute rounded-full bg-white/30"
                  style={{
                    width: b.size - 2 || 2,
                    height: b.size - 2 || 2,
                    left: b.left,
                    bottom: "-5px"
                  }}
                  animate={{
                    y: ["0%", "-115%"],
                    x: ["0px", b.id % 2 === 0 ? "3px" : "-3px", "0px"],
                    opacity: [0, 0.8, 0.8, 0]
                  }}
                  transition={{
                    duration: b.duration * 0.7,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: b.delay
                  }}
                />
              ))}
            </div>

            {/* Glowing climax at 100% completion */}
            {closedCount >= 20 && (
              <motion.div 
                className="absolute inset-0 bg-yellow-300/25 rounded-full z-20 pointer-events-none"
                animate={{ opacity: [0.15, 0.45, 0.15] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              />
            )}
          </div>

          {/* Texts info & stats */}
          <div className="flex-1 flex flex-col select-none">
            <span className="text-[11px] font-extrabold text-[#E0F2FE] uppercase tracking-widest leading-none">
              Прогресс дня
            </span>
            <span className="text-[32px] sm:text-[36px] font-black text-white leading-none mt-1.5 select-none">
              {closedCount} <span className="text-[#D1FAE5] text-[18px] font-semibold">из 20</span>
            </span>
            <p className="text-[11.5px] sm:text-[12px] text-white/90 leading-snug mt-2 font-semibold">
              {closedCount === 20 
                ? "👑 Абсолютный триумф! Все 20 ключей сияют — клетки ликуют!" 
                : closedCount >= 12
                ? "🚀 Потрясающая забота о клетках! Сосуд активно наполняется."
                : "🌱 Маленькие шаги приносят колоссальную пользу твоему ЖКТ!"
              }
            </p>
          </div>
        </div>

        {/* CUSTOM TAB SELECTOR */}
        <div className="w-full bg-slate-100 rounded-2xl p-1.5 flex gap-1 justify-between select-none shrink-0 border border-slate-150/50">
          <button 
            id="tab-products"
            type="button"
            onClick={() => setActiveTab("products")}
            className={`flex-1 py-3 text-center rounded-xl text-[14px] sm:text-[14.5px] font-bold tracking-tight transition-all cursor-pointer ${
              activeTab === "products"
                ? "bg-white text-slate-900 shadow-sm font-black"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            🍎 Продукты (13)
          </button>
          <button 
            id="tab-actions"
            type="button"
            onClick={() => setActiveTab("actions")}
            className={`flex-1 py-3 text-center rounded-xl text-[14px] sm:text-[14.5px] font-bold tracking-tight transition-all cursor-pointer ${
              activeTab === "actions"
                ? "bg-white text-slate-900 shadow-sm font-black"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            ⚡ Действия (7)
          </button>
        </div>

        {/* HEALTHY KEYS GRID */}
        <div className="w-full flex flex-col gap-3">
          {keys.filter(k => k.category === (activeTab === "products" ? "product" : "action")).map(k => {
            const currentVal = k.portionsFilled;
            const isCompleted = k.optimalDone;

            return (
              <div 
                key={k.id}
                className={`w-full rounded-[22px] bg-white border p-4 flex flex-col gap-3 transition-all ${
                  isCompleted 
                    ? "border-emerald-200 bg-emerald-50/10 shadow-[0_4px_16px_rgba(16,185,129,0.02)]" 
                    : "border-slate-150 bg-white shadow-sm"
                }`}
              >
                <div className="flex gap-3 justify-between items-start">
                  <div className="flex gap-2.5 items-center">
                    <span className="text-[26px] leading-none shrink-0" role="img" aria-label={k.name}>
                      {k.emoji}
                    </span>
                    <div className="flex flex-col">
                      <h4 className="text-[15px] sm:text-[15.5px] font-extrabold text-slate-800 leading-tight">
                        {k.num}. {k.name}
                      </h4>
                      <p className="text-[11.5px] sm:text-[12px] text-slate-400 font-medium leading-normal mt-1 max-w-[220px]">
                        {k.id === "healthy_drinks" && water > 0 && !hasWaterAuto
                          ? `Вода порция: ${water} мл`
                          : SYSTEM_KEYS.find(sk => sk.id === k.id)?.subtext || ""
                        }
                      </p>
                    </div>
                  </div>

                  {/* Info Icon clicker */}
                  <button 
                    id={`info-key-${k.id}`}
                    type="button"
                    onClick={() => setSelectedKey(k)}
                    className="p-1.5 rounded-full hover:bg-slate-50 text-slate-450 hover:text-emerald-500 transition-colors focus:outline-none cursor-pointer"
                  >
                    <Info className="w-4.5 h-4.5 stroke-[2]" />
                  </button>
                </div>

                {/* VISUAL CONTROLS */}
                <div className="w-full flex items-center justify-between pt-1.5 border-t border-slate-50">
                  {/* Status Indicator */}
                  <span className={`text-[12px] font-bold ${
                    isCompleted 
                      ? "text-emerald-600 font-black" 
                      : currentVal > 0 
                      ? "text-slate-500" 
                      : "text-slate-350"
                  }`}>
                    {isCompleted 
                      ? (k.superLevelDone ? "★ Сияющий суперуровень!" : "Выполнено!") 
                      : k.category === "product" 
                      ? `Порций: ${currentVal} из ${k.optimum}` 
                      : "Ожидает выполнения"
                    }
                  </span>

                  {/* Action or Portion clicker */}
                  {k.category === "product" ? (
                    <div className="flex gap-1.5 items-center select-none">
                      {/* Portion check circles */}
                      <div className="flex gap-1 items-center">
                        {Array.from({ length: PRODUCT_KEYS_LIST.includes(k.id) ? k.optimum : k.maxCircles }).map((_, idx) => {
                          const circleVal = idx + 1;
                          const checked = currentVal >= circleVal;
                          const isSuper = k.hasSuperlevel && circleVal > k.optimum;

                          return (
                            <button
                              id={`portion-${k.id}-${circleVal}`}
                              key={idx}
                              type="button"
                              onClick={() => handleProductPortionClick(k.id, idx, currentVal, k.portionSizeInGrams, k.autoGrams)}
                              className={`h-8 rounded-full border flex items-center justify-center font-black transition-all duration-200 cursor-pointer w-8 text-[13px] ${
                                checked
                                  ? isSuper
                                    ? "bg-amber-500 border-amber-600 text-white shadow-sm shadow-amber-500/20"
                                    : "bg-emerald-500 border-emerald-600 text-white shadow-sm shadow-emerald-500/25"
                                  : isSuper
                                  ? "border-amber-200 text-amber-500 bg-amber-50/20 hover:bg-amber-500/10"
                                  : "border-slate-200 text-slate-500 hover:bg-emerald-500/5 hover:border-emerald-500/20 bg-slate-50/30"
                              }`}
                            >
                              {isSuper ? "★" : circleVal}
                            </button>
                          );
                        })}
                      </div>

                      {/* For keys 1-13: Render dedicated single Superlevel button and manual weight input field */}
                      {PRODUCT_KEYS_LIST.includes(k.id) && (
                        <div className="flex items-center gap-1.5 border-l border-slate-100 pl-1.5 ml-0.5">
                          {k.hasSuperlevel && (
                            <button
                              id={`superlevel-btn-${k.id}`}
                              type="button"
                              onClick={() => {
                                // Toggle Superlevel: toggle between 0 and manual grams to complete Superlevel
                                if (k.superLevelDone) {
                                  handleGramsInputChangeDirectly(k.id, 0);
                                } else {
                                  const neededGrams = (k.optimum + 1) * k.portionSizeInGrams;
                                  const manualRequired = Math.max(0, neededGrams - k.autoGrams);
                                  handleGramsInputChangeDirectly(k.id, manualRequired);
                                }
                              }}
                              className={`w-8 h-8 rounded-full border flex items-center justify-center text-[15px] font-black transition-all duration-200 cursor-pointer ${
                                k.superLevelDone
                                  ? "bg-amber-500 border-amber-600 text-white shadow-sm shadow-amber-500/20"
                                  : "border-amber-200 text-amber-500 bg-amber-50/20 hover:bg-amber-500/10"
                              }`}
                              title="Суперуровень"
                            >
                              ★
                            </button>
                          )}
                          <div className="flex items-center gap-0.5">
                            <input
                              type="number"
                              placeholder={k.id === "healthy_drinks" ? "+мл" : "+г"}
                              value={k.manualGrams || ""}
                              onChange={(e) => {
                                const val = e.target.value === "" ? 0 : Number(e.target.value);
                                handleGramsInputChangeDirectly(k.id, val);
                              }}
                              className="w-13 h-8 text-center text-[11px] font-black bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 focus:border-amber-400 rounded-lg focus:outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-slate-800"
                              title={k.id === "healthy_drinks" ? "Вручную вне рецепта (мл)" : "Вручную вне рецепта (грамм)"}
                            />
                            <span className="text-[10px] text-slate-400 font-bold select-none p-0.5">
                              {k.id === "healthy_drinks" ? "мл" : "г"}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      id={`toggle-${k.id}`}
                      type="button"
                      onClick={() => handleActionToggle(k.id, k.optimalDone)}
                      className={`px-4 py-1.5 rounded-full text-[12.5px] font-black tracking-tight transition-all cursor-pointer ${
                        k.optimalDone
                          ? "bg-emerald-500 border border-emerald-600 text-white shadow-sm shadow-emerald-500/25"
                          : "bg-slate-100 border border-slate-200 text-slate-500 hover:bg-slate-200/60"
                      }`}
                    >
                      {k.optimalDone ? (
                        <span className="flex items-center gap-1">
                          <Check className="w-3.5 h-3.5 stroke-[3]" /> Выполнено
                        </span>
                      ) : "Сделал"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* BOTTOM ACTION BAR AND NAVIGATION ZONE */}
      <div className="shrink-0 w-full z-20 flex flex-col bg-white">
        {/* Save button card sitting above bottom menu */}
        <div className="w-full px-4 pt-4 pb-1 bg-white border-t border-slate-100 max-w-lg mx-auto">
          <button
            id="btn-keys-save-footer"
            type="button"
            onClick={handleSave}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-black text-[15px] sm:text-[16px] tracking-wide shadow-md shadow-emerald-500/25 hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer text-center"
          >
            Сохранить прогресс дня
          </button>
        </div>

        {/* Bottom Menu Navigation Bar inside the viewport */}
        <div className="w-full">
          <BottomBar
            onHomeClick={onNavigateHome || onBack}
            onDiaryClick={onNavigateDiary}
            onAnalyticsClick={onNavigateProgress}
            activeTab="progress"
          />
        </div>
      </div>

      {/* SYSTEM KEY DYNAMIC INFO SHEET (POYASNYALKA) */}
      <AnimatePresence>
        {selectedKey && richKeyInfo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 box-border" id="info-sheet-portal">
            {/* Elegant glass backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedKey(null)}
              className="absolute inset-0 bg-[#0c1613]/55 backdrop-blur-md"
              id="info-sheet-overlay"
            />

            {/* Beautiful, self-contained, auto-scrolling white dialog container inside bounds */}
            <motion.div
              initial={{ scale: 0.93, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.93, opacity: 0, y: 15 }}
              transition={{ type: "spring", damping: 30, stiffness: 320 }}
              className="bg-white rounded-[28px] relative z-10 w-[calc(100vw-32px)] max-w-[390px] shadow-[0_24px_60px_rgba(0,0,0,0.22)] flex flex-col border border-slate-100/80 overflow-hidden"
              style={{ maxHeight: "calc(100dvh - 32px)" }}
              id="info-sheet-container"
            >
              {/* Header section (Rigidly static & safe inside container top) */}
              <div className="p-5 pb-3.5 border-b border-slate-100/80 flex items-center justify-between text-left shrink-0 gap-3">
                <div className="flex gap-3 items-center flex-1 min-w-0">
                  <span className="text-[34px] leading-none shrink-0" role="img" aria-label={richKeyInfo.name}>
                    {richKeyInfo.emoji}
                  </span>
                  <div className="flex flex-col min-w-0">
                    <h3 className="text-[17px] sm:text-[19px] font-black text-slate-800 leading-tight break-words">
                      {richKeyInfo.name}
                    </h3>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#10B981] leading-none mt-1 truncate">
                      Ключ системы №{richKeyInfo.num}
                    </span>
                  </div>
                </div>
                {/* Safe touch cross closing handler */}
                <button
                  type="button"
                  onClick={() => setSelectedKey(null)}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 border border-slate-150 text-slate-450 hover:text-slate-600 hover:bg-slate-100 active:scale-90 transition-all cursor-pointer shrink-0"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable content block (Purely scrollable, safely bounded) */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 text-left font-normal select-text scroll-smooth overscroll-contain" style={{ scrollbarWidth: "thin" }}>
                
                {/* DYNAMIC MANUAL ENTRY ADJUSTMENT BAR (for products only) */}
                {richKeyInfo.category === "product" && PRODUCT_KEYS_LIST.includes(richKeyInfo.id) && (
                  <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-100 flex flex-col gap-2.5 shrink-0">
                    <h5 className="text-[11px] font-black uppercase text-indigo-500 tracking-wider">
                      📝 Ручной учёт (вне меню)
                    </h5>
                    
                    <div className="flex items-center justify-between gap-3 bg-white px-3 py-2 rounded-xl border border-indigo-100/50">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[11px] text-slate-450 font-bold">Собрано из меню</span>
                        <span className="text-[13px] font-black text-slate-700">{Math.round(selectedKey.autoGrams)} г</span>
                      </div>
                      <div className="flex flex-col gap-0.5 text-right">
                        <span className="text-[11px] text-slate-450 font-bold">Введено вручную</span>
                        <span className="text-[13px] font-black text-indigo-700">{Math.round(selectedKey.manualGrams)} г</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mt-1 justify-between">
                      <span className="text-[12.5px] font-black text-slate-700 font-sans">Итоговый вес:</span>
                      
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={tempManualGrams === "" ? "" : tempManualGrams}
                          onChange={(e) => {
                            const val = e.target.value === "" ? "" : Number(e.target.value);
                            setTempManualGrams(val);
                            if (typeof val === "number") {
                              handleGramsFieldChange(val);
                            }
                          }}
                          placeholder="0"
                          className="w-20 px-2 py-1 rounded-lg border border-slate-200 text-center text-slate-850 font-black text-[14px] focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100"
                        />
                        <span className="text-[11px] font-bold text-slate-455">грамм</span>
                      </div>
                    </div>

                    {/* Quick increment buttons */}
                    <div className="flex gap-1.5 mt-1.5 select-none shrink-0 w-full">
                      <button
                        type="button"
                        onClick={() => handleGramsFieldChange(selectedKey.manualGrams + selectedKey.portionSizeInGrams)}
                        className="flex-1 py-1.5 rounded-lg bg-indigo-500 text-white font-bold text-[11.5px] hover:bg-indigo-600 transition-colors shadow-sm cursor-pointer"
                      >
                        + {selectedKey.portionSizeInGrams} г
                      </button>
                      <button
                        type="button"
                        onClick={() => handleGramsFieldChange(Math.max(0, selectedKey.manualGrams - selectedKey.portionSizeInGrams))}
                        className="flex-1 py-1.5 rounded-lg bg-slate-100 text-slate-600 border border-slate-200 font-bold text-[11.5px] hover:bg-slate-200/80 transition-colors cursor-pointer"
                      >
                        - {selectedKey.portionSizeInGrams} г
                      </button>
                      <button
                        type="button"
                        onClick={() => handleGramsFieldChange(0)}
                        className="px-2.5 py-1.5 rounded-lg bg-red-50 text-red-500 border border-red-100 font-bold text-[11.5px] hover:bg-red-100/60 transition-colors cursor-pointer"
                      >
                        Сброс
                      </button>
                    </div>

                    {/* Extra Granular weight additions */}
                    <div className="flex gap-1.5 select-none shrink-0 w-full">
                      {selectedKey.id === "healthy_drinks" ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleGramsFieldChange(selectedKey.manualGrams + 100)}
                            className="flex-1 py-1 rounded-lg bg-white text-indigo-600 border border-indigo-100 font-bold text-[10.5px] hover:bg-indigo-50/50 transition-colors cursor-pointer"
                          >
                            +100 мл
                          </button>
                          <button
                            type="button"
                            onClick={() => handleGramsFieldChange(selectedKey.manualGrams + 250)}
                            className="flex-1 py-1 rounded-lg bg-white text-indigo-600 border border-indigo-100 font-bold text-[10.5px] hover:bg-indigo-50/50 transition-colors cursor-pointer"
                          >
                            +250 мл
                          </button>
                          <button
                            type="button"
                            onClick={() => handleGramsFieldChange(selectedKey.manualGrams + 500)}
                            className="flex-1 py-1 rounded-lg bg-white text-indigo-600 border border-indigo-100 font-bold text-[10.5px] hover:bg-indigo-50/50 transition-colors cursor-pointer"
                          >
                            +500 мл
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleGramsFieldChange(selectedKey.manualGrams + 10)}
                            className="flex-1 py-1 rounded-lg bg-white text-indigo-600 border border-indigo-100 font-bold text-[10.5px] hover:bg-indigo-50/50 transition-colors cursor-pointer"
                          >
                            +10 г
                          </button>
                          <button
                            type="button"
                            onClick={() => handleGramsFieldChange(selectedKey.manualGrams + 50)}
                            className="flex-1 py-1 rounded-lg bg-white text-indigo-600 border border-indigo-100 font-bold text-[10.5px] hover:bg-indigo-50/50 transition-colors cursor-pointer"
                          >
                            +50 г
                          </button>
                          <button
                            type="button"
                            onClick={() => handleGramsFieldChange(selectedKey.manualGrams + 100)}
                            className="flex-1 py-1 rounded-lg bg-white text-indigo-600 border border-indigo-100 font-bold text-[10.5px] hover:bg-indigo-50/50 transition-colors cursor-pointer"
                          >
                            +100 г
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Conditional Word-for-Word purely informative block for keys 1-6 */}
                {["legumes", "whole_grains", "vegetables", "leafy_greens", "nuts", "seeds"].includes(richKeyInfo.id) ? (
                  <div className="space-y-4">
                    {richKeyInfo.id === "legumes" && (
                      <div className="space-y-4">
                        <div>
                          <div className="text-[11.5px] font-black uppercase text-slate-400 tracking-wider mb-1">Что входит</div>
                          <p className="text-[13px] sm:text-[13.5px] text-slate-700 leading-relaxed font-semibold">чечевица (все виды), нут, фасоль (все виды), маш, горох (колотый, цельный, свежий), соевые бобы (эдамаме, тофу, темпе — тоже считаются).</p>
                        </div>
                        <div>
                          <div className="text-[11.5px] font-black uppercase text-slate-400 tracking-wider mb-1">Граммовка</div>
                          <p className="text-[13px] sm:text-[13.5px] text-slate-700 leading-relaxed font-semibold">1 кнопка = 50–70 г сухих бобовых. При варке вес увеличивается в ~2,5 раза.</p>
                        </div>
                        <div>
                          <div className="text-[11.5px] font-black uppercase text-slate-400 tracking-wider mb-1">Почему важно</div>
                          <p className="text-[13px] sm:text-[13.5px] text-slate-700 leading-relaxed font-semibold">главный источник растительного белка, железа, цинка и клетчатки. Снижают холестерин, сахар и риск рака кишечника.</p>
                        </div>
                        <div>
                          <div className="text-[11.5px] font-black uppercase text-slate-400 tracking-wider mb-1">Дневной оптимум</div>
                          <p className="text-[13px] sm:text-[13.5px] text-slate-800 leading-relaxed font-black">100–140 г сухих бобовых (2 кнопки).</p>
                        </div>
                        <div>
                          <div className="text-[11.5px] font-black uppercase text-amber-600 tracking-wider mb-1">Суперуровень</div>
                          <p className="text-[13px] sm:text-[13.5px] text-amber-900 leading-relaxed font-semibold bg-amber-50/15 p-3 rounded-xl border border-amber-100/30">150–210 г сухих (3 кнопки) — для спортсменов, при высоких физических нагрузках или в период восстановления после травм, операций и т.д.</p>
                        </div>
                        <div>
                          <div className="text-[11.5px] font-black uppercase text-slate-400 tracking-wider mb-1">Превышение оптимума дня</div>
                          <p className="text-[13px] sm:text-[13.5px] text-slate-750 leading-relaxed font-semibold">приветствуется до 3 кнопок (суперуровень). Более высокое потребление может вызвать вздутие и дискомфорт, но в целом безопасно для активных людей.</p>
                        </div>
                      </div>
                    )}
                    {richKeyInfo.id === "whole_grains" && (
                      <div className="space-y-4">
                        <div>
                          <div className="text-[11.5px] font-black uppercase text-slate-400 tracking-wider mb-1">Что входит</div>
                          <p className="text-[13px] sm:text-[13.5px] text-slate-700 leading-relaxed font-semibold">овёс (цельный, если хлопья, то не хлопья быстрого приготовления), зелёная гречка, киноа, бурый рис, чёрный рис, красный рис, сорго, пшено.</p>
                        </div>
                        <div>
                          <div className="text-[11.5px] font-black uppercase text-slate-400 tracking-wider mb-1">Граммовка</div>
                          <p className="text-[13px] sm:text-[13.5px] text-slate-700 leading-relaxed font-semibold">1 кнопка = 40–60 г сухой крупы или 1 ломтик хлеба из муки из цельного зерна (~30 г). Вес после варки ≈ 100–150 г.</p>
                        </div>
                        <div>
                          <div className="text-[11.5px] font-black uppercase text-slate-400 tracking-wider mb-1">Почему важно</div>
                          <p className="text-[13px] sm:text-[13.5px] text-slate-700 leading-relaxed font-semibold">дают энергию, витамины группы B, магний, селен. В отличие от рафинированных злаков, сохраняют клетчатку и не вызывают скачков сахара.</p>
                        </div>
                        <div>
                          <div className="text-[11.5px] font-black uppercase text-slate-400 tracking-wider mb-1">Дневной оптимум</div>
                          <p className="text-[13px] sm:text-[13.5px] text-slate-800 leading-relaxed font-black">80–120 г сухих злаков (2 кнопки).</p>
                        </div>
                        <div>
                          <div className="text-[11.5px] font-black uppercase text-slate-400 tracking-wider mb-1">Превышение оптимума дня</div>
                          <p className="text-[13px] sm:text-[13.5px] text-slate-700 leading-relaxed font-semibold">не рекомендуется, так как может сместить баланс макронутриентов в сторону избытка углеводов и повысить калорийность без дополнительной нутриентной плотности.</p>
                        </div>
                      </div>
                    )}
                    {richKeyInfo.id === "vegetables" && (
                      <div className="space-y-4">
                        <div>
                          <div className="text-[11.5px] font-black uppercase text-slate-400 tracking-wider mb-1">Что входит</div>
                          <p className="text-[13px] sm:text-[13.5px] text-slate-700 leading-relaxed font-semibold">брокколи, цветная капуста, кабачки, тыква, морковь, свёкла, перец, помидоры, огурцы, баклажаны, стручковая фасоль, кукуруза, картофель, батат, редис, репа, сельдерей корневой и т.д. Сюда входят также все виды капусты: белокочанная, краснокочанная, пекинская, савойская, брюссельская, кольраби (кроме листовой капусты кейл, которая относится к листовым).</p>
                        </div>
                        <div>
                          <div className="text-[11.5px] font-black uppercase text-slate-400 tracking-wider mb-1">Граммовка</div>
                          <p className="text-[13px] sm:text-[13.5px] text-slate-700 leading-relaxed font-semibold">1 кнопка = 80–120 г (≈ 1 средний помидор или полстакана нарезанных). Учитывается сырой или приготовленный вес.</p>
                        </div>
                        <div>
                          <div className="text-[11.5px] font-black uppercase text-slate-400 tracking-wider mb-1">Почему важно</div>
                          <p className="text-[13px] sm:text-[13.5px] text-slate-700 leading-relaxed font-semibold">антиоксиданты, витамины, клетчатка, калий. Снижают давление, защищают сердце и глаза. Ешьте разноцветные!</p>
                        </div>
                        <div>
                          <div className="text-[11.5px] font-black uppercase text-slate-400 tracking-wider mb-1">Дневной оптимум</div>
                          <p className="text-[13px] sm:text-[13.5px] text-slate-800 leading-relaxed font-black">320–480 г (4 кнопки).</p>
                        </div>
                        <div>
                          <div className="text-[11.5px] font-black uppercase text-amber-600 tracking-wider mb-1">Суперуровень</div>
                          <p className="text-[13px] sm:text-[13.5px] text-amber-900 leading-relaxed font-semibold bg-amber-50/15 p-3 rounded-xl border border-amber-100/30">420–540 г (5 кнопок) — при высокой активности.</p>
                        </div>
                        <div>
                          <div className="text-[11.5px] font-black uppercase text-slate-400 tracking-wider mb-1">Превышение оптимума дня</div>
                          <p className="text-[13px] sm:text-[13.5px] text-slate-705 leading-relaxed font-semibold">приветствуется, особенно при высокой физической активности. Овощи низкокалорийны, богаты клетчаткой и водой, поэтому даже 600–800 г в день безопасны и полезны.</p>
                        </div>
                      </div>
                    )}
                    {richKeyInfo.id === "leafy_greens" && (
                      <div className="space-y-4">
                        <div>
                          <div className="text-[11.5px] font-black uppercase text-slate-400 tracking-wider mb-1">Что входит</div>
                          <p className="text-[13px] sm:text-[13.5px] text-slate-700 leading-relaxed font-semibold">шпинат, руккола, салат (все виды), капуста кейл, мангольд, петрушка, укроп, кинза, базилик, мята, зелёный лук, сельдерей листовой, микрозелень.</p>
                        </div>
                        <div>
                          <div className="text-[11.5px] font-black uppercase text-slate-400 tracking-wider mb-1">Граммовка</div>
                          <p className="text-[13px] sm:text-[13.5px] text-slate-700 leading-relaxed font-semibold">1 кнопка = 40–60 г свежих листьев (≈ большая горсть). При тушении вес уменьшается, но питательная ценность остаётся.</p>
                        </div>
                        <div>
                          <div className="text-[11.5px] font-black uppercase text-slate-400 tracking-wider mb-1">Почему важно</div>
                          <p className="text-[13px] sm:text-[13.5px] text-slate-700 leading-relaxed font-semibold">рекордное содержание витамина K, фолата, лютеина. Защищают мозг, кости и зрение. Каждому нужна хотя бы горсть в день.</p>
                        </div>
                        <div>
                          <div className="text-[11.5px] font-black uppercase text-slate-400 tracking-wider mb-1">Дневной оптимум</div>
                          <p className="text-[13px] sm:text-[13.5px] text-slate-800 leading-relaxed font-black">200–300 г (5 кнопок).</p>
                        </div>
                        <div>
                          <div className="text-[11.5px] font-black uppercase text-amber-600 tracking-wider mb-1">Суперуровень</div>
                          <p className="text-[13px] sm:text-[13.5px] text-amber-900 leading-relaxed font-semibold bg-amber-50/15 p-3 rounded-xl border border-amber-100/30">250–350 г (6 кнопок) — рекордная доза витамина K и фолата.</p>
                        </div>
                        <div>
                          <div className="text-[11.5px] font-black uppercase text-slate-400 tracking-wider mb-1">Превышение оптимума дня</div>
                          <p className="text-[13px] sm:text-[13.5px] text-slate-700 leading-relaxed font-semibold">приветствуется. Увеличение порции до 400–500 г в день безопасно и даёт дополнительную защиту от хронических заболеваний благодаря высокому содержанию антиоксидантов.</p>
                        </div>
                      </div>
                    )}
                    {richKeyInfo.id === "nuts" && (
                      <div className="space-y-4">
                        <div>
                          <div className="text-[11.5px] font-black uppercase text-slate-400 tracking-wider mb-1">Что входит</div>
                          <p className="text-[13px] sm:text-[13.5px] text-slate-700 leading-relaxed font-semibold">грецкие, миндаль, фундук, кешью, пекан, бразильский орех, фисташки, макадамия, кедровые орехи.</p>
                        </div>
                        <div>
                          <div className="text-[11.5px] font-black uppercase text-slate-400 tracking-wider mb-1">Граммовка</div>
                          <p className="text-[13px] sm:text-[13.5px] text-slate-700 leading-relaxed font-semibold">1 кнопка = 15–30 г (сырые, не жареные, не солёные). Пример: 5–6 грецких орехов или 15 миндалин.</p>
                        </div>
                        <div>
                          <div className="text-[11.5px] font-black uppercase text-slate-400 tracking-wider mb-1">Почему важно</div>
                          <p className="text-[13px] sm:text-[13.5px] text-slate-700 leading-relaxed font-semibold">полезные жиры, витамин E, селен, магний. Снижают риск инфаркта и деменции. Не бойтесь жиров — но они должны быть в матрице цельного продукта.</p>
                        </div>
                        <div>
                          <div className="text-[11.5px] font-black uppercase text-slate-400 tracking-wider mb-1">Дневной оптимум</div>
                          <p className="text-[13px] sm:text-[13.5px] text-slate-800 leading-relaxed font-black">15–30 г (1 кнопка). Максимум орехов, который может быть – 60 гр в день.</p>
                        </div>
                        <div>
                          <div className="text-[11.5px] font-black uppercase text-slate-400 tracking-wider mb-1">Превышение оптимума дня</div>
                          <p className="text-[13px] sm:text-[13.5px] text-slate-700 leading-relaxed font-semibold">не приветствуется. Более 60 г орехов в день сильно повышает калорийность и увеличивает содержание Омега-6, что может способствовать воспалению. Рекомендуется не превышать 30 г орехов + 30 г семян в сумме.</p>
                        </div>
                      </div>
                    )}
                    {richKeyInfo.id === "seeds" && (
                      <div className="space-y-4">
                        <div>
                          <div className="text-[11.5px] font-black uppercase text-slate-400 tracking-wider mb-1">Что входит</div>
                          <p className="text-[13px] sm:text-[13.5px] text-slate-700 leading-relaxed font-semibold">подсолнечник, кунжут (белый, чёрный, серый), тыквенные, чиа, конопляные, мак, кунжутная паста (тахини — тоже семена), конопля и т.д.</p>
                        </div>
                        <div>
                          <div className="text-[11.5px] font-black uppercase text-slate-400 tracking-wider mb-1">Граммовка</div>
                          <p className="text-[13px] sm:text-[13.5px] text-slate-700 leading-relaxed font-semibold">1 кнопка = 15–30 г. Для лучшего усвоения семена льна, кунжута, чиа и конопли можно молоть или замачивать.</p>
                        </div>
                        <div>
                          <div className="text-[11.5px] font-black uppercase text-slate-400 tracking-wider mb-1">Почему важно</div>
                          <p className="text-[13px] sm:text-[13.5px] text-slate-700 leading-relaxed font-semibold">цинк, железо, кальций, омега-6. Семена чиа и конопли содержат также омега-3. Поддерживают иммунитет и гормоны.</p>
                        </div>
                        <div>
                          <div className="text-[11.5px] font-black uppercase text-slate-400 tracking-wider mb-1">Дневной оптимум</div>
                          <p className="text-[13px] sm:text-[13.5px] text-slate-800 leading-relaxed font-black">15–30 г (1 кнопка).</p>
                        </div>
                        <div>
                          <div className="text-[11.5px] font-black uppercase text-slate-400 tracking-wider mb-1">Превышение оптимума</div>
                          <p className="text-[13px] sm:text-[13.5px] text-slate-700 leading-relaxed font-semibold">не приветствуется. Избыток семян (особенно подсолнечника и кунжута) повышает калорийность и дисбаланс Омега-6. Рекомендуется не превышать 30 г семян в день.</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {/* 1. Что входит */}
                    <div className="flex flex-col">
                      <h5 className="text-[11.5px] font-black uppercase text-slate-400 tracking-wider mb-1">
                        Что входит в эту категорию
                      </h5>
                      <p className="text-[13px] sm:text-[13.5px] text-slate-700 leading-relaxed font-semibold break-words whitespace-pre-wrap">
                        {richKeyInfo.whatsIncluded}
                      </p>
                    </div>

                    {/* 2. Размер порции */}
                    <div className="flex flex-col">
                      <h5 className="text-[11.5px] font-black uppercase text-slate-400 tracking-wider mb-1">
                        Размер одной порции
                      </h5>
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-[13px] text-slate-700 font-semibold leading-relaxed break-words whitespace-pre-wrap">
                        {richKeyInfo.portionSize}
                      </div>
                    </div>

                    {/* 3. Оптимум */}
                    <div className="flex flex-col">
                      <h5 className="text-[11.5px] font-black uppercase text-slate-400 tracking-wider mb-1">
                        Дневной оптимум
                      </h5>
                      <p className="text-[13px] sm:text-[13.5px] text-slate-800 leading-relaxed font-bold break-words whitespace-pre-wrap">
                        🎯 {richKeyInfo.optimumText}
                      </p>
                    </div>

                    {/* 4. Суперуровень */}
                    {richKeyInfo.hasSuperlevel && richKeyInfo.superlevelText && (
                      <div className="flex flex-col p-3 rounded-xl bg-amber-50/45 border border-amber-100">
                        <h5 className="text-[11.5px] font-black uppercase text-amber-600 tracking-wider mb-1">
                          ★ Суперуровень
                        </h5>
                        <p className="text-[12.5px] sm:text-[13px] text-amber-800 leading-relaxed font-semibold break-words whitespace-pre-wrap">
                          {richKeyInfo.superlevelText}
                        </p>
                      </div>
                    )}

                    {/* 5. Почему это важно */}
                    <div className="flex flex-col">
                      <h5 className="text-[11.5px] font-black uppercase text-slate-400 tracking-wider mb-1">
                        Почему это жизненно важно
                      </h5>
                      <p className="text-[13px] sm:text-[13.5px] text-emerald-800 bg-emerald-50/15 p-3 rounded-xl border border-emerald-100/30 leading-relaxed font-semibold break-words whitespace-pre-wrap">
                        🧬 {richKeyInfo.whyImportant}
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Static safe footer bar inside card */}
              <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0">
                <button
                  id="btn-info-sheet-close"
                  type="button"
                  onClick={() => setSelectedKey(null)}
                  className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[14px] sm:text-[15px] transition-all cursor-pointer shadow-sm tracking-wide text-center"
                >
                  Понятно
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
