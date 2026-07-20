import pexpect

passphrase = "100partizan100"
child = pexpect.spawn(
    "ssh -o StrictHostKeyChecking=no mobydick@194.87.252.101",
    timeout=60, encoding="utf-8", maxread=20000
)

idx = child.expect("Enter passphrase for key", timeout=15)
child.sendline(passphrase)
child.expect("\\$", timeout=15)

child.sendline('sudo kubectl logs -n bookport deployment/bookport --tail=200 > /tmp/logs.txt && cat /tmp/logs.txt | grep -A 2 -B 2 analyze-dish')
child.expect("\\$", timeout=15)
print("LOGS:\n", child.before)

child.sendline("sudo kubectl exec -n bookport deployment/bookport -- cat /etc/bookport/proxy-agent.js")
child.expect("\\$", timeout=15)
print("PROXY_SCRIPT:\n", child.before)

child.sendline("exit")
