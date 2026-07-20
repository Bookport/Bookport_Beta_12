import pexpect
passphrase = "100partizan100"
child = pexpect.spawn(
    "ssh -o StrictHostKeyChecking=no mobydick@194.87.252.101",
    timeout=60, encoding="utf-8", maxread=20000
)
child.expect("Enter passphrase for key", timeout=15)
child.sendline(passphrase)
child.expect("\\$", timeout=15)

child.sendline("sudo kubectl rollout restart deployment/bookport -n bookport")
child.expect("restarted", timeout=15)
print("RESTARTED")

child.sendline("sudo kubectl rollout status deployment/bookport -n bookport")
child.expect("successfully rolled out", timeout=300)
print("ROLLED OUT")

child.sendline("exit")
