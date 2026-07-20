import { callLLM } from "./src/services/llmAdapter";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const t0 = Date.now();
  try {
    const res = await callLLM({
      model: "qwen3.6-flash",
      contents: "Return a JSON object with a single key 'hello' and value 'world'.",
      config: { responseMimeType: "application/json", temperature: 0 }
    });
    console.log("Response in", Date.now() - t0, "ms:", res.text);
  } catch (e) {
    console.error("Failed in", Date.now() - t0, "ms:", e);
  }
}
main();
