import "server-only";
import { prisma } from "@/lib/db";

/** Read models for shop management screens. All scoped by shopId. */

export async function getTeam(shopId: string) {
  const memberships = await prisma.membership.findMany({
    where: { shopId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: [{ active: "desc" }, { role: "asc" }, { createdAt: "asc" }],
  });
  return memberships;
}

/** Active staff of one role — for the assign-technician / assign-parts pickers. */
export async function getStaffOptions(shopId: string) {
  const rows = await prisma.membership.findMany({
    where: { shopId, active: true, role: { in: ["TECHNICIAN", "PARTS"] } },
    select: { role: true, user: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });
  return {
    technicians: rows.filter((r) => r.role === "TECHNICIAN").map((r) => r.user),
    partsPeople: rows.filter((r) => r.role === "PARTS").map((r) => r.user),
  };
}

export async function getInventory(shopId: string) {
  return prisma.inventoryItem.findMany({
    where: { shopId },
    orderBy: [{ name: "asc" }],
    include: {
      allocations: { where: { status: "RESERVED" }, select: { qty: true } },
      poItems: {
        where: { po: { status: { not: "RECEIVED" } } },
        select: { qtyOrdered: true, qtyReceived: true },
      },
    },
  });
}

export async function getPurchaseOrders(shopId: string) {
  return prisma.purchaseOrder.findMany({
    where: { shopId },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      booking: { select: { id: true, code: true } },
      items: {
        select: {
          id: true,
          name: true,
          qtyOrdered: true,
          qtyReceived: true,
          inventoryItem: { select: { sku: true } },
        },
      },
    },
  });
}

export async function getRecentMovements(shopId: string, take = 12) {
  return prisma.stockMovement.findMany({
    where: { shopId },
    orderBy: { createdAt: "desc" },
    take,
    include: {
      inventoryItem: { select: { name: true, sku: true } },
      booking: { select: { id: true, code: true } },
      actor: { select: { name: true } },
    },
  });
}

export async function getServices(shopId: string) {
  return prisma.service.findMany({ where: { shopId }, orderBy: [{ active: "desc" }, { name: "asc" }] });
}

export async function getShopSettings(shopId: string) {
  return prisma.shop.findUnique({ where: { id: shopId } });
}
