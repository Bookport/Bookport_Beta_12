import pexpect

passphrase = "100partizan100"
cmd = """sudo kubectl run seed-job -n bookport --image=vsedelovede/bookport:latest --limits=memory=2Gi --restart=Never --command -- npx tsx prisma/seed.ts"""

child = pexpect.spawn(
    "ssh -o StrictHostKeyChecking=no mobydick@194.87.252.101 " + f'"{cmd}"',
    timeout=60, encoding="utf-8", maxread=10000
)
idx = child.expect(["Enter passphrase for key", pexpect.EOF], timeout=60)
if idx == 0:
    child.sendline(passphrase)
    child.expect(pexpect.EOF, timeout=60)

print("JOB:\n", child.before)
