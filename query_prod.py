import pexpect

passphrase = "100partizan100"
cmd = """sudo kubectl exec deployment/bookport -n bookport -- node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const c1 = await prisma.foodItem.count();
  console.log('=== COUNT ===');
  console.log(c1);
  
  const c2 = await prisma.foodItem.groupBy({ by: ['wfpbStatus'], _count: true });
  console.log('=== STATUS ===');
  console.log(JSON.stringify(c2, null, 2));
  
  const c3 = await prisma.foodItem.findMany({ where: { OR: [{name: {contains: 'tofu', mode: 'insensitive'}}, {name: {contains: 'quinoa', mode: 'insensitive'}}, {name: {contains: 'buckwheat', mode: 'insensitive'}}] }, select: {name: true}, take: 10 });
  console.log('=== TOFU/QUINOA/BUCKWHEAT ===');
  console.log(JSON.stringify(c3, null, 2));
  
  const c4 = await prisma.foodItem.findMany({ where: { name: {contains: 'chicken', mode: 'insensitive'} }, select: {name: true, wfpbStatus: true}, take: 5 });
  console.log('=== CHICKEN ===');
  console.log(JSON.stringify(c4, null, 2));
}
main().finally(() => prisma.$disconnect());
" """

child = pexpect.spawn(
    "ssh -o StrictHostKeyChecking=no mobydick@194.87.252.101 " + cmd,
    timeout=60, encoding="utf-8", maxread=10000
)

idx = child.expect(["Enter passphrase for key", pexpect.EOF], timeout=60)
if idx == 0:
    child.sendline(passphrase)
    child.expect(pexpect.EOF, timeout=60)

print("OUTPUT:\n", child.before)
