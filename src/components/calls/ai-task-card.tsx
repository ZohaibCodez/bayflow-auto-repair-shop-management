"use client";

import Link from "next/link";
import { Bot, Check, ChevronDown, Frown, Meh, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAction } from "@/components/use-action";
import { completeAiTaskAction } from "@/server/actions/shop";
import { formatRelative } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { AiTaskRow } from "@/server/queries/calls";
import { formatDuration } from "./call-log";

const SENTIMENT = {
  positive: { icon: Smile, label: "Positive", tone: "text-teal-ink" },
  neutral: { icon: Meh, label: "Neutral", tone: "text-muted-foreground" },
  negative: { icon: Frown, label: "Upset", tone: "text-signal-red" },
} as const;

/**
 * One AI Front Desk follow-up: the task the AI left, its summary of the call, the full
 * transcript on demand, and the advisor's "done" button.
 */
export function AiTaskCard({ task, shopId }: { task: AiTaskRow; shopId: string }) {
  const { pending, exec } = useAction();
  const mood = SENTIMENT[(task.sentiment as keyof typeof SENTIMENT) ?? "neutral"] ?? SENTIMENT.neutral;
  const Mood = mood.icon;
  const duration = formatDuration(task.durationSec);

  return (
    <article
      data-testid="ai-task"
      className={cn("panel p-4 sm:p-5", task.done && "opacity-70")}
      aria-label={task.title}
    >
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-signal-violet/30 bg-signal-violet/10 text-signal-violet">
          <Bot className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className={cn("text-[0.95rem] font-medium text-foreground", task.done && "line-through decoration-muted-foreground/60")}>
            {task.title}
          </h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            {task.booking && (
              <Link href={`/pos/${shopId}/bookings/${task.booking.id}`} className="font-mono hover:text-foreground">
                {task.booking.code}
              </Link>
            )}
            {task.booking && (
              <span>
                · {task.booking.customer.name} · {task.booking.vehicle.make} {task.booking.vehicle.model}
              </span>
            )}
            <span>· {formatRelative(task.createdAt)}</span>
            {duration && <span>· {duration} call</span>}
          </p>
        </div>
        {!task.done ? (
          <Button
            size="sm"
            variant="outline"
            className="h-8 shrink-0 px-3"
            disabled={pending}
            onClick={() => exec(() => completeAiTaskAction(shopId, task.id))}
          >
            <Check /> Mark done
          </Button>
        ) : (
          <span className="shrink-0 text-xs text-muted-foreground">
            Done{task.doneBy ? ` by ${task.doneBy.name}` : ""}
            {task.doneAt ? ` · ${formatRelative(task.doneAt)}` : ""}
          </span>
        )}
      </div>

      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{task.summary}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        {task.intent && (
          <span className="rounded-full border border-line bg-surface-2 px-2 py-0.5 text-muted-foreground capitalize">
            {task.intent}
          </span>
        )}
        <span className={cn("inline-flex items-center gap-1", mood.tone)}>
          <Mood className="size-3.5" /> {mood.label}
        </span>
      </div>

      {task.transcript.length > 0 && (
        <details className="group/transcript mt-3">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ChevronDown className="size-3.5 transition-transform group-open/transcript:rotate-180" />
            Transcript ({task.transcript.length} lines)
          </summary>
          <ol className="mt-2 space-y-1.5 rounded-xl border border-line bg-surface-2/50 p-3 text-sm">
            {task.transcript.map((line, i) => (
              <li key={i} className="flex gap-2">
                <span
                  className={cn(
                    "w-16 shrink-0 text-xs leading-5",
                    line.role === "assistant" ? "text-signal-violet" : "text-amber-ink",
                  )}
                >
                  {line.role === "assistant" ? "AI" : "Customer"}
                </span>
                <span className="text-foreground/90">{line.text}</span>
              </li>
            ))}
          </ol>
        </details>
      )}
    </article>
  );
}
