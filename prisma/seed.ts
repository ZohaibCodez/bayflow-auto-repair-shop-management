/**
 * BayFlow seed — creates demo data so judges can test the full flow instantly.
 * Run with: pnpm db:seed   (after pnpm db:migrate)
 *
 * Idempotent: users are upserted by email, so re-running is safe.
 * All demo accounts share the password below (dev only — listed in the README).
 */
import { PrismaClient, StaffRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "password123";

const WORKING_HOURS = {
  mon: { open: "09:00", close: "18:00" },
  tue: { open: "09:00", close: "18:00" },
  wed: { open: "09:00", close: "18:00" },
  thu: { open: "09:00", close: "18:00" },
  fri: { open: "09:00", close: "18:00" },
  sat: { open: "10:00", close: "16:00" },
  sun: null,
};

async function upsertUser(email: string, name: string, hash: string, phone?: string) {
  return prisma.user.upsert({
    where: { email },
    update: { name, phone },
    create: { email, name, passwordHash: hash, phone },
  });
}

type StaffSpec = { role: StaffRole; email: string; name: string };

async function createShop(
  ownerId: string,
  shop: { name: string; address: string; city: string; phone: string; slug: string },
  staff: StaffSpec[],
  hash: string,
) {
  const created = await prisma.shop.create({
    data: {
      name: shop.name,
      address: shop.address,
      city: shop.city,
      phone: shop.phone,
      workingHours: WORKING_HOURS,
      slotDurationMin: 60,
      slotCapacity: 2,
      ownerId,
    },
  });

  // Team
  for (const s of staff) {
    const u = await upsertUser(s.email, s.name, hash);
    await prisma.membership.upsert({
      where: { userId_shopId_role: { userId: u.id, shopId: created.id, role: s.role } },
      update: { active: true },
      create: { userId: u.id, shopId: created.id, role: s.role },
    });
  }

  // Service catalog
  await prisma.service.createMany({
    data: [
      { shopId: created.id, name: "Oil change", description: "Engine oil + filter", durationMin: 45, basePrice: 5000 },
      { shopId: created.id, name: "Brake inspection", description: "Pads, discs, fluid", durationMin: 60, basePrice: 3000 },
      { shopId: created.id, name: "Check engine light", description: "Diagnostic scan", durationMin: 60, basePrice: 2500 },
      { shopId: created.id, name: "Tire rotation", description: "Rotate + balance", durationMin: 45, basePrice: 2000 },
    ],
  });

  // Inventory
  await prisma.inventoryItem.createMany({
    data: [
      { shopId: created.id, sku: "OIL-4L", name: "Engine oil 4L", qtyOnHand: 20, reorderLevel: 5, unitCost: 5200 },
      { shopId: created.id, sku: "FILT-OIL", name: "Oil filter", qtyOnHand: 15, reorderLevel: 4, unitCost: 900 },
      { shopId: created.id, sku: "COIL-IGN", name: "Ignition coil", qtyOnHand: 0, reorderLevel: 2, unitCost: 6500 },
      { shopId: created.id, sku: "BRK-PAD", name: "Brake pad set", qtyOnHand: 8, reorderLevel: 3, unitCost: 4500 },
    ],
  });

  // Slots: next 7 days, hourly 09:00–16:00
  const slots: { shopId: string; startsAt: Date; capacity: number }[] = [];
  const now = new Date();
  for (let d = 1; d <= 7; d++) {
    for (let h = 9; h <= 16; h++) {
      const day = new Date(now);
      day.setDate(now.getDate() + d);
      day.setHours(h, 0, 0, 0);
      slots.push({ shopId: created.id, startsAt: day, capacity: 2 });
    }
  }
  await prisma.slot.createMany({ data: slots, skipDuplicates: true });

  return created;
}

async function main() {
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // Owner (runs multiple shops)
  const owner = await upsertUser("owner@bayflow.test", "Fatima Raza", hash, "+92-300-0000000");

  const shopDefs = [
    {
      shop: { name: "Lahore Auto Care", address: "12 Mall Road", city: "Lahore", phone: "+92-42-111", slug: "lahore" },
      staff: [
        { role: StaffRole.SERVICE_ADVISOR, email: "sa.lahore@bayflow.test", name: "Bilal (SA)" },
        { role: StaffRole.TECHNICIAN, email: "tech.lahore@bayflow.test", name: "Imran (Tech)" },
        { role: StaffRole.QC, email: "qc.lahore@bayflow.test", name: "Sara (QC)" },
        { role: StaffRole.PARTS, email: "parts.lahore@bayflow.test", name: "Usman (Parts)" },
      ],
    },
    {
      shop: { name: "Karachi Motor Works", address: "5 Shahrah-e-Faisal", city: "Karachi", phone: "+92-21-222", slug: "karachi" },
      staff: [
        { role: StaffRole.SERVICE_ADVISOR, email: "sa.karachi@bayflow.test", name: "Ayesha (SA)" },
        { role: StaffRole.TECHNICIAN, email: "tech.karachi@bayflow.test", name: "Kamran (Tech)" },
        { role: StaffRole.QC, email: "qc.karachi@bayflow.test", name: "Hina (QC)" },
        { role: StaffRole.PARTS, email: "parts.karachi@bayflow.test", name: "Tariq (Parts)" },
      ],
    },
    {
      shop: { name: "Islamabad Service Hub", address: "8 Jinnah Ave", city: "Islamabad", phone: "+92-51-333", slug: "islamabad" },
      staff: [
        { role: StaffRole.SERVICE_ADVISOR, email: "sa.isb@bayflow.test", name: "Zain (SA)" },
        { role: StaffRole.TECHNICIAN, email: "tech.isb@bayflow.test", name: "Omar (Tech)" },
        { role: StaffRole.QC, email: "qc.isb@bayflow.test", name: "Nadia (QC)" },
        { role: StaffRole.PARTS, email: "parts.isb@bayflow.test", name: "Faisal (Parts)" },
      ],
    },
  ];

  for (const def of shopDefs) {
    const shop = await createShop(owner.id, def.shop, def.staff, hash);
    console.log(`  ✓ shop: ${shop.name} (${shop.city})`);
  }

  // Demo customer + vehicle
  const customer = await upsertUser("customer@bayflow.test", "Ahmed Khan", hash, "+92-301-1234567");
  const existingVehicle = await prisma.vehicle.findFirst({ where: { customerId: customer.id, plate: "LEA-1234" } });
  if (!existingVehicle) {
    await prisma.vehicle.create({
      data: { customerId: customer.id, plate: "LEA-1234", make: "Honda", model: "Civic", year: 2016, color: "White" },
    });
  }

  console.log("\n✅ Seed complete. Demo password for all accounts: " + DEMO_PASSWORD);
  console.log("   Owner: owner@bayflow.test | Customer: customer@bayflow.test");
  console.log("   Staff (Lahore): sa.lahore@ / tech.lahore@ / qc.lahore@ / parts.lahore@ bayflow.test");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
