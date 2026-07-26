const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { telegramId: "dev-telegram-id" },
    update: {},
    create: {
      id: "dev-user-00000000-0000-0000-0000-000000000000",
      telegramId: "dev-telegram-id",
      telegramName: "Local Dev User",
      accessExpiresAt: new Date("2099-01-01"),
    },
  });
  console.log("Dev user seeded:", user.id, user.telegramId);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
