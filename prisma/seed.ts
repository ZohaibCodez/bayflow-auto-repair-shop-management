/**
 * BayFlow seed — demo data so judges can test the full flow instantly.
 *   pnpm db:seed        (after pnpm db:migrate / db:deploy)
 *
 * Idempotent, and doubles as "reset demo": shops/users/services/inventory are upserted by
 * stable keys, and the demo bookings of the seeded shops are wiped and re-created. Shops
 * that users created themselves are never touched.
 *
 * Demo bookings are driven through the REAL workflow services (the same code the app runs),
 * so every booking has a genuine audit trail, estimates, reservations and notifications.
 */
import bcrypt from "bcryptjs";
import type { StaffRole } from "@prisma/client";
import { prisma } from "../src/lib/db";
import { DEFAULT_WORKING_HOURS } from "../src/lib/slots";
import { addDaysToKey, dayKeyOf, shopDateKey, shopTime } from "../src/lib/time";
import { loadActor } from "../src/server/services/common";
import { createBooking } from "../src/server/services/bookings";
import * as wf from "../src/server/services/workflow";
import * as parts from "../src/server/services/parts";

const DEMO_PASSWORD = "password123";

type ShopDef = {
  id: string;
  slug: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  description: string;
  rating: number;
  owner: "fatima" | "hamza";
  staff: Record<StaffRole, string>; // role -> display name
};

const SHOPS: ShopDef[] = [
  {
    id: "shop_lahore",
    slug: "lahore",
    name: "Lahore Auto Care",
    address: "12 Mall Road, Gulberg",
    city: "Lahore",
    phone: "+92 42 111 222 333",
    description: "Family-run since 1998. Japanese and Korean specialists, same-day diagnostics.",
    rating: 4.8,
    owner: "fatima",
    staff: { SERVICE_ADVISOR: "Bilal Ahmed", TECHNICIAN: "Imran Malik", QC: "Sara Javed", PARTS: "Usman Tariq" },
  },
  {
    id: "shop_karachi",
    slug: "karachi",
    name: "Karachi Motor Works",
    address: "5 Shahrah-e-Faisal, PECHS",
    city: "Karachi",
    phone: "+92 21 333 444 555",
    description: "Full-service workshop with a dedicated AC and electrical bay.",
    rating: 4.6,
    owner: "fatima",
    staff: { SERVICE_ADVISOR: "Ayesha Siddiqui", TECHNICIAN: "Kamran Ali", QC: "Hina Shah", PARTS: "Tariq Mehmood" },
  },
  {
    id: "shop_islamabad",
    slug: "isb",
    name: "Islamabad Service Hub",
    address: "8 Jinnah Avenue, Blue Area",
    city: "Islamabad",
    phone: "+92 51 444 555 666",
    description: "Dealer-trained technicians, genuine parts, and a proper road-test after every job.",
    rating: 4.7,
    owner: "fatima",
    staff: { SERVICE_ADVISOR: "Zain Abbas", TECHNICIAN: "Omar Farooq", QC: "Nadia Hussain", PARTS: "Faisal Iqbal" },
  },
  {
    id: "shop_rawalpindi",
    slug: "pindi",
    name: "Rawalpindi Tyre & Tune",
    address: "21 Murree Road, Saddar",
    city: "Rawalpindi",
    phone: "+92 51 555 777 888",
    description: "Tyres, alignment and tune-ups while you wait.",
    rating: 4.5,
    owner: "hamza",
    staff: { SERVICE_ADVISOR: "Asad Mirza", TECHNICIAN: "Waqas Butt", QC: "Mehwish Raza", PARTS: "Danish Khan" },
  },
  {
    id: "shop_faisalabad",
    slug: "fsd",
    name: "Faisalabad Car Clinic",
    address: "3 Susan Road, Madina Town",
    city: "Faisalabad",
    phone: "+92 41 222 999 000",
    description: "Engine, gearbox and suspension work with transparent itemised estimates.",
    rating: 4.4,
    owner: "hamza",
    staff: { SERVICE_ADVISOR: "Hira Naveed", TECHNICIAN: "Shahid Akram", QC: "Rabia Anwar", PARTS: "Naveed Aslam" },
  },
];

