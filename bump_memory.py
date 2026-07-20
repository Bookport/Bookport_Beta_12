import pexpect

passphrase = "100partizan100"
child = pexpect.spawn(
    "ssh -o StrictHostKeyChecking=no mobydick@194.87.252.101",
    timeout=60, encoding="utf-8", maxread=20000
)
child.expect("Enter passphrase for key", timeout=10)
child.sendline(passphrase)
child.expect("\\$", timeout=10)

child.sendline('sudo kubectl set resources deployment/bookport -n bookport --limits=memory=2Gi')
child.expect("\\$", timeout=30)
child.sendline('sudo kubectl set env deployment/bookport -n bookport NODE_OPTIONS="--max-old-space-size=1536"')
child.expect("\\$", timeout=30)
child.sendline('sudo kubectl rollout status deployment/bookport -n bookport')
child.expect("\\$", timeout=120)
print("ROLLOUT:\n", child.before)
child.sendline('exit')
