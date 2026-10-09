import bcrypt from "bcryptjs";
import { z } from "zod";
import type { StaffRole } from "@prisma/client";
import type { Actor } from "@/lib/booking/state-machine";
import { prisma } from "@/lib/db";
import { conflict, forbidden, invalid, notFound } from "@/lib/errors";
import { DEFAULT_WORKING_HOURS, type WorkingHours } from "@/lib/slots";

/** Owner-only management (brief §7.2): shops, team, service catalog, inventory catalog. */

function requireOwner(actor: Actor) {
  if (!actor.isOwner) throw forbidden("Only the shop owner can do that.");
}

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm");
const dayHours = z
  .object({ open: hhmm, close: hhmm })
  .refine((d) => d.open < d.close, "Closing time must be after opening time")
  .nullable();

export const shopSchema = z.object({
  name: z.string().trim().min(2, "Enter the shop name").max(80),
  address: z.string().trim().min(3, "Enter the address").max(160),
  city: z.string().trim().min(2, "Enter the city").max(60),
  phone: z.string().trim().min(5, "Enter a phone number").max(30),
  description: z.string().trim().max(400).optional(),
  slotDurationMin: z.coerce.number().int().min(15).max(240),
  slotCapacity: z.coerce.number().int().min(1).max(20),
  workingHours: z
    .object({
      mon: dayHours,
      tue: dayHours,
      wed: dayHours,
      thu: dayHours,
      fri: dayHours,
      sat: dayHours,
      sun: dayHours,
    })
    .optional(),
});
export type ShopInput = z.input<typeof shopSchema>;

const STARTER_SERVICES = [
  { name: "Oil change", description: "Engine oil and filter", durationMin: 45, basePrice: 5000 },
  { name: "Brake inspection", description: "Pads, discs and fluid", durationMin: 60, basePrice: 3000 },
  { name: "Check engine light", description: "OBD diagnostic scan", durationMin: 60, basePrice: 2500 },
  { name: "Tire rotation", description: "Rotate and balance", durationMin: 45, basePrice: 2000 },
];

/** Any signed-in user can create a shop and become its owner. */
export async function createShop(ownerId: string, raw: ShopInput & { starterServices?: boolean }) {
  const input = shopSchema.parse(raw);
  return prisma.shop.create({
    data: {
      ...input,
      description: input.description || null,
      workingHours: (input.workingHours ?? DEFAULT_WORKING_HOURS) as WorkingHours,
      ownerId,
      services: raw.starterServices ? { create: STARTER_SERVICES } : undefined,
    },
    select: { id: true },
  });
}

export async function updateShop(actor: Actor, shopId: string, raw: ShopInput) {
  requireOwner(actor);
  const input = shopSchema.parse(raw);
  await prisma.shop.update({
    where: { id: shopId },
    data: {
      ...input,
      description: input.description || null,
      workingHours: input.workingHours as WorkingHours | undefined,
    },
  });
}

const STAFF_ROLES = ["SERVICE_ADVISOR", "TECHNICIAN", "QC", "PARTS"] as const;
export const memberSchema = z.object({
  name: z.string().trim().min(2, "Enter their name").max(80),
  email: z.email("Enter a valid email").transform((s) => s.toLowerCase()),
  role: z.enum(STAFF_ROLES),
  password: z.string().min(8, "Temporary password needs at least 8 characters").max(100),
});

/**
 * Staff accounts are created by the owner, never self-signed-up. If the email already has
 * an account (e.g. they work at another shop) the membership is added to that account and
 * their existing password is kept.
 */
export async function addTeamMember(actor: Actor, shopId: string, raw: z.input<typeof memberSchema>) {
  requireOwner(actor);
  const input = memberSchema.parse(raw);
  const existing = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });

  return prisma.$transaction(async (tx) => {
    const userId =
      existing?.id ??
      (
        await tx.user.create({
          data: {
            name: input.name,
            email: input.email,
            passwordHash: await bcrypt.hash(input.password, 10),
          },
          select: { id: true },
        })
      ).id;

    const dup = await tx.membership.findUnique({
      where: { userId_shopId_role: { userId, shopId, role: input.role } },
    });
    if (dup?.active) throw conflict("That person already has this role in the shop.");
    if (dup) {
      await tx.membership.update({ where: { id: dup.id }, data: { active: true } });
    } else {
      await tx.membership.create({ data: { userId, shopId, role: input.role } });
    }
    return { reusedAccount: Boolean(existing) };
  });
}

