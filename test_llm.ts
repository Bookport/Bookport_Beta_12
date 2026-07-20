import { callLLM } from "./src/services/llmAdapter";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const t0 = Date.now();
  try {
    const res = await callLLM({
      model: "qwen3.6-flash",
      contents: "Translate to generic USDA names: 'изюм 10г'. Output ONLY a raw JSON array of objects: [{foodName: string, weightInGrams: number}].",
      config: { responseMimeType: "text/plain", temperature: 0 }
    });
    console.log("Response in", Date.now() - t0, "ms:", res.text);
  } catch (e) {
    console.error("Failed in", Date.now() - t0, "ms:", e);
  }
}
main();
