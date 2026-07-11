import OpenAI from "openai";

let dashClient: OpenAI | null = null;

function getDashClient(): OpenAI {
  if (!dashClient) {
    dashClient = new OpenAI({
      apiKey: process.env.DASHSCOPE_API_KEY,
      baseURL: process.env.DASHSCOPE_BASE_URL,
    });
  }
  return dashClient;
}

const PRIMARY_MODEL = "qwen-vl-plus";
const FALLBACK_MODEL = "qwen-vl-max";

export async function analyzeFoodImage(
  imageBase64: string,
  prompt: string,
): Promise<string> {
  const client = getDashClient();
  const models = [PRIMARY_MODEL, FALLBACK_MODEL];
  let lastError: unknown;

  for (const model of models) {
    try {
      const response = await client.chat.completions.create({
        model,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
              },
            ],
          },
        ],
        max_tokens: 2000,
        temperature: 0.1,
      });

      const text = response.choices?.[0]?.message?.content || "";
      if (text) return text;
      lastError = new Error("Empty response from " + model);
    } catch (err) {
      lastError = err;
      console.warn(`[DashScope] Model ${model} failed:`, (err as any)?.message || err);
    }
  }

  throw lastError || new Error("All DashScope models failed");
}

// ── Speech-to-Text (Paraformer / SenseVoice) ──
const ASR_ENDPOINT = "https://dashscope-intl.aliyuncs.com/api/v1/services/audio/transcription/asr";

export async function transcribeAudio(
  audioBase64: string,
  options?: {
    model?: string;
    language?: string;
    sampleRate?: number;
    format?: string;
  }
): Promise<string> {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) throw new Error("DASHSCOPE_API_KEY not set");

  const models = [
    options?.model || "paraformer-v2",
    "sensevoice-v1",
  ];
  let lastError: unknown;

  for (const model of models) {
    try {
      const response = await fetch(ASR_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          input: { audio: audioBase64 },
          parameters: {
            language: options?.language || "ru",
            sample_rate: options?.sampleRate || 16000,
            format: options?.format || "wav",
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`DashScope ASR error ${response.status}: ${errText.slice(0, 300)}`);
      }

      const data = await response.json();
      const text = data.output?.text || "";
      if (text) return text;
      lastError = new Error("Empty transcription from " + model);
    } catch (err) {
      lastError = err;
      console.warn(`[DashScope ASR] Model ${model} failed:`, (err as any)?.message || err);
    }
  }

  throw lastError || new Error("All DashScope ASR models failed");
}

// ── Text-to-Speech (DashScope Qwen3-TTS-VC) ──
const TTS_ENDPOINT = "https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation";
const TTS_MODEL = "qwen3-tts-vc-2026-01-22";
const TTS_VOICE = "qwen-tts-vc-anna-voice-20260705221124311-6db3";

async function ttsFetch(text: string): Promise<any> {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  const lastErr: unknown[] = [];
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(TTS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: TTS_MODEL,
          input: { text, voice: TTS_VOICE, language_type: "Russian" },
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`DashScope TTS error ${res.status}: ${errText.slice(0, 300)}`);
      }
      return await res.json();
    } catch (err) {
      lastErr.push(err);
      if (attempt < 2) await new Promise(r => setTimeout(r, 200));
    }
  }
  throw lastErr[lastErr.length - 1];
}

export async function generateAnnaAudio(
  text: string
): Promise<{ audioBase64: string; audioUrl: string }> {
  const t0 = Date.now();
  const result = await ttsFetch(text);
  const audioUrl = result?.output?.audio?.url;
  console.log(`[TTS-DashScope] API ${Date.now() - t0}ms url=${!!audioUrl}`);
  if (!audioUrl) throw new Error("DashScope TTS: no audio URL in response");

  try {
    const ac = new AbortController();
    const tid = setTimeout(() => ac.abort(), 6000);
    const audioResponse = await fetch(audioUrl, { signal: ac.signal });
    clearTimeout(tid);
    if (audioResponse.ok) {
      const buf = Buffer.from(await audioResponse.arrayBuffer());
      const total = Date.now() - t0;
      console.log(`[TTS-DashScope] Total ${total}ms base64=${buf.length}`);
      return { audioBase64: buf.toString("base64"), audioUrl };
    }
  } catch {
    // fall through
  }

  return { audioBase64: "", audioUrl };
}
