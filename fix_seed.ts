import fs from 'fs';

let file = fs.readFileSync('prisma/seed.ts', 'utf-8');

const oldLogic = `  console.log("Loading USDA SR Legacy data...");
  const filePath = path.join(process.cwd(), "usda_sr_legacy.json");
  let dataRaw: string;
  try {
    dataRaw = await fs.readFile(filePath, "utf-8");
  } catch (err) {
    console.log("usda_sr_legacy.json not found. Skipping USDA seed.");
    return;
  }
  
  let items: any[];
  try {
    const parsed = JSON.parse(dataRaw);
    if (Array.isArray(parsed)) {
      items = parsed;
    } else if (parsed.SRLegacyFoods) {
      items = parsed.SRLegacyFoods;
    } else if (parsed.FoundationFoods) {
      items = parsed.FoundationFoods;
    } else {
      console.error("Unknown JSON structure");
      return;
    }
  } catch (err) {
    console.error("Failed to parse JSON:", err);
    return;
  }

  const existing = await prisma.foodItem.count();
  if (existing >= 7000) {
    console.log(\`FoodItem table already seeded (\${existing} items). Skipping USDA seed.\`);
    return;
  }`;

const newLogic = `  const existing = await prisma.foodItem.count();
  if (existing >= 7000) {
    console.log(\`FoodItem table already seeded (\${existing} items). Skipping USDA seed.\`);
    return;
  }

  console.log("Loading USDA SR Legacy data...");
  const filePath = path.join(process.cwd(), "usda_sr_legacy.json");
  let dataRaw: string;
  try {
    dataRaw = await fs.readFile(filePath, "utf-8");
  } catch (err) {
    console.log("usda_sr_legacy.json not found. Skipping USDA seed.");
    return;
  }
  
  let items: any[];
  try {
    const parsed = JSON.parse(dataRaw);
    if (Array.isArray(parsed)) {
      items = parsed;
    } else if (parsed.SRLegacyFoods) {
      items = parsed.SRLegacyFoods;
    } else if (parsed.FoundationFoods) {
      items = parsed.FoundationFoods;
    } else {
      console.error("Unknown JSON structure");
      return;
    }
  } catch (err) {
    console.error("Failed to parse JSON:", err);
    return;
  }`;

if (file.includes('const existing = await prisma.foodItem.count();\n  if (existing >=')) {
    file = file.replace(oldLogic, newLogic);
    fs.writeFileSync('prisma/seed.ts', file);
    console.log("Patched seed.ts");
} else {
    console.log("Logic not found exactly as expected. I will just do a manual replace.");
}
