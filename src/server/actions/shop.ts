"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import type { StaffRole } from "@prisma/client";
import { requireShopAccess, requireUser } from "@/lib/rbac";
import * as shops from "@/server/services/shops";
import * as parts from "@/server/services/parts";
import { completeAiTask } from "@/server/services/frontdesk";
import { run, type ActionResult } from "./result";

/** Shop-scoped actions: every one proves membership of `shopId` before touching data. */

async function inShop(shopId: string, fn: Parameters<typeof run>[0], message: string) {
  const res = await run(fn, message);
  if (res.ok) refresh();
  return res as ActionResult;
}

export async function createShopAction(input: shops.ShopInput & { starterServices?: boolean }) {
  const res = await run(async () => {
    const user = await requireUser();
    return shops.createShop(user.id, input);
  });
  if (res.ok && res.data) redirect(`/pos/${res.data.id}?welcome=1`);
  return res as ActionResult;
}

export async function updateShopAction(shopId: string, input: shops.ShopInput) {
  return inShop(
    shopId,
    async () => {
      const { actor } = await requireShopAccess(shopId, ["OWNER"]);
      await shops.updateShop(actor, shopId, input);
    },
    "Shop details saved",
  );
}

export async function addTeamMemberAction(
  shopId: string,
  input: { name: string; email: string; role: StaffRole; password: string },
) {
  const res = await run(async () => {
    const { actor } = await requireShopAccess(shopId, ["OWNER"]);
    return shops.addTeamMember(actor, shopId, input);
  });
  if (!res.ok) return res as ActionResult;
  refresh();
  return {
    ok: true,
    message: res.data?.reusedAccount
      ? "Existing account added to the team (their password is unchanged)"
      : "Team member added — share their login details with them",
  } satisfies ActionResult;
}

export async function updateMemberAction(
  shopId: string,
  input: { membershipId: string; active?: boolean; role?: StaffRole },
) {
  return inShop(
    shopId,
    async () => {
      const { actor } = await requireShopAccess(shopId, ["OWNER"]);
      await shops.updateMember(actor, shopId, input);
    },
    input.active === false ? "Team member deactivated" : "Team member updated",
  );
}

export async function upsertServiceAction(
  shopId: string,
  input: { id?: string; name: string; description?: string; durationMin: number; basePrice?: number },
) {
  return inShop(
    shopId,
    async () => {
      const { actor } = await requireShopAccess(shopId, ["OWNER"]);
      await shops.upsertService(actor, shopId, input);
    },
    input.id ? "Service updated" : "Service added",
  );
}

export async function setServiceActiveAction(shopId: string, serviceId: string, active: boolean) {
  return inShop(
    shopId,
    async () => {
      const { actor } = await requireShopAccess(shopId, ["OWNER"]);
      await shops.setServiceActive(actor, shopId, serviceId, active);
    },
    active ? "Service re-enabled" : "Service hidden from booking",
  );
}

export async function addInventoryItemAction(
  shopId: string,
  input: { sku: string; name: string; qtyOnHand: number; reorderLevel: number; unitCost: number },
) {
  return inShop(
    shopId,
    async () => {
      const { actor } = await requireShopAccess(shopId, ["OWNER", "PARTS"]);
      await shops.addInventoryItem(actor, shopId, input);
    },
    "Part added to inventory",
  );
}

export async function createRestockOrderAction(
  shopId: string,
  input: { supplier?: string; lines: { inventoryItemId: string; qty: number }[] },
) {
  return inShop(
    shopId,
    async () => {
      const { actor } = await requireShopAccess(shopId, ["OWNER", "PARTS"]);
      await parts.createRestockOrder(actor, { shopId, ...input });
    },
    "Purchase order raised",
  );
}

export async function receivePurchaseOrderAction(
  shopId: string,
  poId: string,
  lines: { poItemId: string; qty: number }[],
) {
  const res = await run(async () => {
    const { actor } = await requireShopAccess(shopId, ["OWNER", "PARTS"]);
    return parts.receivePurchaseOrder(actor, { shopId, poId, lines });
  });
  if (!res.ok) return res as ActionResult;
  refresh();
  const d = res.data!;
  return {
    ok: true,
    message:
      d.poStatus === "RECEIVED"
        ? d.bookingReady
          ? "Delivery received — job moved to parts ready"
          : "Delivery received in full — stock updated"
        : "Partial delivery received — stock updated",
  } satisfies ActionResult;
}

/** An advisor closes an AI Front Desk follow-up. */
export async function completeAiTaskAction(shopId: string, taskId: string) {
  return inShop(
    shopId,
    async () => {
      const { user } = await requireShopAccess(shopId, ["OWNER", "SERVICE_ADVISOR"]);
      await completeAiTask(user.id, shopId, taskId);
    },
    "Marked as done",
  );
}
