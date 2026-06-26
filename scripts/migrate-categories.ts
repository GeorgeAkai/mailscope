import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const NEW_CATEGORIES = [
  {
    name: "Important",
    description:
      "Interview invites, job offers, security alerts, 2FA codes, subscription receipts, shopping orders, assignment deadlines, bank alerts, document submissions",
    priority: 0,
  },
  {
    name: "Benign",
    description:
      "Job application acknowledgements, generic account activity, software update notices, newsletters you signed up for",
    priority: 1,
  },
  {
    name: "SPAM",
    description:
      "Unsolicited promotions, mass marketing, cold outreach, lottery and prize notifications, unwanted bulk mail",
    priority: 2,
  },
  {
    name: "Suspicious",
    description:
      "Potential phishing, urgent credential or money requests, sender domain mismatch, suspicious urgency, requests to verify accounts via unknown links",
    priority: 3,
  },
];

async function main() {
  const users = await prisma.user.findMany({
    where: { onboarded: true },
    select: { id: true, email: true },
  });

  console.log(`Migrating ${users.length} user(s)…`);

  for (const user of users) {
    console.log(`\nUser: ${user.email}`);

    // Remove old categories (emails' categoryId goes null via SetNull)
    const deleted = await prisma.category.deleteMany({
      where: { userId: user.id },
    });
    console.log(`  Deleted ${deleted.count} old categories`);

    // Create new categories
    await prisma.category.createMany({
      data: NEW_CATEGORIES.map((c) => ({ ...c, userId: user.id })),
    });
    console.log(`  Created ${NEW_CATEGORIES.length} new categories`);
  }

  console.log("\nDone. Run a sync to re-triage emails with the new categories.");
}

main()
  .catch(console.error)
  .finally(() => pool.end());
