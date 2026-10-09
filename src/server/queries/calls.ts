import { prisma } from "@/lib/db";

/**
 * Read models for the AI Front Desk inbox and the call log (brief §8.1–8.2). Callers must
 * already have proved shop access; every query is scoped by shopId so one shop never sees
 * another's calls.
 */

type TranscriptLine = { role: "assistant" | "customer"; text: string };

const transcriptOf = (raw: unknown): TranscriptLine[] => {
  const display = (raw as { display?: TranscriptLine[] } | null)?.display;
  return Array.isArray(display) ? display.map(({ role, text }) => ({ role, text })) : [];
};

/** AI follow-ups for a shop: open ones (oldest first, nothing gets buried) and recently done. */
export async function listAiTasks(shopId: string) {
  const select = {
    id: true,
    title: true,
    summary: true,
    intent: true,
    sentiment: true,
    done: true,
    doneAt: true,
    createdAt: true,
    doneBy: { select: { name: true } },
    booking: {
      select: {
        id: true,
        code: true,
        customer: { select: { name: true } },
        vehicle: { select: { make: true, model: true, plate: true } },
      },
    },
    callLog: { select: { durationSec: true, transcript: true } },
  } as const;

  const [open, done] = await Promise.all([
    prisma.aiTask.findMany({ where: { shopId, done: false }, orderBy: { createdAt: "asc" }, select }),
    prisma.aiTask.findMany({ where: { shopId, done: true }, orderBy: { doneAt: "desc" }, take: 10, select }),
  ]);
  const shape = (t: (typeof open)[number]) => ({
    ...t,
    callLog: undefined,
    durationSec: t.callLog?.durationSec ?? null,
    transcript: transcriptOf(t.callLog?.transcript),
  });
  return { open: open.map(shape), done: done.map(shape) };
}
export type AiTaskRow = Awaited<ReturnType<typeof listAiTasks>>["open"][number];

/** Call log for a shop, or for one booking of it. Newest first. */
export async function listCalls(shopId: string, opts: { bookingId?: string; take?: number } = {}) {
  const rows = await prisma.callLog.findMany({
    where: { shopId, ...(opts.bookingId ? { bookingId: opts.bookingId } : {}) },
    orderBy: { startedAt: "desc" },
    take: opts.take ?? 30,
    select: {
      id: true,
      direction: true,
      state: true,
      outcome: true,
      aiHandled: true,
      startedAt: true,
      durationSec: true,
      fromUser: { select: { name: true } },
      toUser: { select: { name: true } },
      answeredBy: { select: { name: true } },
      booking: { select: { id: true, code: true } },
    },
  });
  return rows.map((c) => ({
    id: c.id,
    direction: c.direction as "CUSTOMER_TO_SA" | "SA_TO_CUSTOMER",
    /** what happened, from the shop's point of view */
    outcome: (c.aiHandled
      ? "ai_handled"
      : c.state === "ringing" || c.state === "connected"
        ? c.state
        : (c.outcome ?? c.state)) as CallOutcome,
    from: c.fromUser?.name ?? "Unknown",
    to: c.answeredBy?.name ?? c.toUser?.name ?? (c.direction === "CUSTOMER_TO_SA" ? "Service advisors" : "Customer"),
    startedAt: c.startedAt,
    durationSec: c.durationSec,
    booking: c.booking,
  }));
}
export type CallOutcome = "ringing" | "connected" | "answered" | "missed" | "declined" | "ai_handled" | "ended";
export type CallRow = Awaited<ReturnType<typeof listCalls>>[number];
