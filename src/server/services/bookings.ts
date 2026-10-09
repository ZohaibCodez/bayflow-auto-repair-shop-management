import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { conflict, invalid, notFound } from "@/lib/errors";
import { isValidSlotStart, slotStartsFor, type WorkingHours } from "@/lib/slots";
import { formatDateTime, formatTime, shopDateKey } from "@/lib/time";
import { advisorIds, newBookingCode, notify, staffHref, type Tx } from "./common";

/** Bookings must be made at least this far ahead of the slot start. */
const LEAD_MINUTES = 30;

export type SlotAvailability = { startsAt: string; label: string; remaining: number };

/** Bookable slots for one shop-local date: generated from working hours, minus full and past ones. */
export async function getAvailability(shopId: string, dateKey: string): Promise<SlotAvailability[]> {
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { workingHours: true, slotDurationMin: true, slotCapacity: true },
  });
  if (!shop) throw notFound("Shop not found.");

  const starts = slotStartsFor(shop.workingHours as WorkingHours, dateKey, shop.slotDurationMin);
  if (!starts.length) return [];

  const taken = await prisma.slot.findMany({
    where: { shopId, startsAt: { in: starts } },
    select: { startsAt: true, bookedCount: true, capacity: true },
  });
  const byTime = new Map(taken.map((s) => [s.startsAt.getTime(), s]));
  const cutoff = Date.now() + LEAD_MINUTES * 60_000;

  return starts
    .filter((s) => s.getTime() > cutoff)
    .map((s) => {
      const row = byTime.get(s.getTime());
      const remaining = row ? row.capacity - row.bookedCount : shop.slotCapacity;
      return { startsAt: s.toISOString(), label: formatTime(s), remaining };
    })
    .filter((s) => s.remaining > 0);
}

/**
 * Reserve one place in a slot. The Slot row is created on first use; the capacity check
 * and increment are a single conditional UPDATE, so concurrent bookings can never push
 * bookedCount past capacity (the database serializes the row update).
 */
export async function claimSlot(tx: Tx, shopId: string, startsAt: Date, capacity: number) {
  // Atomic create-if-missing. (Prisma's upsert is find-then-create, so two first-ever
  // bookings of the same slot would race and one would hit the unique constraint.)
  await tx.$executeRaw`
    INSERT INTO "Slot" ("id", "shopId", "startsAt", "capacity", "bookedCount")
    VALUES (${randomUUID()}, ${shopId}, ${startsAt}, ${capacity}, 0)
    ON CONFLICT ("shopId", "startsAt") DO NOTHING`;
  const slot = await tx.slot.findUniqueOrThrow({
    where: { shopId_startsAt: { shopId, startsAt } },
    select: { id: true },
  });
  const claimed = await tx.$executeRaw`
    UPDATE "Slot" SET "bookedCount" = "bookedCount" + 1
    WHERE "id" = ${slot.id} AND "bookedCount" < "capacity"`;
  if (claimed !== 1) throw conflict("That time slot just filled up — please pick another.");
  return slot.id;
}

export async function releaseSlot(tx: Tx, slotId: string | null) {
  if (!slotId) return;
  await tx.$executeRaw`
    UPDATE "Slot" SET "bookedCount" = "bookedCount" - 1
    WHERE "id" = ${slotId} AND "bookedCount" > 0 AND "startsAt" > NOW()`;
}

const plate = z
  .string()
  .trim()
  .min(2, "Enter the registration number")
  .max(16)
  .transform((s) => s.toUpperCase());

export const createBookingSchema = z.object({
  shopId: z.string().min(1),
  serviceIds: z.array(z.string().min(1)).min(1, "Pick at least one service or problem"),
  problems: z.string().trim().max(2000).default(""),
  startsAt: z.iso.datetime({ message: "Pick a time slot" }),
  customer: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("session"), userId: z.string().min(1) }),
    z.object({
      kind: z.literal("details"),
      name: z.string().trim().min(2, "Enter your name").max(80),
      email: z.email("Enter a valid email").transform((s) => s.toLowerCase()),
      password: z.string().min(8, "Password needs at least 8 characters").max(100),
      phone: z.string().trim().max(30).optional(),
    }),
  ]),
  vehicle: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("existing"), vehicleId: z.string().min(1) }),
    z.object({
      kind: z.literal("new"),
      plate,
      make: z.string().trim().min(1, "Enter the make").max(40),
      model: z.string().trim().min(1, "Enter the model").max(40),
      year: z.coerce
        .number()
        .int()
        .min(1950, "Enter a valid year")
        .max(new Date().getFullYear() + 1, "Enter a valid year"),
      color: z.string().trim().max(30).optional(),
      mileage: z.coerce.number().int().min(0).max(2_000_000).optional(),
    }),
  ]),
});
export type CreateBookingInput = z.input<typeof createBookingSchema>;

