export function safeParseJSON<T = any>(text: string, fallback?: any): { data: T; ok: boolean } {
  if (!text || typeof text !== "string") {
    return { data: fallback, ok: false };
  }

  let cleaned = text.trim();

  // Remove markdown code blocks (```json ... ``` or ``` ... ```)
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/g, "").trim();

  // Find JSON boundaries: from first { or [ to last } or ]
  const firstBrace = cleaned.indexOf("{");
  const firstBracket = cleaned.indexOf("[");
  const start = firstBrace === -1
    ? (firstBracket === -1 ? 0 : firstBracket)
    : (firstBracket === -1 ? firstBrace : Math.min(firstBrace, firstBracket));

  const lastBrace = cleaned.lastIndexOf("}");
  const lastBracket = cleaned.lastIndexOf("]");
  const end = lastBrace === -1
    ? (lastBracket === -1 ? cleaned.length - 1 : lastBracket)
    : (lastBracket === -1 ? lastBrace : Math.max(lastBrace, lastBracket));

  if (start > end) {
    return { data: fallback, ok: false };
  }

  cleaned = cleaned.slice(start, end + 1);

  try {
    const data = JSON.parse(cleaned);
    return { data, ok: true };
  } catch {
    return { data: fallback, ok: false };
  }
}
