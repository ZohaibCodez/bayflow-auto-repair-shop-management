import { Bot, Phone } from "lucide-react";
import { guard } from "@/lib/page-guard";
import { requireShopAccess } from "@/lib/rbac";
import { listAiTasks, listCalls } from "@/server/queries/calls";
import { AiTaskCard } from "@/components/calls/ai-task-card";
import { CallLogList } from "@/components/calls/call-log";
import { EmptyState, PageHeader } from "@/components/pos/page-header";

/**
 * The advisors' inbox for calls (brief §8.2): what the AI Front Desk handled while nobody
 * could pick up — a summary and a task per call, closed with "Mark done" — and the full call
 * log for the shop.
 */
export default async function CallsPage({ params }: PageProps<"/pos/[shopId]/calls">) {
  const { shopId } = await params;
  await guard(requireShopAccess(shopId, ["OWNER", "SERVICE_ADVISOR"]), `/pos/${shopId}/calls`);
  const [tasks, calls] = await Promise.all([listAiTasks(shopId), listCalls(shopId)]);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <PageHeader
        eyebrow="Front desk"
        title="Calls & AI follow-ups"
        description="When no advisor answers a customer's call within 20 seconds, the AI Front Desk takes it, answers from the customer's own bookings, and leaves you a summary and a task here."
      />

      <section className="space-y-3" aria-labelledby="open-tasks">
        <h2 id="open-tasks" className="eyebrow">
          Open follow-ups · {tasks.open.length}
        </h2>
        {tasks.open.length ? (
          <div className="space-y-3">
            {tasks.open.map((t) => (
              <AiTaskCard key={t.id} task={t} shopId={shopId} />
            ))}
          </div>
        ) : (
          <EmptyState icon={<Bot className="size-6" />} title="Nothing to follow up">
            Calls the AI Front Desk handles will leave a task here.
          </EmptyState>
        )}
      </section>

      {tasks.done.length > 0 && (
        <section className="space-y-3" aria-labelledby="done-tasks">
          <h2 id="done-tasks" className="eyebrow">
            Recently done
          </h2>
          <div className="space-y-3">
            {tasks.done.map((t) => (
              <AiTaskCard key={t.id} task={t} shopId={shopId} />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3" aria-labelledby="call-log">
        <h2 id="call-log" className="eyebrow">
          Call log
        </h2>
        {calls.length ? (
          <CallLogList calls={calls} bookingHref={(id) => `/pos/${shopId}/bookings/${id}`} />
        ) : (
          <EmptyState icon={<Phone className="size-6" />} title="No calls yet">
            Calls made from a booking page show up here.
          </EmptyState>
        )}
      </section>
    </div>
  );
}
