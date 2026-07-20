import pexpect

passphrase = "100partizan100"
child = pexpect.spawn(
    "ssh -o StrictHostKeyChecking=no mobydick@194.87.252.101 "
    '"sudo kubectl rollout restart deployment/bookport -n bookport && sudo kubectl rollout status deployment/bookport -n bookport"',
    timeout=300, encoding="utf-8", maxread=10000
)

idx = child.expect(["Enter passphrase for key", pexpect.EOF], timeout=300)
if idx == 0:
    child.sendline(passphrase)
    child.expect(pexpect.EOF, timeout=300)

output = child.before or ""
print("OUTPUT:", output)
