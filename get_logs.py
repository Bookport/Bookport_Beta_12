import pexpect
passphrase = "100partizan100"
child = pexpect.spawn(
    "ssh -o StrictHostKeyChecking=no mobydick@194.87.252.101 "
    '"sudo kubectl logs -n bookport -l app=bookport --tail=200"',
    timeout=60, encoding="utf-8", maxread=20000
)

idx = child.expect(["Enter passphrase for key", pexpect.EOF], timeout=60)
if idx == 0:
    child.sendline(passphrase)
    child.expect(pexpect.EOF, timeout=60)

print("LOGS:\n", child.before)
