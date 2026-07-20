import pexpect

passphrase = "100partizan100"
child = pexpect.spawn(
    "ssh -o StrictHostKeyChecking=no mobydick@194.87.252.101",
    timeout=60, encoding="utf-8", maxread=10000
)

child.expect("Enter passphrase for key", timeout=10)
child.sendline(passphrase)
child.expect("\\$", timeout=10)

child.sendline('sudo kubectl exec -i -n bookport deployment/bookport -- npx tsx prisma/seed.ts')
child.expect("\\$", timeout=120)
print("SEED OUTPUT:\n", child.before)

child.sendline('exit')
