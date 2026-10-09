"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Bot, Mic, MicOff, Phone, PhoneIncoming, PhoneOff, Send, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * In-app calling (brief §8.1) + AI Front Desk (§8.2), client side.
 *
 * Media: browser-to-browser WebRTC audio (public STUN). Signalling: the server stores the
 * caller's full SDP offer and the callee's answer (non-trickle ICE); both sides poll.
 * Customer → shop calls ring every advisor; unanswered after the ring timeout (or declined)
 * they're handed to the AI Front Desk, which talks via the browser's speech recognition and
 * speech synthesis (with a text box as fallback) and leaves the advisors a summary + task.
 */

type Incoming = {
  id: string;
  direction: string;
  offer: string | null;
  from: string;
  shopName: string;
  bookingCode: string | null;
  vehicle: string | null;
  href: string | null;
};
type Turn = { role: "assistant" | "customer"; text: string };

type Phase =
  | { kind: "idle" }
  | { kind: "incoming"; call: Incoming }
  | { kind: "outgoing"; label: string; startedAt: number; ringSeconds: number; direction?: string }
  | { kind: "connected"; label: string; since: number }
  | { kind: "ai"; label: string; turns: Turn[]; busy: boolean; ai: boolean }
  | { kind: "ended"; message: string };

type Ctx = { startCall: (bookingId: string, label: string) => void; busy: boolean };
const CallContext = createContext<Ctx>({ startCall: () => {}, busy: false });
export const useCalls = () => useContext(CallContext);

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

async function api<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message ?? "Request failed");
  return data as T;
}

const waitForIce = (pc: RTCPeerConnection, ms = 2500) =>
  new Promise<void>((resolve) => {
    if (pc.iceGatheringState === "complete") return resolve();
    const timer = setTimeout(resolve, ms);
    pc.addEventListener("icegatheringstatechange", () => {
      if (pc.iceGatheringState === "complete") {
        clearTimeout(timer);
        resolve();
      }
    });
  });

const mmss = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;

// Minimal typing for the (prefixed) Web Speech API.
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};
const speechRecognition = (): (new () => Recognition) | null => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

function speak(text: string) {
  try {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.02;
    window.speechSynthesis.speak(u);
  } catch {
    /* no TTS available — the transcript still shows the reply */
  }
}

