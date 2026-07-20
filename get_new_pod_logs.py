import pexpect
passphrase = "100partizan100"
child = pexpect.spawn(
    "ssh -o StrictHostKeyChecking=no mobydick@194.87.252.101",
    timeout=60, encoding="utf-8", maxread=20000
)
child.expect("Enter passphrase for key", timeout=15)
child.sendline(passphrase)
child.expect("\\$", timeout=15)

child.sendline('sudo kubectl logs -n bookport pod/bookport-798d7dd8c7-d487t --tail=100')
child.expect("\\$", timeout=30)
print("LOGS:\n", child.before)
child.sendline("exit")
