import { execSync } from "child_process";

try {
  console.log("Staging final cleanup...");
  execSync("git add .", { stdio: "inherit" });

  console.log("Committing cleanup change...");
  execSync('git commit -m "chore: remove git-push temporary script"', { stdio: 'inherit' });

  console.log("Pushing cleanup to remote main branch...");
  execSync("git push origin main", { stdio: "inherit" });

  console.log("Cleanup pushed successfully!");
} catch (error) {
  console.error("Cleanup push failed:", error);
  process.exit(1);
}
