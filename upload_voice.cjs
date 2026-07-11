// Usage: node upload_voice.js
// Requires DASHSCOPE_API_KEY in .env

const fs = require("fs");
const path = require("path");
const { config } = require("dotenv");
config();

const API_KEY = process.env.DASHSCOPE_API_KEY;
if (!API_KEY) {
  console.error("Error: DASHSCOPE_API_KEY not set in .env");
  process.exit(1);
}

const AUDIO_FILE = path.join(__dirname, "Anna.mp3");

if (!fs.existsSync(AUDIO_FILE)) {
  console.error("Error: Anna.mp3 not found in project root");
  process.exit(1);
}

const BASE_URL = "https://dashscope-intl.aliyuncs.com";
const CUSTOMIZATION_ENDPOINT = BASE_URL + "/api/v1/services/audio/tts/customization";

async function tryCosyVoice() {
  console.log("Trying CosyVoice voice cloning (voice-enrollment / create_voice)...");
  const audioBase64 = fs.readFileSync(AUDIO_FILE).toString("base64");
  const dataUri = `data:audio/mpeg;base64,${audioBase64}`;

  const payload = {
    model: "voice-enrollment",
    input: {
      action: "create_voice",
      target_model: "cosyvoice-v3-flash",
      prefix: "anna",
      url: dataUri,
    },
  };

  const res = await fetch(CUSTOMIZATION_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  const body = await res.text();
  if (res.ok) {
    const json = JSON.parse(body);
    const voiceId = json.output?.voice_id;
    console.log("CosyVoice success!");
    return voiceId;
  }

  console.warn("CosyVoice failed:", res.status, body.slice(0, 300));
  return null;
}

async function tryQwenTTS() {
  console.log("\nFalling back to Qwen-TTS voice cloning (qwen-voice-enrollment / create)...");
  const audioBase64 = fs.readFileSync(AUDIO_FILE).toString("base64");
  const dataUri = `data:audio/mpeg;base64,${audioBase64}`;

  const payload = {
    model: "qwen-voice-enrollment",
    input: {
      action: "create",
      target_model: "qwen3-tts-vc-2026-01-22",
      preferred_name: "anna",
      audio: { data: dataUri },
    },
  };

  const res = await fetch(CUSTOMIZATION_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  const body = await res.text();
  const json = JSON.parse(body);
  if (res.ok) {
    const voiceId = json.output?.voice;
    if (voiceId) return voiceId;
    console.warn("Qwen-TTS: no voice in response:", body.slice(0, 300));
    return null;
  }

  console.error("Qwen-TTS failed:", res.status, body.slice(0, 500));
  return null;
}

(async () => {
  console.log("=== DashScope Voice Cloning ===\n");

  let voiceId = await tryCosyVoice();
  if (!voiceId) {
    voiceId = await tryQwenTTS();
  }

  console.log("\n=== Result ===");
  if (voiceId) {
    console.log("Voice ID:", voiceId);
  } else {
    console.log("Both methods failed. No voice ID obtained.");
    process.exit(1);
  }
})().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
