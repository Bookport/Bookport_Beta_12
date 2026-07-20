import pexpect

passphrase = "100partizan100"
child = pexpect.spawn(
    "ssh -o StrictHostKeyChecking=no mobydick@194.87.252.101",
    timeout=60, encoding="utf-8", maxread=10000
)

idx = child.expect("Enter passphrase for key", timeout=10)
child.sendline(passphrase)
child.expect("\\$", timeout=10)

child.sendline("sudo kubectl get pods -n bookport")
child.expect("\\$", timeout=10)
print("PODS:", child.before)

child.sendline("sudo kubectl logs -n bookport -l app=bookport --tail=100")
child.expect("\\$", timeout=10)
print("LOGS:", child.before)

child.sendline("sudo kubectl describe pod -n bookport -l app=bookport | grep -A 10 Events")
child.expect("\\$", timeout=10)
print("EVENTS:", child.before)

child.sendline("exit")