export async function updateMember(
  actor: Actor,
  shopId: string,
  input: { membershipId: string; active?: boolean; role?: StaffRole },
) {
  requireOwner(actor);
  const m = await prisma.membership.findFirst({ where: { id: input.membershipId, shopId } });
  if (!m) throw notFound("Team member not found.");
  if (input.role && !STAFF_ROLES.includes(input.role as (typeof STAFF_ROLES)[number])) {
    throw invalid("Unknown role.");
  }
  if (input.role && input.role !== m.role) {
    const clash = await prisma.membership.findUnique({
      where: { userId_shopId_role: { userId: m.userId, shopId, role: input.role } },
    });
    if (clash) throw conflict("They already hold that role here.");
  }
  await prisma.membership.update({
    where: { id: m.id },
    data: { active: input.active ?? m.active, role: input.role ?? m.role },
  });
}

export const serviceSchema = z.object({
  name: z.string().trim().min(2, "Enter a name").max(80),
  description: z.string().trim().max(240).optional(),
  durationMin: z.coerce.number().int().min(10).max(600),
  basePrice: z.coerce.number().int().min(0).max(10_000_000).optional(),
});

export async function upsertService(
  actor: Actor,
  shopId: string,
  raw: z.input<typeof serviceSchema> & { id?: string },
) {
  requireOwner(actor);
  const input = serviceSchema.parse(raw);
  const data = { ...input, description: input.description || null, basePrice: input.basePrice ?? null };
  if (raw.id) {
    const found = await prisma.service.findFirst({ where: { id: raw.id, shopId }, select: { id: true } });
    if (!found) throw notFound("Service not found.");
    await prisma.service.update({ where: { id: found.id }, data });
  } else {
    await prisma.service.create({ data: { ...data, shopId } });
  }
}

export async function setServiceActive(actor: Actor, shopId: string, serviceId: string, active: boolean) {
  requireOwner(actor);
  const res = await prisma.service.updateMany({ where: { id: serviceId, shopId }, data: { active } });
  if (!res.count) throw notFound("Service not found.");
}

export const inventoryItemSchema = z.object({
  sku: z
    .string()
    .trim()
    .min(2, "Enter a SKU")
    .max(32)
    .transform((s) => s.toUpperCase()),
  name: z.string().trim().min(2, "Enter the part name").max(80),
  qtyOnHand: z.coerce.number().int().min(0).max(100_000),
  reorderLevel: z.coerce.number().int().min(0).max(100_000),
  unitCost: z.coerce.number().int().min(0).max(10_000_000),
});

/** Add a part to the shop catalogue (owner or parts staff). Opening stock is logged as ADJUST. */
export async function addInventoryItem(actor: Actor, shopId: string, raw: z.input<typeof inventoryItemSchema>) {
  if (!actor.isOwner && !actor.roles.includes("PARTS")) {
    throw forbidden("Only the owner or parts staff can manage inventory.");
  }
  const input = inventoryItemSchema.parse(raw);
  const dup = await prisma.inventoryItem.findUnique({
    where: { shopId_sku: { shopId, sku: input.sku } },
    select: { id: true },
  });
  if (dup) throw conflict(`SKU ${input.sku} already exists in this shop.`);
  await prisma.$transaction(async (tx) => {
    const item = await tx.inventoryItem.create({ data: { ...input, shopId }, select: { id: true } });
    if (input.qtyOnHand > 0) {
      await tx.stockMovement.create({
        data: { shopId, inventoryItemId: item.id, delta: input.qtyOnHand, reason: "ADJUST", actorId: actor.userId },
      });
    }
  });
}
