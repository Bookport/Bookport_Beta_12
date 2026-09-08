const WORD_START = "(?:^|[^\\p{L}\\p{N}])";
const WORD_END = "(?=$|[^\\p{L}\\p{N}])";

const EXPLICIT_BOOK_RECIPE_PATTERN = new RegExp(
  `${WORD_START}(?:книга|книги|книге|книгу|книгой|книгами|книгах|` +
    `рецепт|рецепта|рецепте|рецептов|рецептом|рецепты|рецепту|рецептами|рецептах|` +
    `страница|страницы|странице|страницу|страницей|страницами|страницах)${WORD_END}`,
  "iu",
);

/**
 * Strict lexical gate for the optional Anna Book recipe branch.
 *
 * It does not import metadata and does not run lookup. Messages without
 * an explicit Book/recipe/page word must stay on the existing Anna path.
 */
export function shouldTryAnnaBookRecipeLookup(message: string): boolean {
  const normalizedMessage = message
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/\s+/g, " ")
    .trim();

  return Boolean(
    normalizedMessage &&
      EXPLICIT_BOOK_RECIPE_PATTERN.test(normalizedMessage),
  );
}