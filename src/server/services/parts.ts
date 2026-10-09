import { z } from "zod";
import type { Actor } from "@/lib/booking/state-machine";
import { conflict, forbidden, invalid, notFound } from "@/lib/errors";
import { prisma } from "@/lib/db";
import { notify, staffHref, type Tx } from "./common";
import { loadBooking, transition } from "./transition";

/**
 * Inventory & procurement (brief §7.6).
 *
 * Stock model: `qtyOnHand` is what is free on the shelf. Reserving parts for a booking moves
 * them out of qtyOnHand into a PartAllocation (RESERVED); allocation to the technician marks
 * them ALLOCATED; cancelling before IN_REPAIR RELEASES them back. Every change to qtyOnHand
 * is a single conditional UPDATE plus one StockMovement ledger row.
 */

export type Requirement = {
  inventoryItemId: string;
  sku: string;
  name: string;
  required: number;
  reserved: number;
  onHand: number;
  onOrder: number;
  /** still needed after what's reserved and what's on the shelf */
  shortfall: number;
};

/** Required parts (approved estimate) vs reserved vs on hand — the "required vs available" view. */
export async function partsRequirement(db: Tx, bookingId: string): Promise<Requirement[]> {
  const estimate = await db.estimate.findFirst({
    where: { bookingId, status: "APPROVED" },
    orderBy: { revision: "desc" },
    select: {
      items: {
        where: { kind: "PART", inventoryItemId: { not: null } },
        select: { inventoryItemId: true, qty: true },
      },
    },
  });
  if (!estimate) return [];

  const need = new Map<string, number>();
  for (const it of estimate.items) {
    need.set(it.inventoryItemId!, (need.get(it.inventoryItemId!) ?? 0) + it.qty);
  }
  if (!need.size) return [];

  const ids = [...need.keys()];
  const [items, allocs, onOrder] = await Promise.all([
    db.inventoryItem.findMany({
      where: { id: { in: ids } },
      select: { id: true, sku: true, name: true, qtyOnHand: true },
    }),
    db.partAllocation.findMany({
      where: { bookingId, inventoryItemId: { in: ids }, status: { not: "RELEASED" } },
      select: { inventoryItemId: true, qty: true },
    }),
    db.pOItem.findMany({
      where: {
        inventoryItemId: { in: ids },
        po: { bookingId, status: { not: "RECEIVED" } },
      },
      select: { inventoryItemId: true, qtyOrdered: true, qtyReceived: true },
    }),
  ]);
  const reservedBy = new Map(allocs.map((a) => [a.inventoryItemId, a.qty]));
  const orderedBy = new Map<string, number>();
  for (const o of onOrder) {
    orderedBy.set(
      o.inventoryItemId!,
      (orderedBy.get(o.inventoryItemId!) ?? 0) + (o.qtyOrdered - o.qtyReceived),
    );
  }

  return items.map((it) => {
    const required = need.get(it.id)!;
    const reserved = reservedBy.get(it.id) ?? 0;
    const shortfall = Math.max(0, required - reserved - it.qtyOnHand);
    return {
      inventoryItemId: it.id,
      sku: it.sku,
      name: it.name,
      required,
      reserved,
      onHand: it.qtyOnHand,
      onOrder: orderedBy.get(it.id) ?? 0,
      shortfall,
    };
  });
}

/** Atomically move up to `qty` units from the shelf into the booking's reservation. */
async function reserve(
  tx: Tx,
  args: { shopId: string; bookingId: string; inventoryItemId: string; qty: number; actorId: string },
): Promise<boolean> {
  if (args.qty <= 0) return true;
  const taken = await tx.inventoryItem.updateMany({
    where: { id: args.inventoryItemId, shopId: args.shopId, qtyOnHand: { gte: args.qty } },
    data: { qtyOnHand: { decrement: args.qty } },
  });
  if (taken.count !== 1) return false;
  await tx.partAllocation.upsert({
    where: {
      bookingId_inventoryItemId: { bookingId: args.bookingId, inventoryItemId: args.inventoryItemId },
    },
    create: {
      bookingId: args.bookingId,
      inventoryItemId: args.inventoryItemId,
      qty: args.qty,
      status: "RESERVED",
    },
    update: { qty: { increment: args.qty }, status: "RESERVED" },
  });
  await tx.stockMovement.create({
    data: {
      shopId: args.shopId,
      inventoryItemId: args.inventoryItemId,
      bookingId: args.bookingId,
      delta: -args.qty,
      reason: "RESERVE",
      actorId: args.actorId,
    },
  });
  return true;
}

