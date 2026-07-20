import pexpect

passphrase = "100partizan100"
child = pexpect.spawn(
    "ssh -o StrictHostKeyChecking=no mobydick@194.87.252.101 "
    '"sudo kubectl logs -n bookport seed-job -f"',
    timeout=300, encoding="utf-8", maxread=20000
)
idx = child.expect(["Enter passphrase for key", pexpect.EOF], timeout=10)
if idx == 0:
    child.sendline(passphrase)
    child.expect(pexpect.EOF, timeout=300)

print("LOGS:\n", child.before)
