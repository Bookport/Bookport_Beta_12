import pexpect

passphrase = "100partizan100"
child = pexpect.spawn(
    "ssh -o StrictHostKeyChecking=no mobydick@194.87.252.101",
    timeout=60, encoding="utf-8", maxread=20000
)

idx = child.expect("Enter passphrase for key", timeout=15)
child.sendline(passphrase)
child.expect("\\$", timeout=15)

child.sendline("sudo kubectl get pods -n bookport -o wide")
child.expect("\\$", timeout=15)
print("PODS:\n", child.before)

child.sendline("sudo kubectl get events -n bookport --sort-by='.metadata.creationTimestamp' | tail -n 20")
child.expect("\\$", timeout=15)
print("EVENTS:\n", child.before)

child.sendline("sudo kubectl logs -n bookport deployment/bookport --tail=50")
child.expect("\\$", timeout=15)
print("LOGS:\n", child.before)

child.sendline("exit")
