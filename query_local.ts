import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const c1 = await prisma.foodItem.count();
  console.log('=== 1. COUNT ===\n', c1);
  
  const c2 = await prisma.foodItem.groupBy({ by: ['wfpbStatus'], _count: true });
  console.log('\n=== 2. STATUS ===\n', c2);
  
  const c3 = await prisma.foodItem.findMany({ 
    where: { 
      OR: [
        {name: {contains: 'tofu', mode: 'insensitive'}}, 
        {name: {contains: 'quinoa', mode: 'insensitive'}}, 
        {name: {contains: 'buckwheat', mode: 'insensitive'}}
      ] 
    }, 
    select: {name: true}, 
    take: 10 
  });
  console.log('\n=== 3. TOFU, QUINOA, BUCKWHEAT ===\n', c3.map(i => i.name));
  
  const c4 = await prisma.foodItem.findMany({ 
    where: { name: {contains: 'chicken', mode: 'insensitive'} }, 
    select: {name: true, wfpbStatus: true}, 
    take: 5 
  });
  console.log('\n=== 4. CHICKEN ===\n', c4);
}

main().finally(() => prisma.$disconnect());