/** Reserve whatever is on the shelf toward each requirement. Returns what is still missing. */
async function reserveAvailable(tx: Tx, shopId: string, bookingId: string, actorId: string) {
  for (const r of await partsRequirement(tx, bookingId)) {
    const want = Math.min(r.required - r.reserved, r.onHand);
    if (want > 0) await reserve(tx, { shopId, bookingId, inventoryItemId: r.inventoryItemId, qty: want, actorId });
  }
  return (await partsRequirement(tx, bookingId)).filter((r) => r.required > r.reserved);
}

/**
 * PARTS_PENDING → the parts person checks stock: everything on the shelf is reserved for
 * the job. If nothing is missing → PARTS_READY (skip ordering). Otherwise a purchase order
 * is raised for the shortfall → PARTS_ORDERED.
 */
export async function processPartsRequest(
  actor: Actor,
  input: { shopId: string; bookingId: string; supplier?: string },
) {
  return prisma.$transaction(async (tx) => {
    const b = await loadBooking(tx, input.shopId, input.bookingId);
    // Authorize up front so a technician can't reserve stock by calling this directly.
    if (b.status !== "PARTS_PENDING") throw conflict("This job isn't waiting on parts.");
    if (b.partsPersonId !== actor.userId || !actor.roles.includes("PARTS")) {
      throw forbidden("Only the parts person assigned to this job can process its parts.");
    }

    const missing = await reserveAvailable(tx, input.shopId, b.id, actor.userId);
    if (!missing.length) {
      await transition(tx, {
        shopId: input.shopId,
        bookingId: b.id,
        action: "markPartsReady",
        actor,
        booking: b,
        note: "All parts in stock — reserved for this job",
      });
      if (b.assignedTechId) {
        await notify(tx, {
          userIds: [b.assignedTechId],
          type: "PARTS_READY",
          message: `Parts are ready for ${b.code}`,
          bookingId: b.id,
          href: staffHref(input.shopId, b.id),
        });
      }
      return { outcome: "READY" as const, ordered: 0 };
    }

    // Order only what isn't already on an open PO for this booking.
    const lines = missing
      .map((r) => ({ r, qty: r.required - r.reserved - r.onOrder }))
      .filter((l) => l.qty > 0);
    if (lines.length) {
      await tx.purchaseOrder.create({
        data: {
          shopId: input.shopId,
          bookingId: b.id,
          supplier: input.supplier?.trim() || null,
          items: {
            create: lines.map(({ r, qty }) => ({
              inventoryItemId: r.inventoryItemId,
              name: r.name,
              qtyOrdered: qty,
            })),
          },
        },
      });
    }
    await transition(tx, {
      shopId: input.shopId,
      bookingId: b.id,
      action: "orderParts",
      actor,
      booking: b,
      note: `Ordered: ${missing.map((m) => `${m.name} ×${m.required - m.reserved}`).join(", ")}`,
    });
    return { outcome: "ORDERED" as const, ordered: lines.length };
  });
}

export const receiveSchema = z.object({
  shopId: z.string().min(1),
  poId: z.string().min(1),
  lines: z
    .array(z.object({ poItemId: z.string().min(1), qty: z.coerce.number().int().min(0).max(10_000) }))
    .min(1),
});

/**
 * Receive a purchase order (fully or partially). Stock goes up; the PO becomes
 * PARTIALLY_RECEIVED or RECEIVED. Parts ordered for a booking are reserved for it straight
 * away, and once nothing is missing the booking moves PARTS_ORDERED → PARTS_READY.
 * A partial delivery leaves the booking in PARTS_ORDERED (brief §5.3).
 */
