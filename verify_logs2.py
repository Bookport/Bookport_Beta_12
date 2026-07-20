import pexpect
passphrase = "100partizan100"
child = pexpect.spawn(
    "ssh -o StrictHostKeyChecking=no mobydick@194.87.252.101",
    timeout=60, encoding="utf-8", maxread=20000
)
child.expect("Enter passphrase for key", timeout=10)
child.sendline(passphrase)
child.expect("\\$", timeout=10)

child.sendline('POD=$(sudo kubectl get pods -n bookport -l app=bookport -o jsonpath="{.items[?(@.status.phase==\'Running\')].metadata.name}" | awk \'{print $1}\')')
child.expect("\\$", timeout=10)
child.sendline('sudo kubectl logs -n bookport $POD | grep Cache')
child.expect("\\$", timeout=60)
print("LOGS:\n", child.before)
child.sendline('exit')
