"use client";

import { useState } from "react";
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
        "Hey! I'm Pulse. Ask me anything about your training, recovery, or nutrition. I can't give medical advice — that's a job for your doctor.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!input.trim() || busy) return;
    const text = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setBusy(true);

    // TODO Week 3: real Gemini streaming via /api/chat
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            "Streaming chat lands in Week 3 — once Gemini is wired up I'll answer this with context from your recent metrics.",
        },
      ]);
      setBusy(false);
    }, 600);
  }

  return (
    <div className="mx-auto flex h-dvh max-w-md flex-col">
      <PageHeader title="Chat" subtitle="Your AI fitness companion." accentHex={ACCENT_HEX.workout} />

      <div className="flex-1 overflow-y-auto px-5 pb-4">
        <div className="flex flex-col gap-5 pt-4">
          {messages.map((m, i) => (
            <ChatBubble key={i} role={m.role}>
              {m.content}
            </ChatBubble>
          ))}
          {busy && (
            <div className="flex items-center gap-2 text-text-tertiary">
              <Sparkles className="size-3 animate-pulse" />
              <span className="text-xs">Thinking…</span>
            </div>
          )}
        </div>
      </div>

      <div className="sticky bottom-20 px-5 pb-3">
        <div className="flex items-center gap-2 rounded-full border border-hairline bg-surface px-4 py-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
            placeholder="Ask Pulse…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-text-tertiary"
          />
          <button
            onClick={send}
            disabled={!input.trim() || busy}
            className={cn(
              "grid size-8 place-items-center rounded-full text-white transition-opacity disabled:opacity-30"
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
