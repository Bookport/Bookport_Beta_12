import OpenAI from "openai";

let dashClient: OpenAI | null = null;

function getDashClient(): OpenAI {
  if (!dashClient) {
    dashClient = new OpenAI({
      apiKey: process.env.DASHSCOPE_API_KEY,
      baseURL: process.env.DASHSCOPE_BASE_URL,
      timeout: 30000,
      maxRetries: 0,
    });
  }
  return dashClient;
}

function normalizeContents(contents: any): Array<{ role: string; content: any }> {
  const messages: Array<{ role: string; content: any }> = [];

  if (typeof contents === "string") {
    messages.push({ role: "user", content: contents });
  } else if (Array.isArray(contents)) {
    for (const msg of contents) {
      const text = msg.parts?.map((p: any) => p.text).filter(Boolean).join("\n") || "";
      messages.push({ role: msg.role === "model" ? "assistant" : "user", content: text });
    }
  } else if (contents?.parts) {
    const textParts: string[] = [];
    let imageData: string | null = null;
    for (const part of contents.parts) {
      if (part.text !== undefined) textParts.push(part.text);
      if (part.inlineData) {
        imageData = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    if (imageData) {
      const content: any[] = [];
      for (const t of textParts) content.push({ type: "text", text: t });
      content.push({ type: "image_url", image_url: { url: imageData } });
      messages.push({ role: "user", content });
    } else {
      messages.push({ role: "user", content: textParts.join("\n") });
    }
  }

  return messages;
}

async function callDashScope(payload: any) {
  const config = payload.config || {};
  const modelName = payload.model || "qwen3.7-plus";
  const tools = payload.tools;
  const toolChoice = payload.tool_choice;

  let messages: any[];
  if (payload.messages) {
    messages = [...payload.messages];
  } else if (payload.contents) {
    messages = normalizeContents(payload.contents);
  } else {
    messages = [];
  }

  if (config.systemInstruction) {
    messages.unshift({ role: "system", content: config.systemInstruction });
  }

  const client = getDashClient();

  let lastErr: unknown;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const params: any = {
        model: modelName,
        messages: messages as any,
        temperature: config.temperature ?? 0.7,
        max_tokens: config.maxOutputTokens || 4000,
      };

      if (tools) params.tools = tools;
      if (toolChoice) params.tool_choice = toolChoice;

      const response = await client.chat.completions.create(params);

      const msg = response.choices?.[0]?.message;
      return {
        text: msg?.content || "",
        tool_calls: msg?.tool_calls || undefined,
      };
    } catch (err) {
      lastErr = err;
      if (attempt < 2) await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
  throw lastErr;
}

async function callGemini(payload: any) {
  const { GoogleGenAI } = await import("@google/genai");

  const geminiKey = (() => {
    const fromEnv = process.env.GEMINI_API_KEY;
    if (fromEnv && fromEnv.length > 0 && fromEnv !== "MY_GEMINI_API_KEY") return fromEnv;
    return "AIzaSyBJg1Q4iJN3s7Tq5Zw3BKik-W4GZ-MozZg";
  })();

  const ai = new GoogleGenAI({
    apiKey: geminiKey,
    httpOptions: { headers: { "User-Agent": "aistudio-build" } },
  });

  return await ai.models.generateContent(payload);
}

export async function callLLM(payload: any) {
  return callDashScope(payload);
}
