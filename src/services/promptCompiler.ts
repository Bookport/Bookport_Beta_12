import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Works in both ESM (via fileURLToPath) and CJS (via __dirname fallback)
const _dirname = typeof __dirname !== "undefined" ? __dirname : path.dirname(fileURLToPath(import.meta.url));
const WIKI_ROOT = path.resolve(_dirname, "../anna_wiki");

const fileCache = new Map<string, string>();

function readWikiFile(relativePath: string): string {
  if (fileCache.has(relativePath)) return fileCache.get(relativePath)!;
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
    return fs.readdirSync(dirPath)
      .filter(f => f.endsWith(".md"))
      .sort()
      .map(f => readWikiFile(path.join(dir, f)));
  } catch {
    return [];
  }
}

const KEYWORD_MAP: [RegExp, string][] = [
  [/книг|тетрад|страниц|1280|28 дн/i, "book_structure.md"],
  [/белок|b12|желез|дефицит|витамин|веган|растительн|омега|кальци|цинк|клетчатк/i, "wfpb_nutrition.md"],
  [/срыв|тяжел|устал|страшн|семь|бюджет|нет времен|не получ/i, "psychology_support.md"],
  [/модул|экран|куда нажат|раздел|кнопк/i, "app_modules_map.md"],
];

export interface CompilerContext {
  screenId?: string;
  userMessage: string;
  userName?: string;
  screenContextDetails?: Record<string, any>;
  bookRecipesDataContext?: Record<string, any>;
  isVoiceChat?: boolean;
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

    blocks.push(this.corePrompt);
    blocks.push(this.conductPrompt);

    const moduleContent = this.resolveModule(ctx.screenId);
    if (moduleContent) blocks.push(moduleContent);

    const knowledgeFiles = this.matchKeywords(ctx.userMessage);
    for (const kf of knowledgeFiles) {
      const content = readWikiFile(path.join("knowledge", kf));
      if (content) blocks.push(content);
    }

    // Brevity rule for voice / audio chat
    if (ctx.isVoiceChat) {
      blocks.push(
        "[ПРАВИЛО КРАТКОСТИ]: Ты находишься в голосовом/аудио-чате. Отвечай максимально кратко — 2-3 предложения. Без списков, без эмодзи. Только суть."
      );
    }

    const preamble = this.buildUserPreamble(ctx);
    if (preamble) blocks.push(preamble);

    return blocks.join("\n\n---\n\n");
  }

  private resolveModule(screenId?: string): string | null {
    if (!screenId) return null;
    const cleanId = screenId.replace(/[^a-z_]/g, "");
    return readWikiFile(path.join("modules", `${cleanId}.md`)) || null;
  }

  private matchKeywords(message: string): string[] {
    const matched = new Set<string>();
    const lower = message.toLowerCase();
    for (const [regex, file] of KEYWORD_MAP) {
      if (regex.test(lower)) matched.add(file);
    }
    return Array.from(matched);
  }

  private buildUserPreamble(ctx: CompilerContext): string {
    const lines: string[] = [];

    if (ctx.userName) {
      lines.push(`[Имя пользователя]: "${ctx.userName}"`);
    }

    const sd = ctx.screenContextDetails;
    if (sd) {
      if (sd.screen_title) {
        lines.push(`[Текущий экран]: "${sd.screen_title}"`);
      }
      if (sd.user_input_values) {
        lines.push(`[Данные пользователя]: ${JSON.stringify(sd.user_input_values, null, 2)}`);
      }
      const userProfile: string[] = [];
      if (sd.age) userProfile.push(`возраст: ${sd.age}`);
      if (sd.height) userProfile.push(`рост: ${sd.height}`);
      if (sd.weight) userProfile.push(`вес: ${sd.weight}`);
      if (sd.systolic) userProfile.push(`давление: ${sd.systolic}/${sd.diastolic}`);
      if (userProfile.length > 0) {
        lines.push(`[Профиль пользователя]: ${userProfile.join(", ")}`);
      }
      if (sd.selectedChronic?.length > 0) {
        lines.push(`[Хронические состояния]: ${sd.selectedChronic.join(", ")}`);
      }
      if (sd.selectedGoals?.length > 0) {
        lines.push(`[Цели]: ${sd.selectedGoals.join(", ")}`);
      }
    }

    if (ctx.bookRecipesDataContext) {
      const brc = ctx.bookRecipesDataContext;
      const bookLines: string[] = ["[Контекст книги рецептов]:"];
      if (brc.active_day) bookLines.push(`- День: ${brc.active_day}`);
      if (brc.active_tab) bookLines.push(`- Вкладка: "${brc.active_tab}"`);
      if (brc.selected_recipe) {
        const r = brc.selected_recipe;
        bookLines.push(`- Выбран рецепт: "${r.technicalName}"`);
        if (r.emotionalName) bookLines.push(`  («${r.emotionalName}»)`);
        if (r.page) bookLines.push(`- Страница: ${r.page}`);
        if (r.ingredients) bookLines.push(`- Состав: ${r.ingredients}`);
        if (r.status) bookLines.push(`- Статус: ${r.status}`);
      }
      if (brc.all_recipes_for_current_day?.length > 0) {
        bookLines.push(`- Все рецепты дня ${brc.active_day}:`);
        for (const recipe of brc.all_recipes_for_current_day) {
          bookLines.push(`  * [${recipe.category}] "${recipe.technicalName}"${recipe.emotionalName ? ` («${recipe.emotionalName}») ` : ""}стр. ${recipe.page}, состав: ${recipe.ingredients}`);
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
