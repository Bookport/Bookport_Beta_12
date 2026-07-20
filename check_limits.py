import pexpect
passphrase = "100partizan100"
child = pexpect.spawn(
    "ssh -o StrictHostKeyChecking=no mobydick@194.87.252.101",
    timeout=60, encoding="utf-8", maxread=20000
)
child.expect("Enter passphrase for key", timeout=30)
child.sendline(passphrase)
child.expect("\\$", timeout=30)

child.sendline('sudo kubectl get pods -n bookport -l app=bookport -o jsonpath="{.items[0].spec.containers[0].resources.limits.memory}"')
child.expect("\\$", timeout=30)
print("LIMIT:\n", child.before)
child.sendline('exit')