export async function receivePurchaseOrder(actor: Actor, raw: z.input<typeof receiveSchema>) {
  const input = receiveSchema.parse(raw);
  if (!actor.isOwner && !actor.roles.includes("PARTS")) {
    throw forbidden("Only parts staff can receive deliveries.");
  }

  return prisma.$transaction(async (tx) => {
    const po = await tx.purchaseOrder.findFirst({
      where: { id: input.poId, shopId: input.shopId },
      select: {
        id: true,
        bookingId: true,
        status: true,
        items: { select: { id: true, inventoryItemId: true, qtyOrdered: true, qtyReceived: true } },
      },
    });
    if (!po) throw notFound("Purchase order not found.");
    if (po.status === "RECEIVED") throw conflict("This order has already been fully received.");

    let receivedAny = false;
    for (const line of input.lines) {
      const item = po.items.find((i) => i.id === line.poItemId);
      if (!item) throw invalid("That line isn't on this purchase order.");
      const qty = Math.min(line.qty, item.qtyOrdered - item.qtyReceived);
      if (qty <= 0) continue;
      receivedAny = true;
      await tx.pOItem.update({ where: { id: item.id }, data: { qtyReceived: { increment: qty } } });
      if (item.inventoryItemId) {
        await tx.inventoryItem.update({
          where: { id: item.inventoryItemId },
          data: { qtyOnHand: { increment: qty } },
        });
        await tx.stockMovement.create({
          data: {
            shopId: input.shopId,
            inventoryItemId: item.inventoryItemId,
            poId: po.id,
            bookingId: po.bookingId,
            delta: qty,
            reason: "RECEIVE",
            actorId: actor.userId,
          },
        });
      }
    }
    if (!receivedAny) throw invalid("Enter a quantity to receive.");

    const after = await tx.pOItem.findMany({
      where: { poId: po.id },
      select: { qtyOrdered: true, qtyReceived: true },
    });
    const complete = after.every((i) => i.qtyReceived >= i.qtyOrdered);
    await tx.purchaseOrder.update({
      where: { id: po.id },
      data: { status: complete ? "RECEIVED" : "PARTIALLY_RECEIVED" },
    });

    // Booking-linked order: reserve the arrivals for that job, advance it when complete.
    let bookingReady = false;
    if (po.bookingId) {
      const b = await loadBooking(tx, input.shopId, po.bookingId);
      if (b.status === "PARTS_ORDERED") {
        const missing = await reserveAvailable(tx, input.shopId, b.id, actor.userId);
        if (!missing.length && b.partsPersonId === actor.userId && actor.roles.includes("PARTS")) {
          await transition(tx, {
            shopId: input.shopId,
            bookingId: b.id,
            action: "markPartsReady",
            actor,
            booking: b,
            note: "Delivery received — all parts reserved",
          });
          bookingReady = true;
          if (b.assignedTechId) {
            await notify(tx, {
              userIds: [b.assignedTechId],
              type: "PARTS_READY",
              message: `Parts are ready for ${b.code}`,
              bookingId: b.id,
              href: staffHref(input.shopId, b.id),
            });
          }
        }
      }
    }
    return { poStatus: complete ? "RECEIVED" : "PARTIALLY_RECEIVED", bookingReady };
  });
}

/** PARTS_PENDING/ORDERED → PARTS_READY by hand, once every required part is reserved. */
export async function markPartsReady(actor: Actor, input: { shopId: string; bookingId: string }) {
  return prisma.$transaction(async (tx) => {
    const b = await loadBooking(tx, input.shopId, input.bookingId);
    if (b.partsPersonId !== actor.userId || !actor.roles.includes("PARTS")) {
      throw forbidden("Only the parts person assigned to this job can do that.");
    }
    const missing = await reserveAvailable(tx, input.shopId, b.id, actor.userId);
    if (missing.length) {
      throw conflict(`Still missing: ${missing.map((m) => m.name).join(", ")}.`);
    }
    await transition(tx, { shopId: input.shopId, bookingId: b.id, action: "markPartsReady", actor, booking: b });
    if (b.assignedTechId) {
      await notify(tx, {
        userIds: [b.assignedTechId],
        type: "PARTS_READY",
        message: `Parts are ready for ${b.code}`,
        bookingId: b.id,
        href: staffHref(input.shopId, b.id),
      });
    }
  });
}

