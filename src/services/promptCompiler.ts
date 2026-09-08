import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Works in both ESM and CJS.
const _dirname =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

const WIKI_ROOT = fs.existsSync(path.resolve(_dirname, "../src/anna_wiki"))
  ? path.resolve(_dirname, "../src/anna_wiki")
  : path.resolve(_dirname, "../anna_wiki");

const fileCache = new Map<string, string>();

function readWikiFile(relativePath: string): string {
  if (fileCache.has(relativePath)) {
    return fileCache.get(relativePath)!;
  }

  const fullPath = path.join(WIKI_ROOT, relativePath);

  try {
    const content = fs.readFileSync(fullPath, "utf-8");
    fileCache.set(relativePath, content);
    return content;
  } catch {
    return "";
  }
}

function readDirFiles(dir: string): string[] {
  const dirPath = path.join(WIKI_ROOT, dir);

  try {
    return fs
      .readdirSync(dirPath)
      .filter((fileName) => fileName.endsWith(".md"))
      .sort()
      .map((fileName) => readWikiFile(path.join(dir, fileName)));
  } catch {
    return [];
  }
}

const KEYWORD_MAP: [RegExp, string][] = [
  [
    /книг|тетрад|страниц|1280|28 дн/i,
    "book_structure.md",
  ],
  [
    /белок|b12|желез|дефицит|витамин|веган|растительн|омега|кальци|цинк|клетчатк/i,
    "wfpb_nutrition.md",
  ],
  [
    /срыв|тяжел|устал|страшн|семь|бюджет|нет времен|не получ/i,
    "psychology_support.md",
  ],
  [
    /модул|экран|куда нажат|раздел|кнопк/i,
    "app_modules_map.md",
  ],
];

export interface CompilerContext {
  screenId?: string;
  userMessage: string;
  userName?: string;
  screenContextDetails?: Record<string, any>;
  bookRecipesDataContext?: Record<string, any>;
  isVoiceChat?: boolean;

  // Явный выбор Wiki-файлов из annaContextRouter.
  // Имена файлов относительны к:
  // src/anna_wiki/modules
  // src/anna_wiki/knowledge
  moduleFiles?: string[];
  knowledgeFiles?: string[];
}

export class PromptCompiler {
  private corePrompt: string;
  private conductPrompt: string;

  constructor() {
    const coreParts = readDirFiles("core");
    this.corePrompt = coreParts.join("\n\n---\n\n");

    const conductParts = readDirFiles("conduct");
    this.conductPrompt = conductParts.join("\n\n---\n\n");
  }

  compile(ctx: CompilerContext): string {
    const blocks: string[] = [];

    if (this.corePrompt) {
      blocks.push(this.corePrompt);
    }

    if (this.conductPrompt) {
      blocks.push(this.conductPrompt);
    }

    const moduleFiles = Array.from(
      new Set(
        ctx.moduleFiles?.length
          ? ctx.moduleFiles
          : ctx.screenId
            ? [`${ctx.screenId.replace(/[^a-z_]/g, "")}.md`]
            : [],
      ),
    );

    for (const moduleFile of moduleFiles) {
      const content = readWikiFile(path.join("modules", moduleFile));

      if (content) {
        blocks.push(content);
      }
    }

    const knowledgeFiles = Array.from(
      new Set(
        ctx.knowledgeFiles?.length
          ? ctx.knowledgeFiles
          : this.matchKeywords(ctx.userMessage),
      ),
    );

    for (const knowledgeFile of knowledgeFiles) {
      const relativePath = knowledgeFile.startsWith("wfpb/")
        ? path.join("knowledge_wfpb", knowledgeFile.slice("wfpb/".length))
        : path.join("knowledge", knowledgeFile);

      const content = readWikiFile(relativePath);

      if (content) {
        blocks.push(content);
      }
    }

    if (ctx.isVoiceChat) {
      blocks.push(
        "[ПРАВИЛО КРАТКОСТИ]: Ты находишься в голосовом/аудио-чате. Отвечай максимально кратко — 2-3 предложения. Без списков, без эмодзи. Только суть.",
      );
    }

    const preamble = this.buildUserPreamble(ctx);

    if (preamble) {
      blocks.push(preamble);
    }

    return blocks.join("\n\n---\n\n");
  }

