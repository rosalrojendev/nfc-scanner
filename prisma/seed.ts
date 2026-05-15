// CLI seed. Run with: npm run db:seed

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { seedAll } from "../lib/db-seed";

const connectionString =
  process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "Set DATABASE_URL (or DIRECT_DATABASE_URL) in .env before seeding.",
  );
}

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString }),
});

seedAll(prisma)
  .then((counts) => {
    console.log(
      `Seeded ${counts.users} users, ${counts.clients} clients, ${counts.projects} projects, ${counts.anchors} anchors, ${counts.inspections} inspections, ${counts.drawings} drawings.`,
    );
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