/** PARTS_READY → IN_REPAIR: hand the reserved parts to the technician (brief step 10). */
export async function allocateParts(actor: Actor, input: { shopId: string; bookingId: string }) {
  return prisma.$transaction(async (tx) => {
    const b = await loadBooking(tx, input.shopId, input.bookingId);
    const missing = (await partsRequirement(tx, b.id)).filter((r) => r.required > r.reserved);
    if (missing.length) {
      throw conflict(`Can't allocate yet — missing ${missing.map((m) => m.name).join(", ")}.`);
    }
    await transition(tx, {
      shopId: input.shopId,
      bookingId: b.id,
      action: "allocateParts",
      actor,
      booking: b,
      note: "Parts allocated to the job",
    });
    await tx.partAllocation.updateMany({
      where: { bookingId: b.id, status: "RESERVED" },
      data: { status: "ALLOCATED" },
    });
    if (b.assignedTechId) {
      await notify(tx, {
        userIds: [b.assignedTechId],
        type: "REPAIR_READY",
        message: `${b.code} is back with you — parts allocated, start the repair`,
        bookingId: b.id,
        href: staffHref(input.shopId, b.id),
      });
    }
  });
}

/** Cancellation before IN_REPAIR: every reserved part goes back on the shelf. */
export async function releaseReservedParts(tx: Tx, shopId: string, bookingId: string, actorId: string) {
  const allocs = await tx.partAllocation.findMany({
    where: { bookingId, status: "RESERVED" },
    select: { id: true, inventoryItemId: true, qty: true },
  });
  for (const a of allocs) {
    await tx.inventoryItem.update({
      where: { id: a.inventoryItemId },
      data: { qtyOnHand: { increment: a.qty } },
    });
    await tx.partAllocation.update({ where: { id: a.id }, data: { status: "RELEASED" } });
    await tx.stockMovement.create({
      data: {
        shopId,
        inventoryItemId: a.inventoryItemId,
        bookingId,
        delta: a.qty,
        reason: "RELEASE",
        actorId,
      },
    });
  }
  return allocs.length;
}

export const restockSchema = z.object({
  shopId: z.string().min(1),
  supplier: z.string().trim().max(80).optional(),
  lines: z
    .array(z.object({ inventoryItemId: z.string().min(1), qty: z.coerce.number().int().min(1).max(10_000) }))
    .min(1, "Add at least one part"),
});

/** A stock-replenishment PO not tied to a booking (e.g. items below reorder level). */
export async function createRestockOrder(actor: Actor, raw: z.input<typeof restockSchema>) {
  const input = restockSchema.parse(raw);
  if (!actor.isOwner && !actor.roles.includes("PARTS")) {
    throw forbidden("Only parts staff can raise purchase orders.");
  }
  const items = await prisma.inventoryItem.findMany({
    where: { shopId: input.shopId, id: { in: input.lines.map((l) => l.inventoryItemId) } },
    select: { id: true, name: true },
  });
  if (items.length !== new Set(input.lines.map((l) => l.inventoryItemId)).size) {
    throw invalid("One of the parts isn't in this shop's inventory.");
  }
  const nameOf = new Map(items.map((i) => [i.id, i.name]));
  return prisma.purchaseOrder.create({
    data: {
      shopId: input.shopId,
      supplier: input.supplier || null,
      items: {
        create: input.lines.map((l) => ({
          inventoryItemId: l.inventoryItemId,
          name: nameOf.get(l.inventoryItemId)!,
          qtyOrdered: l.qty,
        })),
      },
    },
    select: { id: true },
  });
}
