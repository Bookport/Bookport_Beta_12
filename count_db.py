import pexpect

passphrase = "100partizan100"
child = pexpect.spawn(
    "ssh -o StrictHostKeyChecking=no mobydick@194.87.252.101",
    timeout=60, encoding="utf-8", maxread=10000
)

idx = child.expect("Enter passphrase for key", timeout=10)
child.sendline(passphrase)
child.expect("\\$", timeout=10)

child.sendline('sudo kubectl exec -n bookport deployment/bookport -- node -e "const {PrismaClient} = require(\'@prisma/client\'); const p = new PrismaClient(); p.foodItem.count().then(console.log).finally(()=>p.\$disconnect())"')
child.expect("\\$", timeout=10)
print("COUNT:", child.before)
child.sendline('exit')
