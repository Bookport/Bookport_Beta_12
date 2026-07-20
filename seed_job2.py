import pexpect

passphrase = "100partizan100"
cmd = """cat << 'INNER' | sudo kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: seed-job
  namespace: bookport
spec:
  restartPolicy: Never
  containers:
  - name: seed
    image: vsedelovede/bookport:latest
    command: ["npx", "tsx", "prisma/seed.ts"]
    resources:
      limits:
        memory: "2Gi"
        cpu: "1000m"
    env:
    - name: DATABASE_URL
      value: "postgresql://bookport:bookport_password@postgres.db.svc.cluster.local:5432/bookport_db?schema=public"
INNER
"""

child = pexpect.spawn(
    "ssh -o StrictHostKeyChecking=no mobydick@194.87.252.101",
    timeout=60, encoding="utf-8", maxread=10000
)
idx = child.expect("Enter passphrase for key", timeout=10)
child.sendline(passphrase)
child.expect("\\$", timeout=10)

child.sendline(cmd)
child.expect("\\$", timeout=10)
print("APPLY:\n", child.before)

child.sendline('sudo kubectl logs -n bookport seed-job -f')
child.expect("\\$", timeout=300)
print("LOGS:\n", child.before)

child.sendline('exit')
