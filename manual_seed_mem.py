import pexpect
passphrase = "100partizan100"
child = pexpect.spawn(
    "ssh -o StrictHostKeyChecking=no mobydick@194.87.252.101",
    timeout=60, encoding="utf-8", maxread=20000
)
child.expect("Enter passphrase for key", timeout=30)
child.sendline(passphrase)
child.expect("\\$", timeout=30)

child.sendline('sudo kubectl exec -i -n bookport deployment/bookport -- sh -c "export NODE_OPTIONS=\\"--max-old-space-size=1536 --require=/etc/bookport/proxy-agent.js\\" && npx tsx prisma/seed.ts"')
child.expect("\\$", timeout=300)
print("SEED:\n", child.before)
child.sendline('exit')