/**
 * Brief §5.1: create the booking in PENDING and create the customer account — or reuse it
 * when the email exists and the password matches (or the customer is signed in).
 */
export async function createBooking(raw: CreateBookingInput) {
  const input = createBookingSchema.parse(raw);
  const startsAt = new Date(input.startsAt);

  const shop = await prisma.shop.findUnique({
    where: { id: input.shopId },
    select: {
      id: true,
      name: true,
      workingHours: true,
      slotDurationMin: true,
      slotCapacity: true,
      services: { where: { id: { in: input.serviceIds }, active: true }, select: { name: true } },
    },
  });
  if (!shop) throw notFound("Shop not found.");
  if (shop.services.length !== new Set(input.serviceIds).size) {
    throw invalid("One of the selected services isn't offered by this shop.");
  }
  const dateKey = shopDateKey(startsAt);
  if (
    !isValidSlotStart(shop.workingHours as WorkingHours, dateKey, shop.slotDurationMin, startsAt) ||
    startsAt.getTime() < Date.now() + LEAD_MINUTES * 60_000
  ) {
    throw invalid("That time isn't available — please pick another slot.");
  }

  // Resolve the customer account outside the transaction (bcrypt is slow).
  let customerId: string;
  let isNewAccount = false;
  let newAccountHash: string | null = null;
  if (input.customer.kind === "session") {
    customerId = input.customer.userId;
  } else {
    const existing = await prisma.user.findUnique({
      where: { email: input.customer.email },
      select: { id: true, passwordHash: true },
    });
    if (existing) {
      const ok = await bcrypt.compare(input.customer.password, existing.passwordHash);
      if (!ok) {
        throw conflict(
          "An account with this email already exists and the password doesn't match. Sign in first, or use the right password.",
        );
      }
      customerId = existing.id;
    } else {
      customerId = "";
      isNewAccount = true;
      newAccountHash = await bcrypt.hash(input.customer.password, 10);
    }
  }

  const booking = await prisma.$transaction(async (tx) => {
    if (isNewAccount && input.customer.kind === "details") {
      const user = await tx.user.create({
        data: {
          name: input.customer.name,
          email: input.customer.email,
          phone: input.customer.phone || null,
          passwordHash: newAccountHash!,
        },
        select: { id: true },
      });
      customerId = user.id;
    }

    let vehicleId: string;
    if (input.vehicle.kind === "existing") {
      const v = await tx.vehicle.findFirst({
        where: { id: input.vehicle.vehicleId, customerId },
        select: { id: true },
      });
      if (!v) throw notFound("Vehicle not found.");
      vehicleId = v.id;
    } else {
      const { kind: _kind, ...v } = input.vehicle;
      const found = await tx.vehicle.findFirst({
        where: { customerId, plate: v.plate },
        select: { id: true },
      });
      vehicleId = found
        ? (
            await tx.vehicle.update({
              where: { id: found.id },
              data: { make: v.make, model: v.model, year: v.year, color: v.color, mileage: v.mileage },
              select: { id: true },
            })
          ).id
        : (await tx.vehicle.create({ data: { ...v, customerId }, select: { id: true } })).id;
    }

    const slotId = await claimSlot(tx, shop.id, startsAt, shop.slotCapacity);

    const created = await tx.booking.create({
      data: {
        code: newBookingCode(),
        shopId: shop.id,
        customerId,
        vehicleId,
        slotId,
        serviceNames: shop.services.map((s) => s.name),
        problems: input.problems,
      },
      select: { id: true, code: true },
    });
    await tx.bookingEvent.create({
      data: {
        bookingId: created.id,
        toStatus: "PENDING",
        actorId: customerId,
        actorRole: "CUSTOMER",
        note: "Booked online",
      },
    });
    await notify(tx, {
      userIds: await advisorIds(tx, shop.id),
      type: "BOOKING_CREATED",
      message: `New booking ${created.code} for ${formatDateTime(startsAt)}`,
      bookingId: created.id,
      href: staffHref(shop.id, created.id),
    });
    return created;
  });

  return { ...booking, customerId, isNewAccount, shopName: shop.name };
}