/** Cover photo per seeded shop (public/images/shops/*.webp — optional, see docs/IMAGE-PROMPTS.md). */
const COVER: Record<string, string> = {
  lahore: "lahore",
  karachi: "karachi",
  isb: "islamabad",
  pindi: "rawalpindi",
  fsd: "faisalabad",
};

const ROLE_PREFIX: Record<StaffRole, string> = {
  SERVICE_ADVISOR: "sa",
  TECHNICIAN: "tech",
  QC: "qc",
  PARTS: "parts",
};

const SERVICES = [
  { key: "oil", name: "Oil change", description: "Engine oil and filter replacement", durationMin: 45, basePrice: 5000 },
  { key: "brakes", name: "Brake inspection", description: "Pads, discs and fluid check", durationMin: 60, basePrice: 3000 },
  { key: "cel", name: "Check engine light", description: "OBD diagnostic scan and report", durationMin: 60, basePrice: 2500 },
  { key: "tires", name: "Tire rotation", description: "Rotate, balance and pressure check", durationMin: 45, basePrice: 2000 },
  { key: "ac", name: "AC service", description: "Gas top-up, leak test and cabin filter", durationMin: 90, basePrice: 6500 },
  { key: "general", name: "General inspection", description: "Not sure what's wrong? We'll find it", durationMin: 60, basePrice: 1500 },
];

const INVENTORY = [
  { sku: "OIL-4L", name: "Engine oil 5W-30 (4L)", qtyOnHand: 20, reorderLevel: 5, unitCost: 5200 },
  { sku: "FILT-OIL", name: "Oil filter", qtyOnHand: 15, reorderLevel: 4, unitCost: 900 },
  { sku: "COIL-IGN", name: "Ignition coil", qtyOnHand: 0, reorderLevel: 2, unitCost: 6500 },
  { sku: "BRK-PAD", name: "Brake pad set (front)", qtyOnHand: 8, reorderLevel: 3, unitCost: 4500 },
  { sku: "PLUG-IR", name: "Spark plug (iridium)", qtyOnHand: 24, reorderLevel: 8, unitCost: 1200 },
  { sku: "FILT-AIR", name: "Air filter", qtyOnHand: 3, reorderLevel: 4, unitCost: 1400 },
  { sku: "FILT-CAB", name: "Cabin filter", qtyOnHand: 6, reorderLevel: 3, unitCost: 1100 },
  { sku: "BRK-FLD", name: "Brake fluid DOT4 (1L)", qtyOnHand: 10, reorderLevel: 4, unitCost: 1800 },
  { sku: "WIPER", name: "Wiper blade pair", qtyOnHand: 5, reorderLevel: 2, unitCost: 2200 },
  { sku: "BATT-55", name: "Battery 55Ah", qtyOnHand: 2, reorderLevel: 2, unitCost: 18500 },
];

async function upsertUser(email: string, name: string, hash: string, phone?: string) {
  return prisma.user.upsert({
    where: { email },
    update: { name, phone: phone ?? null, passwordHash: hash },
    create: { email, name, passwordHash: hash, phone },
    select: { id: true },
  });
}

/** Next open business day (shop time), `offset` open days ahead of today. */
function openDay(offset: number) {
  let key = shopDateKey();
  let found = 0;
  while (true) {
    key = addDaysToKey(key, 1);
    if (DEFAULT_WORKING_HOURS[dayKeyOf(key)]) found++;
    if (found > offset) return key;
  }
}
const at = (day: string, hhmm: string) => shopTime(day, hhmm).toISOString();

