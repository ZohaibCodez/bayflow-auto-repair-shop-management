/**
 * Reset the database to exactly the canonical demo set (task H-1).
 *
 * Run this whenever the demo data has drifted — after a manual QA pass, after the
 * Playwright suite (which runs against this same database), or before a judging
 * session. It deletes everything that is *not* canonical; `pnpm db:seed` then
 * rebuilds the five shops and their demo bookings. Together:
 *
 *   pnpm db:clean        # dry run — prints exactly what would go, deletes nothing
 *   pnpm db:demo         # clean --yes && db:seed  (the one-command reset)
 *
 * Two kinds of junk accumulate:
 *   1. Shops from an older, non-idempotent seed — duplicates of Lahore / Karachi /
 *      Islamabad carrying random cuids instead of the stable `shop_*` ids. These are
 *      publicly visible, and right now there is more than one "Lahore Auto Care",
 *      the very shop the brief's worked example names.
 *   2. Shops and users invented by the E2E suite ("E2E Motors …", "Second Garage …")
 *      and any accounts created by hand while testing the booking wizard.
 *
 * WHAT GETS DELETED: every shop whose id is not in SEED_SHOP_IDS, and every user
 * whose email is not in the canonical list below. That includes shops you created
 * yourself through /pos/new and customers you registered through the wizard — which
 * is the point of a reset, but it is not reversible, so the dry run is the default.
 *
 * Every Shop relation is `onDelete: Cascade`, so removing a shop also removes its
 * memberships, services, slots, inventory, bookings, estimates, POs and call logs.
 */
import { prisma } from "../src/lib/db";

/** The stable shop ids the seed owns. Keep in step with SHOPS in seed.ts. */
const SEED_SHOP_IDS = [
  "shop_lahore",
  "shop_karachi",
  "shop_islamabad",
  "shop_rawalpindi",
  "shop_faisalabad",
] as const;

/** Shop slugs and role prefixes, mirroring seed.ts, so staff emails are derived not guessed. */
const SHOP_SLUGS = ["lahore", "karachi", "isb", "pindi", "fsd"] as const;
const ROLE_PREFIXES = ["sa", "tech", "qc", "parts"] as const;

/** Every account the seed creates. Anything else is test residue. */
const CANONICAL_EMAILS: string[] = [
  "owner@bayflow.test",
  "owner2@bayflow.test",
  "customer@bayflow.test",
  "sana@bayflow.test",
  "ali@bayflow.test",
  "qc2.lahore@bayflow.test", // the second inspector, for the QC first-to-pick lock
  ...SHOP_SLUGS.flatMap((slug) => ROLE_PREFIXES.map((p) => `${p}.${slug}@bayflow.test`)),
];

const apply = process.argv.includes("--yes");

async function main() {
  const doomedShops = await prisma.shop.findMany({
    where: { id: { notIn: [...SEED_SHOP_IDS] } },
    select: {
      id: true,
      name: true,
      city: true,
      _count: { select: { bookings: true, memberships: true } },
    },
    orderBy: [{ name: "asc" }],
  });

  const doomedUsers = await prisma.user.findMany({
    where: { email: { notIn: CANONICAL_EMAILS } },
    select: { id: true, email: true, name: true },
    orderBy: { email: "asc" },
  });

  console.log(`\n── Shops to delete (${doomedShops.length}) ───────────────────────────────`);
  for (const s of doomedShops) {
    console.log(
      `  ${s.name.slice(0, 30).padEnd(32)} ${s.city.padEnd(12)} bookings=${String(s._count.bookings).padEnd(3)} team=${s._count.memberships}`,
    );
  }
  if (!doomedShops.length) console.log("  (none — already clean)");

  console.log(`\n── Users to delete (${doomedUsers.length}) ───────────────────────────────`);
  for (const u of doomedUsers) console.log(`  ${u.email.slice(0, 38).padEnd(40)} ${u.name}`);
  if (!doomedUsers.length) console.log("  (none — already clean)");

  const keptShops = await prisma.shop.findMany({
    where: { id: { in: [...SEED_SHOP_IDS] } },
    select: { id: true, name: true },
    orderBy: [{ name: "asc" }],
  });
  const keptUsers = await prisma.user.count({ where: { email: { in: CANONICAL_EMAILS } } });

  console.log(`\n── Will remain ──────────────────────────────────────────────`);
  console.log(`  shops: ${keptShops.length} of ${SEED_SHOP_IDS.length} canonical`);
  for (const s of keptShops) console.log(`    ${s.id.padEnd(20)} ${s.name}`);
  const missing = SEED_SHOP_IDS.filter((id) => !keptShops.some((k) => k.id === id));
  if (missing.length) console.log(`    missing: ${missing.join(", ")}  → db:seed creates these`);
  console.log(`  users: ${keptUsers} of ${CANONICAL_EMAILS.length} canonical`);

  if (!apply) {
    console.log("\nDry run — nothing was deleted. Apply with:  pnpm db:demo\n");
    return;
  }

  const shops = await prisma.shop.deleteMany({ where: { id: { notIn: [...SEED_SHOP_IDS] } } });
  const users = await prisma.user.deleteMany({ where: { email: { notIn: CANONICAL_EMAILS } } });
  console.log(`\nDeleted ${shops.count} shops and ${users.count} users.`);
  console.log("Next:  pnpm db:seed\n");
}

main()
  .catch((e) => {
    console.error("clean-demo failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
