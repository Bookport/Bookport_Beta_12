import pexpect

passphrase = "100partizan100"
cmd = """cat << 'INNER' | sudo kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: usda-seeder
  namespace: bookport
spec:
  restartPolicy: Never
  containers:
  - name: seed
    image: vsedelovede/bookport:latest
    command: ["sh", "-c", "export NODE_OPTIONS='--max-old-space-size=1536' && npx tsx prisma/seed.ts"]
    resources:
      limits:
        memory: "2Gi"
        cpu: "1000m"
    env:
    - name: DATABASE_URL
      value: "postgresql://bookport:bookport_db_password_2026@postgres.db.svc.cluster.local:5432/bookport_db"
INNER
"""

child = pexpect.spawn(
    "ssh -o StrictHostKeyChecking=no mobydick@194.87.252.101",
    timeout=60, encoding="utf-8", maxread=20000
)
child.expect("Enter passphrase for key", timeout=10)
child.sendline(passphrase)
child.expect("\\$", timeout=10)

child.sendline("sudo kubectl delete pod usda-seeder -n bookport --ignore-not-found=true")
child.expect("\\$", timeout=60)

child.sendline(cmd)
child.expect("\\$", timeout=10)

child.sendline('sudo kubectl wait --for=condition=ready pod/usda-seeder -n bookport --timeout=60s')
child.expect("\\$", timeout=120)

child.sendline('sudo kubectl logs -f pod/usda-seeder -n bookport')
child.expect("\\$", timeout=300)
print("LOGS:\n", child.before)
child.sendline('exit')
