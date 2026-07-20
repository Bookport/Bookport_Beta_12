import pexpect
passphrase = "100partizan100"
child = pexpect.spawn(
    "ssh -o StrictHostKeyChecking=no mobydick@194.87.252.101",
    timeout=60, encoding="utf-8", maxread=20000
)
idx = child.expect(["Enter passphrase for key", pexpect.EOF], timeout=30)
if idx == 0:
    child.sendline(passphrase)
    child.expect("\\$", timeout=30)

    child.sendline('sudo kubectl rollout restart deployment/bookport -n bookport && sudo kubectl rollout status deployment/bookport -n bookport')
    child.expect("\\$", timeout=120)
    print("ROLLOUT:\n", child.before)

    child.sendline('sudo kubectl delete pod usda-seeder -n bookport')
    child.expect("\\$", timeout=30)
    child.sendline('exit')