export function CallProvider({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [muted, setMuted] = useState(false);
  const [now, setNow] = useState(0);
  const pc = useRef<RTCPeerConnection | null>(null);
  const mic = useRef<MediaStream | null>(null);
  const callId = useRef<string | null>(null);
  const direction = useRef<string | null>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const ignored = useRef<Set<string>>(new Set());
  const phaseRef = useRef<Phase>(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const cleanupMedia = useCallback(() => {
    pc.current?.close();
    pc.current = null;
    mic.current?.getTracks().forEach((t) => t.stop());
    mic.current = null;
    if (audio.current) audio.current.srcObject = null;
    setMuted(false);
  }, []);

  const finish = useCallback(
    (message: string) => {
      cleanupMedia();
      callId.current = null;
      setPhase({ kind: "ended", message });
      setTimeout(() => setPhase((p) => (p.kind === "ended" ? { kind: "idle" } : p)), 3500);
    },
    [cleanupMedia],
  );

  /** Microphone + peer connection; remote audio goes to the hidden <audio>. */
  const makePeer = useCallback(async () => {
    const peer = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peer.ontrack = (e) => {
      if (audio.current) audio.current.srcObject = e.streams[0] ?? new MediaStream([e.track]);
    };
    try {
      mic.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      mic.current.getTracks().forEach((t) => peer.addTrack(t, mic.current!));
    } catch {
      toast.warning("Microphone not available — you'll hear the other side but they won't hear you.");
      peer.addTransceiver("audio", { direction: "recvonly" });
    }
    pc.current = peer;
    return peer;
  }, []);

  // --- AI Front Desk -------------------------------------------------------------
  const startAi = useCallback(async (label: string) => {
    cleanupMedia();
    const id = callId.current;
    if (!id) return;
    setPhase({ kind: "ai", label, turns: [], busy: true, ai: false });
    try {
      const r = await api<{ reply: string; ai: boolean }>(`/api/calls/${id}/ai`, {});
      setPhase({ kind: "ai", label, turns: [{ role: "assistant", text: r.reply }], busy: false, ai: r.ai });
      speak(r.reply);
    } catch (e) {
      finish((e as Error).message);
    }
  }, [cleanupMedia, finish]);

  const sayToAi = useCallback(async (text: string) => {
    const id = callId.current;
    const p = phaseRef.current;
    if (!id || p.kind !== "ai" || !text.trim()) return;
    setPhase({ ...p, turns: [...p.turns, { role: "customer", text }], busy: true });
    try {
      const r = await api<{ reply: string }>(`/api/calls/${id}/ai`, { text });
      setPhase((cur) => (cur.kind === "ai" ? { ...cur, turns: [...cur.turns, { role: "assistant", text: r.reply }], busy: false } : cur));
      speak(r.reply);
    } catch (e) {
      toast.error((e as Error).message);
      setPhase((cur) => (cur.kind === "ai" ? { ...cur, busy: false } : cur));
    }
  }, []);

  const endAi = useCallback(async () => {
    const id = callId.current;
    window.speechSynthesis?.cancel();
    if (!id) return finish("Call ended");
    try {
      await api(`/api/calls/${id}/ai/end`, {});
      toast.success("Thanks! The shop has a summary of your call and will follow up.");
    } catch (e) {
      toast.error((e as Error).message);
    }
    finish("Call ended — the shop will follow up");
  }, [finish]);

  // --- Outgoing ------------------------------------------------------------------
  const startCall = useCallback(
    async (bookingId: string, label: string) => {
      if (phaseRef.current.kind !== "idle" && phaseRef.current.kind !== "ended") return;
      setPhase({ kind: "outgoing", label, startedAt: Date.now(), ringSeconds: 20 });
      try {
        const peer = await makePeer();
        await peer.setLocalDescription(await peer.createOffer());
        await waitForIce(peer);
        const r = await api<{ callId: string; direction: string; ringSeconds: number }>("/api/calls", {
          bookingId,
          offer: JSON.stringify(peer.localDescription),
        });
        callId.current = r.callId;
        direction.current = r.direction;
        setPhase({ kind: "outgoing", label, startedAt: Date.now(), ringSeconds: r.ringSeconds, direction: r.direction });
      } catch (e) {
        finish((e as Error).message);
      }
    },
    [makePeer, finish],
  );

  // Caller polls the call while ringing / connected.
  useEffect(() => {
    if (phase.kind !== "outgoing" && phase.kind !== "connected") return;
    let stop = false;
    const iv = setInterval(async () => {
      const id = callId.current;
      if (!id || stop) return;
      try {
        const { call } = await api<{ call: { state: string; answer: string | null; answeredBy: string | null } }>(`/api/calls/${id}`);
        const p = phaseRef.current;
        if (p.kind === "outgoing") {
          if (call.state === "connected" && call.answer && pc.current) {
            await pc.current.setRemoteDescription(JSON.parse(call.answer));
            setPhase({ kind: "connected", label: call.answeredBy ? `${p.label} · ${call.answeredBy}` : p.label, since: Date.now() });
          } else if (call.state === "missed" || call.state === "declined") {
            if (direction.current === "CUSTOMER_TO_SA") startAi(p.label);
            else finish(call.state === "declined" ? "Call declined" : "No answer");
          } else if (Date.now() - p.startedAt > p.ringSeconds * 1000) {
            await api(`/api/calls/${id}/missed`, {}).catch(() => {});
          }
        } else if (p.kind === "connected" && call.state !== "connected") {
          finish("Call ended");
        }
      } catch {
        /* transient — keep polling */
      }
    }, 1000);
    return () => {
      stop = true;
      clearInterval(iv);
    };
  }, [phase.kind, startAi, finish]);

  // --- Incoming ------------------------------------------------------------------
  useEffect(() => {
    if (phase.kind !== "idle") return;
    let stop = false;
    const poll = async () => {
      if (stop || document.hidden) return;
      try {
        const { calls } = await api<{ calls: Incoming[] }>("/api/calls/incoming");
        const next = calls.find((c) => !ignored.current.has(c.id));
        if (next && !stop && phaseRef.current.kind === "idle") setPhase({ kind: "incoming", call: next });
      } catch {
        /* signed out or offline */
      }
    };
    poll();
    const iv = setInterval(poll, 2500);
    return () => {
      stop = true;
      clearInterval(iv);
    };
  }, [phase.kind]);

  // The ringing call can stop ringing (caller hung up / someone else answered).
  useEffect(() => {
    if (phase.kind !== "incoming") return;
    const iv = setInterval(async () => {
      try {
        const { call } = await api<{ call: { state: string } }>(`/api/calls/${phase.call.id}`);
        if (call.state !== "ringing" && phaseRef.current.kind === "incoming") {
          ignored.current.add(phase.call.id);
          setPhase({ kind: "idle" });
        }
      } catch {
        setPhase({ kind: "idle" });
      }
    }, 1500);
    return () => clearInterval(iv);
  }, [phase]);

  const accept = useCallback(async () => {
    const p = phaseRef.current;
    if (p.kind !== "incoming" || !p.call.offer) return;
    const label = p.call.direction === "CUSTOMER_TO_SA" ? `${p.call.from}${p.call.bookingCode ? ` · ${p.call.bookingCode}` : ""}` : p.call.shopName;
    try {
      const peer = await makePeer();
      await peer.setRemoteDescription(JSON.parse(p.call.offer));
      await peer.setLocalDescription(await peer.createAnswer());
      await waitForIce(peer);
      await api(`/api/calls/${p.call.id}/answer`, { answer: JSON.stringify(peer.localDescription) });
      callId.current = p.call.id;
      direction.current = p.call.direction;
      setPhase({ kind: "connected", label, since: Date.now() });
    } catch (e) {
      ignored.current.add(p.call.id);
      cleanupMedia();
      toast.error((e as Error).message);
      setPhase({ kind: "idle" });
    }
  }, [makePeer, cleanupMedia]);

  const decline = useCallback(async () => {
    const p = phaseRef.current;
    if (p.kind !== "incoming") return;
    ignored.current.add(p.call.id);
    setPhase({ kind: "idle" });
    await api(`/api/calls/${p.call.id}/decline`, {}).catch(() => {});
  }, []);

  const hangUp = useCallback(async () => {
    const id = callId.current;
    if (id) await api(`/api/calls/${id}/end`, {}).catch(() => {});
    finish("Call ended");
  }, [finish]);

  const toggleMute = () => {
    const next = !muted;
    mic.current?.getAudioTracks().forEach((t) => (t.enabled = !next));
    setMuted(next);
  };

  // clock for the ring progress and call timer
  useEffect(() => {
    if (phase.kind !== "connected" && phase.kind !== "outgoing") return;
    const update = () => setNow(Date.now());
    update();
    const iv = setInterval(update, 500);
    return () => clearInterval(iv);
  }, [phase.kind]);

  const busy = phase.kind !== "idle" && phase.kind !== "ended";

  return (
    <CallContext.Provider value={{ startCall, busy }}>
      {children}
      <audio ref={audio} autoPlay playsInline className="hidden" />
      {phase.kind !== "idle" && (
        <div
          role="dialog"
          aria-label="Call"
          data-call-phase={phase.kind}
          className="fixed right-4 bottom-4 z-[60] w-[min(92vw,370px)] overflow-hidden rounded-2xl border border-line bg-surface-2 shadow-2xl shadow-black/40 animate-in slide-in-from-bottom-4 fade-in duration-200"
        >
          {phase.kind === "incoming" && (
            <div className="p-5">
              <div className="flex items-center gap-4">
                <span className="relative grid size-12 place-items-center rounded-full bg-teal/15 text-teal">
                  <span className="absolute inset-0 animate-ping rounded-full bg-teal/20" />
                  <PhoneIncoming className="relative size-5" />
                </span>
                <div className="min-w-0">
                  <p className="eyebrow">Incoming call</p>
                  <p className="truncate font-medium text-foreground">
                    {phase.call.direction === "CUSTOMER_TO_SA" ? phase.call.from : phase.call.shopName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[phase.call.bookingCode, phase.call.vehicle].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <Button variant="destructive" className="h-10" onClick={decline}>
                  <PhoneOff /> Decline
                </Button>
                <Button className="h-10 bg-teal text-[#04140f] hover:bg-teal/85" onClick={accept}>
                  <Phone /> Accept
                </Button>
              </div>
            </div>
          )}

          {phase.kind === "outgoing" && (
            <div className="p-5">
              <div className="flex items-center gap-4">
                <span className="relative grid size-12 place-items-center rounded-full bg-amber/15 text-amber">
                  <span className="absolute inset-0 animate-ping rounded-full bg-amber/20" />
                  <Phone className="relative size-5" />
                </span>
                <div className="min-w-0">
                  <p className="eyebrow">Calling…</p>
                  <p className="truncate font-medium text-foreground">{phase.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {phase.direction === "SA_TO_CUSTOMER"
                      ? "Ringing the customer in the BayFlow app."
                      : "If nobody picks up, our AI assistant will help you."}
                  </p>
                </div>
              </div>
              <div className="mt-4 h-1 overflow-hidden rounded-full bg-line">
                <div
                  className="h-full bg-amber transition-[width] duration-1000 ease-linear"
                  style={{ width: `${Math.min(100, Math.max(0, ((now - phase.startedAt) / (phase.ringSeconds * 1000)) * 100))}%` }}
                />
              </div>
              <Button variant="destructive" className="mt-4 h-10 w-full" onClick={hangUp}>
                <PhoneOff /> Cancel
              </Button>
            </div>
          )}

          {phase.kind === "connected" && (
            <div className="p-5">
              <div className="flex items-center gap-4">
                <span className="grid size-12 place-items-center rounded-full bg-teal/15 text-teal">
                  <Volume2 className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="eyebrow text-teal">Connected</p>
                  <p className="truncate font-medium text-foreground">{phase.label}</p>
                </div>
                <span className="font-mono text-lg text-foreground tabular">
                  {mmss(Math.max(0, Math.floor((now - phase.since) / 1000)))}
                </span>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <Button variant="outline" className="h-10" onClick={toggleMute}>
                  {muted ? <MicOff /> : <Mic />} {muted ? "Unmute" : "Mute"}
                </Button>
                <Button variant="destructive" className="h-10" onClick={hangUp}>
                  <PhoneOff /> Hang up
                </Button>
              </div>
            </div>
          )}

          {phase.kind === "ai" && <AiPanel phase={phase} onSay={sayToAi} onEnd={endAi} />}

          {phase.kind === "ended" && (
            <div className="flex items-center gap-3 p-4 text-sm text-muted-foreground">
              <PhoneOff className="size-4" /> {phase.message}
            </div>
          )}
        </div>
      )}
    </CallContext.Provider>
  );
}

function AiPanel({
  phase,
  onSay,
  onEnd,
}: {
  phase: Extract<Phase, { kind: "ai" }>;
  onSay: (text: string) => void;
  onEnd: () => void;
}) {
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const rec = useRef<Recognition | null>(null);
  const list = useRef<HTMLDivElement>(null);
  const Speech = speechRecognition();

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" });
  }, [phase.turns.length]);

  useEffect(() => () => rec.current?.stop(), []);

  const listen = () => {
    if (!Speech) return;
    if (listening) {
      rec.current?.stop();
      return;
    }
    window.speechSynthesis?.cancel();
    const r = new Speech();
    r.lang = "en-US";
    r.interimResults = false;
    r.continuous = false;
    r.onresult = (e) => {
      const said = Array.from(e.results)
        .map((res) => res[0]?.transcript ?? "")
        .join(" ")
        .trim();
      if (said) onSay(said);
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    rec.current = r;
    setListening(true);
    r.start();
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || phase.busy) return;
    onSay(text.trim());
    setText("");
  };

  return (
    <div className="flex max-h-[70vh] flex-col">
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <span className="grid size-9 place-items-center rounded-full bg-signal-violet/15 text-signal-violet">
          <Bot className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="eyebrow text-signal-violet">AI Front Desk</p>
          <p className="truncate text-sm text-foreground">{phase.label}</p>
        </div>
        <span className="rounded-full border border-line px-2 py-px text-[10px] text-muted-foreground">
          {phase.ai ? "Claude" : "assistant"}
        </span>
      </div>
      <div ref={list} className="flex-1 space-y-2 overflow-y-auto px-4 py-3" aria-live="polite">
        {phase.turns.map((t, i) => (
          <p
            key={i}
            className={cn(
              "max-w-[88%] rounded-2xl px-3 py-2 text-sm",
              t.role === "assistant"
                ? "rounded-tl-sm bg-surface text-foreground"
                : "ml-auto rounded-tr-sm bg-amber/15 text-foreground",
            )}
            data-role={t.role}
          >
            {t.text}
          </p>
        ))}
        {phase.busy && <p className="text-xs text-muted-foreground">Assistant is typing…</p>}
      </div>
      <form onSubmit={submit} className="flex items-center gap-2 border-t border-line p-3">
        {Speech && (
          <Button
            type="button"
            variant={listening ? "default" : "outline"}
            size="icon-lg"
            onClick={listen}
            aria-label={listening ? "Stop listening" : "Speak"}
            title={listening ? "Listening…" : "Hold a conversation by voice"}
          >
            <Mic className={cn(listening && "animate-pulse")} />
          </Button>
        )}
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type or speak…"
          aria-label="Message to the assistant"
          className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-amber/50"
        />
        <Button type="submit" size="icon-lg" disabled={phase.busy || !text.trim()} aria-label="Send">
          <Send />
        </Button>
      </form>
      <div className="px-3 pb-3">
        <Button variant="destructive" className="h-9 w-full" onClick={onEnd}>
          <PhoneOff /> End call
        </Button>
      </div>
    </div>
  );
}

/** "Call the shop" / "Call customer" button for a booking page. */
export function CallButton({ bookingId, label, children }: { bookingId: string; label: string; children: React.ReactNode }) {
  const { startCall, busy } = useCalls();
  return (
    <Button variant="outline" className="h-9" disabled={busy} onClick={() => startCall(bookingId, label)}>
      <Phone /> {children}
    </Button>
  );
}
