import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { DEFAULT_CATEGORIES } from "../src/lib/defaults";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const users = await prisma.user.findMany({
    where: { onboarded: true },
    select: { id: true, email: true },
  });

  console.log(`Migrating ${users.length} user(s)…`);

  for (const user of users) {
    console.log(`\nUser: ${user.email}`);

    const deleted = await prisma.category.deleteMany({ where: { userId: user.id } });
    console.log(`  Deleted ${deleted.count} old categories`);

    await prisma.category.createMany({
      data: DEFAULT_CATEGORIES.map((c) => ({
        userId: user.id,
        name: c.name,
        description: c.description,
        priority: c.priority,
      })),
    });
    console.log(`  Created ${DEFAULT_CATEGORIES.length} categories: ${DEFAULT_CATEGORIES.map((c) => c.name).join(", ")}`);
  }

  console.log("\nDone. Run a sync to re-triage emails with the new categories.");
}

main()
  .catch(console.error)
  .finally(() => pool.end());