async function main() {
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // --- Owners & customers -------------------------------------------------
  const fatima = await upsertUser("owner@bayflow.test", "Fatima Raza", hash, "+92 300 0000000");
  const hamza = await upsertUser("owner2@bayflow.test", "Hamza Sheikh", hash, "+92 300 1111111");
  const ahmed = await upsertUser("customer@bayflow.test", "Ahmed Khan", hash, "+92 301 1234567");
  const sana = await upsertUser("sana@bayflow.test", "Sana Iqbal", hash, "+92 302 7654321");
  const ali = await upsertUser("ali@bayflow.test", "Ali Raza", hash, "+92 303 5550000");
  const owners = { fatima: fatima.id, hamza: hamza.id };

  // --- Resolve the seeded shops (adopt an existing shop with the same owner + name) --
  const shopIdOf: Record<string, string> = {};
  for (const def of SHOPS) {
    const found = await prisma.shop.findFirst({
      where: { OR: [{ id: def.id }, { ownerId: owners[def.owner], name: def.name }] },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    shopIdOf[def.id] = found?.id ?? def.id;
  }

  // --- Reset previous demo activity of the seeded shops ----------------------
  const ids = Object.values(shopIdOf);
  await prisma.notification.deleteMany({ where: { booking: { shopId: { in: ids } } } });
  await prisma.stockMovement.deleteMany({ where: { shopId: { in: ids } } });
  await prisma.purchaseOrder.deleteMany({ where: { shopId: { in: ids } } });
  await prisma.booking.deleteMany({ where: { shopId: { in: ids } } });
  await prisma.slot.updateMany({ where: { shopId: { in: ids } }, data: { bookedCount: 0 } });
  // Seeded people start with an empty bell.
  const seededEmails = [
    "owner@bayflow.test",
    "owner2@bayflow.test",
    "customer@bayflow.test",
    "sana@bayflow.test",
    "ali@bayflow.test",
    "qc2.lahore@bayflow.test",
    ...SHOPS.flatMap((s) => Object.values(ROLE_PREFIX).map((p) => `${p}.${s.slug}@bayflow.test`)),
  ];
  await prisma.notification.deleteMany({ where: { user: { email: { in: seededEmails } } } });

  // --- Shops, teams, services, inventory -------------------------------------
  const staffIds: Record<string, Record<StaffRole, string>> = {};
  const serviceIdOf: Record<string, Record<string, string>> = {};
  for (const def of SHOPS) {
    const shopId = shopIdOf[def.id];
    const shopData = {
      name: def.name,
      address: def.address,
      city: def.city,
      phone: def.phone,
      description: def.description,
      rating: def.rating,
      coverImage: `/images/shops/${COVER[def.slug]}.webp`,
      workingHours: DEFAULT_WORKING_HOURS,
      slotDurationMin: 60,
      slotCapacity: 2,
      ownerId: owners[def.owner],
    };
    await prisma.shop.upsert({ where: { id: shopId }, update: shopData, create: { id: shopId, ...shopData } });

    staffIds[def.id] = {} as Record<StaffRole, string>;
    for (const role of Object.keys(def.staff) as StaffRole[]) {
      const u = await upsertUser(`${ROLE_PREFIX[role]}.${def.slug}@bayflow.test`, def.staff[role], hash);
      staffIds[def.id][role] = u.id;
      await prisma.membership.upsert({
        where: { userId_shopId_role: { userId: u.id, shopId, role } },
        update: { active: true },
        create: { userId: u.id, shopId, role },
      });
    }

    // Services are matched by name within the shop (no unique key on name).
    serviceIdOf[def.id] = {};
    for (const s of SERVICES) {
      const { key, ...data } = s;
      const found = await prisma.service.findFirst({ where: { shopId, name: s.name }, select: { id: true } });
      const svc = found
        ? await prisma.service.update({ where: { id: found.id }, data: { ...data, active: true } })
        : await prisma.service.create({ data: { ...data, shopId } });
      serviceIdOf[def.id][key] = svc.id;
    }

    for (const item of INVENTORY) {
      await prisma.inventoryItem.upsert({
        where: { shopId_sku: { shopId, sku: item.sku } },
        update: item,
        create: { ...item, shopId },
      });
    }
    console.log(`  ✓ ${def.name} (${def.city})`);
  }

  // Lahore runs two QC inspectors — the shared queue's "first to pick locks it" matters.
  const qc2 = await upsertUser("qc2.lahore@bayflow.test", "Maryam Saeed", hash);
  await prisma.membership.upsert({
    where: { userId_shopId_role: { userId: qc2.id, shopId: shopIdOf["shop_lahore"], role: "QC" } },
    update: { active: true },
    create: { userId: qc2.id, shopId: shopIdOf["shop_lahore"], role: "QC" },
  });

  // --- Demo bookings at Lahore Auto Care, walked through the real workflow --
  const L = shopIdOf["shop_lahore"];
  const team = staffIds["shop_lahore"];
  const [sa, tech, qc, partsP] = await Promise.all([
    loadActor(team.SERVICE_ADVISOR, L),
    loadActor(team.TECHNICIAN, L),
    loadActor(team.QC, L),
    loadActor(team.PARTS, L),
  ]);
  const actorOf = (userId: string) => loadActor(userId, L);
  const inv = Object.fromEntries(
    (await prisma.inventoryItem.findMany({ where: { shopId: L }, select: { id: true, sku: true } })).map(
      (i) => [i.sku, i.id],
    ),
  );
  const d1 = openDay(0);
  const d2 = openDay(1);

  const book = async (
    customerId: string,
    services: string[],
    problems: string,
    startsAt: string,
    vehicle: { plate: string; make: string; model: string; year: number; color?: string; mileage?: number },
  ) =>
    createBooking({
      shopId: L,
      serviceIds: services.map((k) => serviceIdOf["shop_lahore"][k]),
      problems,
      startsAt,
      customer: { kind: "session", userId: customerId },
      vehicle: { kind: "new", ...vehicle },
    });

  // 1) The worked example (brief §6), parked at AWAITING_CUSTOMER: Ahmed logs in and sees
  //    the estimate. The ignition coil is out of stock, so approving it exercises the PO flow.
  const civic = await book(
    ahmed.id,
    ["cel", "oil"],
    "Light came on yesterday, car vibrates at idle.",
    at(d1, "10:00"),
    { plate: "LEA-1234", make: "Honda", model: "Civic", year: 2016, color: "White", mileage: 98000 },
  );
  const civicRef = { shopId: L, bookingId: civic.id };
  await wf.confirmBooking(sa, { ...civicRef, technicianId: team.TECHNICIAN });
  await wf.startInspection(tech, civicRef);
  await wf.submitEstimate(tech, {
    ...civicRef,
    items: [
      { kind: "PART", inventoryItemId: inv["COIL-IGN"], qty: 1, unitCost: 6500 },
      { kind: "PART", inventoryItemId: inv["FILT-OIL"], qty: 1, unitCost: 900 },
      { kind: "PART", inventoryItemId: inv["OIL-4L"], qty: 1, unitCost: 5200 },
      { kind: "LABOR", name: "Diagnosis + coil replacement + oil service", qty: 1, unitCost: 4000 },
    ],
    note: "Faulty ignition coil on cylinder 2. Oil is due as well.",
  });
  // Bilal adjusts labour to 3,500 before sending (revision count goes up).
  await wf.sendEstimate(sa, {
    ...civicRef,
    items: [
      { kind: "PART", inventoryItemId: inv["COIL-IGN"], qty: 1, unitCost: 6500 },
      { kind: "PART", inventoryItemId: inv["FILT-OIL"], qty: 1, unitCost: 900 },
      { kind: "PART", inventoryItemId: inv["OIL-4L"], qty: 1, unitCost: 5200 },
      { kind: "LABOR", name: "Diagnosis + coil replacement + oil service", qty: 1, unitCost: 3500 },
    ],
  });

  // 2) Brand-new booking waiting for the advisor.
  await book(sana.id, ["brakes"], "Squealing when braking, worse in the morning.", at(d1, "11:00"), {
    plate: "LED-4521",
    make: "Toyota",
    model: "Corolla",
    year: 2019,
    color: "Silver",
  });

  // 3) Assigned to Imran, waiting for him to start the inspection.
  const city = await book(ali.id, ["general"], "Rattle from the front left over bumps.", at(d1, "12:00"), {
    plate: "LEB-7781",
    make: "Honda",
    model: "City",
    year: 2018,
    color: "Grey",
  });
  await wf.confirmBooking(sa, { shopId: L, bookingId: city.id, technicianId: team.TECHNICIAN });

  // 4) Brake job in QC — Sara can pick it from the queue (and fail it to show the loop).
  const brakes = await book(sana.id, ["brakes"], "Brake pedal feels soft.", at(d1, "13:00"), {
    plate: "LEC-1209",
    make: "Suzuki",
    model: "Swift",
    year: 2021,
    color: "Red",
  });
  const brakesRef = { shopId: L, bookingId: brakes.id };
  await wf.confirmBooking(sa, { ...brakesRef, technicianId: team.TECHNICIAN });
  await wf.startInspection(tech, brakesRef);
  await wf.submitEstimate(tech, {
    ...brakesRef,
    items: [
      { kind: "PART", inventoryItemId: inv["BRK-PAD"], qty: 1, unitCost: 4500 },
      { kind: "PART", inventoryItemId: inv["BRK-FLD"], qty: 1, unitCost: 1800 },
      { kind: "LABOR", name: "Replace front pads, bleed brakes", qty: 1, unitCost: 2500 },
    ],
  });
  await wf.sendEstimate(sa, brakesRef);
  await wf.respondToEstimate(await actorOf(sana.id), { ...brakesRef, decision: "approve" });
  await wf.assignPartsPerson(sa, { ...brakesRef, partsPersonId: team.PARTS });
  await parts.processPartsRequest(partsP, brakesRef); // in stock → PARTS_READY
  await parts.allocateParts(partsP, brakesRef);
  await wf.sendToQc(tech, { ...brakesRef, note: "Pads replaced, system bled, pedal firm." });

  // 5) Ready for pick-up — Ali can mark it collected, or the SA can complete it.
  const ac = await book(ali.id, ["ac"], "AC blowing warm air.", at(d2, "10:00"), {
    plate: "LEF-3300",
    make: "Kia",
    model: "Sportage",
    year: 2022,
    color: "Black",
  });
  const acRef = { shopId: L, bookingId: ac.id };
  await wf.confirmBooking(sa, { ...acRef, technicianId: team.TECHNICIAN });
  await wf.startInspection(tech, acRef);
  await wf.submitEstimate(tech, {
    ...acRef,
    items: [
      { kind: "PART", inventoryItemId: inv["FILT-CAB"], qty: 1, unitCost: 1100 },
      { kind: "LABOR", name: "AC regas + leak test", qty: 1, unitCost: 5500 },
    ],
  });
  await wf.sendEstimate(sa, acRef);
  await wf.respondToEstimate(await actorOf(ali.id), { ...acRef, decision: "approve" });
  await wf.assignPartsPerson(sa, { ...acRef, partsPersonId: team.PARTS });
  await parts.processPartsRequest(partsP, acRef);
  await parts.allocateParts(partsP, acRef);
  await wf.sendToQc(tech, acRef);
  await wf.claimQc(qc, acRef);
  await wf.passQc(qc, { ...acRef, note: "Vent temp 6°C, no leaks." });

  // A Karachi booking — Lahore staff must NOT be able to see it (tenant isolation demo).
  await createBooking({
    shopId: shopIdOf["shop_karachi"],
    serviceIds: [serviceIdOf["shop_karachi"].oil],
    problems: "Routine service.",
    startsAt: at(d1, "10:00"),
    customer: { kind: "session", userId: ahmed.id },
    vehicle: { kind: "existing", vehicleId: (await prisma.vehicle.findFirstOrThrow({ where: { customerId: ahmed.id, plate: "LEA-1234" } })).id },
  });

  console.log(`\n✅ Seed complete — ${SHOPS.length} shops, 5 Lahore demo bookings + 1 in Karachi.`);
  console.log(`   Password for every demo account: ${DEMO_PASSWORD}`);
  console.log("   Owner: owner@bayflow.test  ·  Customer: customer@bayflow.test");
  console.log("   Lahore staff: sa. / tech. / qc. / parts.lahore@bayflow.test");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
