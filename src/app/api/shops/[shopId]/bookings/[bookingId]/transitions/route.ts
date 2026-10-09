import { NextResponse } from "next/server";
import { z } from "zod";
import { apiRoute } from "@/lib/api";
import { notFound } from "@/lib/errors";
import { requireBookingAccess } from "@/lib/rbac";
import * as wf from "@/server/services/workflow";
import * as parts from "@/server/services/parts";

/**
 * POST /api/shops/:shopId/bookings/:bookingId/transitions   { "action": "confirm", ... }
 *
 * Drives the same state machine as the UI. Responses: 200 with the new status ·
 * 403 when your role may not perform the action · 409 when the booking isn't in a status
 * that allows it · 404 for a booking outside the shop · 422 for bad input.
 */
const body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("confirm"), technicianId: z.string().optional(), note: z.string().optional() }),
  z.object({ action: z.literal("decline"), reason: z.string().optional() }),
  z.object({ action: z.literal("assignTechnician"), technicianId: z.string().min(1) }),
  z.object({ action: z.literal("startInspection") }),
  z.object({ action: z.literal("submitEstimate"), items: wf.estimateItemsSchema, note: z.string().optional() }),
  z.object({ action: z.literal("sendEstimate"), items: wf.estimateItemsSchema.optional() }),
  z.object({ action: z.literal("approveEstimate") }),
  z.object({ action: z.literal("rejectEstimate"), note: z.string().optional() }),
  z.object({ action: z.literal("reviseEstimate"), note: z.string().optional() }),
  z.object({ action: z.literal("returnToTechnician"), note: z.string().optional() }),
  z.object({ action: z.literal("assignParts"), partsPersonId: z.string().min(1) }),
  z.object({ action: z.literal("processParts"), supplier: z.string().optional() }),
  z.object({ action: z.literal("markPartsReady") }),
  z.object({ action: z.literal("allocateParts") }),
  z.object({ action: z.literal("sendToQc"), note: z.string().optional() }),
  z.object({ action: z.literal("claimQc") }),
  z.object({ action: z.literal("passQc"), note: z.string().optional() }),
  z.object({ action: z.literal("failQc"), title: z.string(), description: z.string().optional() }),
  z.object({ action: z.literal("notifyReady"), message: z.string().optional() }),
  z.object({ action: z.literal("complete") }),
  z.object({ action: z.literal("cancel"), reason: z.string().optional() }),
]);

export const POST = apiRoute(
  async (req: Request, ctx: RouteContext<"/api/shops/[shopId]/bookings/[bookingId]/transitions">) => {
    const { shopId, bookingId } = await ctx.params;
    const { actor, booking } = await requireBookingAccess(bookingId);
    if (booking.shopId !== shopId) throw notFound("Booking not found.");
    const input = body.parse(await req.json().catch(() => ({})));
    const ref = { shopId, bookingId };

    switch (input.action) {
      case "confirm":
        await wf.confirmBooking(actor, { ...ref, technicianId: input.technicianId, note: input.note });
        break;
      case "decline":
        await wf.declineBooking(actor, { ...ref, reason: input.reason });
        break;
      case "assignTechnician":
        await wf.assignTechnician(actor, { ...ref, technicianId: input.technicianId });
        break;
      case "startInspection":
        await wf.startInspection(actor, ref);
        break;
      case "submitEstimate":
        await wf.submitEstimate(actor, { ...ref, items: input.items, note: input.note });
        break;
      case "sendEstimate":
        await wf.sendEstimate(actor, { ...ref, items: input.items });
        break;
      case "approveEstimate":
      case "rejectEstimate":
        await wf.respondToEstimate(actor, {
          ...ref,
          decision: input.action === "approveEstimate" ? "approve" : "reject",
          note: input.action === "rejectEstimate" ? input.note : undefined,
        });
        break;
      case "reviseEstimate":
        await wf.reviseEstimate(actor, { ...ref, note: input.note });
        break;
      case "returnToTechnician":
        await wf.returnToTechnician(actor, { ...ref, note: input.note });
        break;
      case "assignParts":
        await wf.assignPartsPerson(actor, { ...ref, partsPersonId: input.partsPersonId });
        break;
      case "processParts":
        await parts.processPartsRequest(actor, { ...ref, supplier: input.supplier });
        break;
      case "markPartsReady":
        await parts.markPartsReady(actor, ref);
        break;
      case "allocateParts":
        await parts.allocateParts(actor, ref);
        break;
      case "sendToQc":
        await wf.sendToQc(actor, { ...ref, note: input.note });
        break;
      case "claimQc":
        await wf.claimQc(actor, ref);
        break;
      case "passQc":
        await wf.passQc(actor, { ...ref, note: input.note });
        break;
      case "failQc":
        await wf.failQc(actor, { ...ref, title: input.title, description: input.description });
        break;
      case "notifyReady":
        await wf.notifyReady(actor, { ...ref, message: input.message });
        break;
      case "complete":
        await wf.completeBooking(actor, ref);
        break;
      case "cancel":
        await wf.cancelBooking(actor, { ...ref, reason: input.reason });
        break;
    }

    const after = await requireBookingAccess(bookingId);
    return NextResponse.json({ ok: true, status: after.booking.status });
  },
);