  private matchKeywords(message: string): string[] {
    const matched = new Set<string>();
    const lower = message.toLowerCase();

    for (const [regex, file] of KEYWORD_MAP) {
      if (regex.test(lower)) {
        matched.add(file);
      }
    }

    return Array.from(matched);
  }

  private buildUserPreamble(ctx: CompilerContext): string {
    const lines: string[] = [];

    if (ctx.userName) {
      lines.push(`[Имя пользователя]: "${ctx.userName}"`);
    }

    const screenDetails = ctx.screenContextDetails;

    if (screenDetails) {
      const gender =
        screenDetails.userGender || screenDetails.user_gender;

      if (gender) {
        lines.push(
          `[Пол пользователя]: ${
            gender === "male"
              ? "Мужской (строго используй мужские окончания в глаголах: сделал, двигался)"
              : "Женский (строго используй женские окончания в глаголах: сделала, двигалась)"
          }`,
        );
      }

      if (screenDetails.screen_title) {
        lines.push(
          `[Текущий экран]: "${screenDetails.screen_title}"`,
        );
      }

      if (screenDetails.user_input_values) {
        lines.push(
          `[Данные пользователя]: ${JSON.stringify(
            screenDetails.user_input_values,
            null,
            2,
          )}`,
        );
      }

      const userProfile: string[] = [];

      if (screenDetails.age) {
        userProfile.push(`возраст: ${screenDetails.age}`);
      }

      if (screenDetails.height) {
        userProfile.push(`рост: ${screenDetails.height}`);
      }

      if (screenDetails.weight) {
        userProfile.push(`вес: ${screenDetails.weight}`);
      }

      if (screenDetails.systolic) {
        userProfile.push(
          `давление: ${screenDetails.systolic}/${screenDetails.diastolic}`,
        );
      }

      if (userProfile.length > 0) {
        lines.push(
          `[Профиль пользователя]: ${userProfile.join(", ")}`,
        );
      }

      if (screenDetails.selectedChronic?.length > 0) {
        lines.push(
          `[Хронические состояния]: ${screenDetails.selectedChronic.join(
            ", ",
          )}`,
        );
      }

      if (screenDetails.selectedGoals?.length > 0) {
        lines.push(
          `[Цели]: ${screenDetails.selectedGoals.join(", ")}`,
        );
      }
    }

    if (ctx.bookRecipesDataContext) {
      const bookContext = ctx.bookRecipesDataContext;
      const bookLines: string[] = [
        "[Контекст книги рецептов]:",
      ];

      if (bookContext.active_day) {
        bookLines.push(`- День: ${bookContext.active_day}`);
      }

      if (bookContext.active_tab) {
        bookLines.push(
          `- Вкладка: "${bookContext.active_tab}"`,
        );
      }

      if (bookContext.selected_recipe) {
        const recipe = bookContext.selected_recipe;

        if (recipe.technicalName) {
          bookLines.push(
            `- Выбран рецепт: "${recipe.technicalName}"`,
          );
        }

        if (recipe.emotionalName) {
          bookLines.push(`- Эмоциональное название: «${recipe.emotionalName}»`);
        }

        if (recipe.page) {
          bookLines.push(`- Страница: ${recipe.page}`);
        }

        if (recipe.ingredients) {
          bookLines.push(`- Состав: ${recipe.ingredients}`);
        }

        if (recipe.status) {
          bookLines.push(`- Статус: ${recipe.status}`);
        }
      }

      if (bookContext.all_recipes_for_current_day?.length > 0) {
        bookLines.push(
          `- Все рецепты дня ${bookContext.active_day ?? ""}:`,
        );

        for (const recipe of bookContext.all_recipes_for_current_day) {
          bookLines.push(
            `  - [${recipe.category ?? "без категории"}] "${
              recipe.technicalName ?? "Без названия"
            }"${
              recipe.emotionalName
                ? ` («${recipe.emotionalName}»)`
                : ""
            }${
              recipe.page
                ? `, стр. ${recipe.page}`
                : ""
            }`,
          );
        }
      }

      lines.push(bookLines.join("\n"));
    }

    return lines.length > 0 ? lines.join("\n") : "";
  }
}

export function createCompiler(): PromptCompiler {
  return new PromptCompiler();
}
