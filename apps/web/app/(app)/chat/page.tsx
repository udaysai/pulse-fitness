"use client";

import { useRef, useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ChatBubble } from "@/components/ui/ChatBubble";
import { ACCENT_HEX } from "@/lib/design/accents";
import { cn } from "@/lib/utils";

type Message = { role: "user" | "assistant"; content: string };

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hey — I'm Pulse. Ask me about training, recovery, nutrition, or habits. I'm not a doctor though, so anything diagnostic or prescription-related, see a real clinician.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  async function send() {
    if (!input.trim() || busy) return;
    const text = input.trim();
    setInput("");

    const nextMsgs: Message[] = [...messages, { role: "user", content: text }];
    setMessages(nextMsgs);
    setBusy(true);

    // Add empty assistant message we'll append into
    setMessages((m) => [...m, { role: "assistant", content: "" }]);

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMsgs }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        appendLast(`⚠️ ${err.error ?? "Request failed"}`);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        // SSE: split on double newlines
        const events = buf.split("\n\n");
        buf = events.pop() ?? "";

        for (const evt of events) {
          const line = evt.split("\n").find((l) => l.startsWith("data: "));
          if (!line) continue;
          try {
            const payload = JSON.parse(line.slice(6));
            if (payload.delta) appendLast(payload.delta);
            if (payload.error) appendLast(`\n⚠️ ${payload.error}`);
          } catch {
            // Ignore malformed JSON chunks
          }
        }
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) {
        appendLast(`\n⚠️ ${e instanceof Error ? e.message : "Connection lost"}`);
      }
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  function appendLast(delta: string) {
    setMessages((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (last?.role === "assistant") {
        next[next.length - 1] = { ...last, content: last.content + delta };
      }
      return next;
    });
  }

  return (
    <div className="mx-auto flex h-dvh max-w-md flex-col">
      <PageHeader title="Chat" subtitle="Your AI fitness companion." accentHex={ACCENT_HEX.workout} />

      <div className="flex-1 overflow-y-auto px-5 pb-4">
        <div className="flex flex-col gap-5 pt-4">
          {messages.map((m, i) => (
            <ChatBubble key={i} role={m.role}>
              {m.content || (busy && i === messages.length - 1 ? <ThinkingDots /> : null)}
            </ChatBubble>
          ))}
        </div>
      </div>

      <div className="sticky bottom-20 px-5 pb-3">
        <div className="flex items-center gap-2 rounded-full border border-hairline bg-surface px-4 py-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Ask Pulse…"
            disabled={busy}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-text-tertiary disabled:opacity-50"
          />
          <button
            onClick={send}
            disabled={!input.trim() || busy}
            aria-label="Send"
            className={cn(
              "grid size-8 place-items-center rounded-full text-white transition-opacity disabled:opacity-30",
            )}
            style={{ backgroundColor: ACCENT_HEX.workout }}
          >
            <Send className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-1 text-text-tertiary">
      <Sparkles className="size-3 animate-pulse" />
      <span className="text-xs">Thinking…</span>
    </span>
  );
}
