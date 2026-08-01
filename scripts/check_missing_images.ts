import { prisma } from "../src/prisma";
import * as fs from "fs";
import { ALIASES, normalize, resolveAgainstIndex } from "../src/utils/ingredientMappingCore";

const DOPUSK_DIR = "/home/sam/code/coder/Bookport_20_Beta/src/assets/ingredients/dopusk";
const ZAPRET_DIR = "/home/sam/code/coder/Bookport_20_Beta/src/assets/ingredients/zapret";

function indexDir(dir: string): Set<string> {
  const keys = new Set<string>();
  for (const f of fs.readdirSync(dir)) {
    if (/\.(webp|png)$/i.test(f) && !f.includes(":Zone")) {
      keys.add(normalize(f));
    }
  }
  return keys;
}

function targetFile(name: string): string {
  const key = normalize(name);
  const alias = ALIASES[key];
  return `${alias ? normalize(alias) : key}.webp`;
}

async function main() {
  const dopuskKeys = indexDir(DOPUSK_DIR);
  const zapretKeys = indexDir(ZAPRET_DIR);

  const items = await prisma.foodItem.findMany({
    select: { nameRu: true, wfpbStatus: true },
    orderBy: { nameRu: "asc" },
  });

  const missing: string[] = [];
  for (const it of items) {
    const folder = it.wfpbStatus === "green" ? dopuskKeys : it.wfpbStatus === "forbidden" ? zapretKeys : null;
    if (!folder) continue;
    if (!resolveAgainstIndex(it.nameRu, folder)) {
      const dir = it.wfpbStatus === "green" ? "dopusk" : "zapret";
      missing.push(`  [${it.wfpbStatus}] ${it.nameRu}  →  ${dir}/${targetFile(it.nameRu)}`);
    }
  }

  if (missing.length > 0) {
    console.log(`${missing.length} of ${items.length} DB items still have no image:`);
    console.log(missing.join("\n"));
    process.exit(1);
  }

  console.log(
    `ALL IMAGES PRESENT: 0 missing of ${items.length} DB items (dopusk=${dopuskKeys.size}, zapret=${zapretKeys.size})`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
