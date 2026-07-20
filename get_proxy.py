import pexpect

passphrase = "100partizan100"
child = pexpect.spawn(
    "ssh -o StrictHostKeyChecking=no mobydick@194.87.252.101",
    timeout=60, encoding="utf-8", maxread=50000
)

child.expect("Enter passphrase for key", timeout=15)
child.sendline(passphrase)
child.expect("\\$", timeout=15)

child.sendline("sudo kubectl exec -n bookport deployment/bookport -- cat /etc/bookport/proxy-agent.js")
child.expect("\\$", timeout=15)
print("PROXY SCRIPT:\n", child.before)

child.sendline("exit")
