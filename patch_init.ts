import fs from 'fs';

let file = fs.readFileSync('server.ts', 'utf-8');

const startMarker = `async function startServer() {`;
const initLogic = `
  try {
    const items = await prisma.foodItem.findMany({
      where: { russianName: { not: null } },
      select: { name: true, russianName: true }
    });
    for (const item of items) {
      if (item.russianName) {
        const parts = item.russianName.split(',');
        for (const p of parts) {
          translationCache.set(p.trim(), item.name);
        }
      }
    }
    console.log(\`[Cache] Loaded \${translationCache.size} Russian translations from DB\`);
  } catch(e) {
    console.warn("Failed to load translation cache from DB", e);
  }
`;

file = file.replace(startMarker, startMarker + initLogic);

fs.writeFileSync('server.ts', file);
console.log("Patched server.ts successfully");
