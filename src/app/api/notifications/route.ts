import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/rbac";

/** The bell: latest notifications + unread count for the signed-in user (polled by SWR). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const [items, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, type: true, message: true, href: true, read: true, createdAt: true },
    }),
    prisma.notification.count({ where: { userId: user.id, read: false } }),
  ]);
  return NextResponse.json({ unread, items });
}

const markSchema = z.object({ id: z.string().min(1).optional() });

/** Mark one notification (or all) as read. Scoped to the caller's own notifications. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const parsed = markSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 422 });

  await prisma.notification.updateMany({
    where: { userId: user.id, read: false, ...(parsed.data.id ? { id: parsed.data.id } : {}) },
    data: { read: true },
  });
  return NextResponse.json({ ok: true });
}
