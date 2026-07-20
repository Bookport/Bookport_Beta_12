import pexpect
import sys

passphrase = "100partizan100"

# 1. Update resources
child = pexpect.spawn(
    "ssh -o StrictHostKeyChecking=no mobydick@194.87.252.101 "
    '"sudo kubectl set resources deployment/bookport -n bookport --limits=memory=1024Mi && sudo kubectl rollout status deployment/bookport -n bookport"',
    timeout=300, encoding="utf-8", maxread=10000
)

idx = child.expect(["Enter passphrase for key", pexpect.EOF], timeout=300)
if idx == 0:
    child.sendline(passphrase)
    child.expect(pexpect.EOF, timeout=300)

print("UPDATE OUTPUT:\n", child.before)

# 2. Check Database Count
child2 = pexpect.spawn(
    "ssh -o StrictHostKeyChecking=no mobydick@194.87.252.101",
    timeout=60, encoding="utf-8", maxread=10000
)
child2.expect("Enter passphrase for key", timeout=10)
child2.sendline(passphrase)
child2.expect("\\$", timeout=10)

child2.sendline('sudo kubectl exec -i -n bookport deployment/bookport -- node -e "const {PrismaClient} = require(\'@prisma/client\'); const p = new PrismaClient(); p.foodItem.count().then(console.log).finally(()=>process.exit(0))"')
child2.expect("\\$", timeout=120)
print("DB COUNT:\n", child2.before)

child2.sendline('exit')
