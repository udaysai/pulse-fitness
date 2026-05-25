import { NextResponse } from "next/server";
import { z } from "zod";
import { getGeminiClient, GEMINI_MODELS } from "@/lib/ai/gemini";
import { CHAT_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { checkUserInput, wrapUntrusted } from "@/lib/ai/safety";
import { isGeminiConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateCurrentThread, getMessagesForThread } from "@/lib/queries/chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PostSchema = z.object({
  content: z.string().min(1).max(4000),
});

/** GET — load the user's chat history (their current thread). */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const thread = await getOrCreateCurrentThread(user.id);
  const messages = await getMessagesForThread(thread.id);
  return NextResponse.json({
    thread_id: thread.id,
    messages: messages.map((m) => ({ role: m.role, content: m.content, id: m.id })),
  });
}

/** DELETE — clear the current thread (deletes all its messages). */
export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const thread = await getOrCreateCurrentThread(user.id);
  const { error } = await supabase.from("chat_messages").delete().eq("thread_id", thread.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/** POST — send a new message; streams the assistant's reply via SSE. */
export async function POST(req: Request) {
  if (!isGeminiConfigured()) {
    return NextResponse.json(
      { error: "Gemini not configured. Set GEMINI_API_KEY." },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: z.infer<typeof PostSchema>;
  try {
    body = PostSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  // Ensure thread + persist the user message FIRST so a crash mid-stream doesn't lose it
  const thread = await getOrCreateCurrentThread(user.id);
  await supabase.from("chat_messages").insert({
    thread_id: thread.id,
    role: "user",
    content: body.content,
  });

  // Safety pre-filter
  const safety = checkUserInput(body.content);
  if (!safety.ok) {
    // Persist the refusal so it shows in history on refresh
    await supabase.from("chat_messages").insert({
      thread_id: thread.id,
      role: "assistant",
      content: safety.reply,
      model: "safety-filter",
    });
    return streamLiteral(safety.reply);
  }

  // Build context: load the last N messages from this thread (gives Gemini conversational memory)
  const history = await getMessagesForThread(thread.id, 30);
  const contents = history.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.role === "user" ? wrapUntrusted(m.content) : m.content }],
  }));

  const client = getGeminiClient();
  const stream = await client.models.generateContentStream({
    model: GEMINI_MODELS.chat,
    contents,
    config: {
      systemInstruction: CHAT_SYSTEM_PROMPT,
      temperature: 0.6,
      maxOutputTokens: 1024,
    },
  });

  const encoder = new TextEncoder();
  const body$ = new ReadableStream({
    async start(controller) {
      let full = "";
      try {
        for await (const chunk of stream) {
          const text = chunk.text;
          if (text) {
            full += text;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: text })}\n\n`));
          }
        }
        // Persist the assistant message after the stream completes
        if (full.trim()) {
          await supabase.from("chat_messages").insert({
            thread_id: thread.id,
            role: "assistant",
            content: full,
            model: GEMINI_MODELS.chat,
          });
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
      } catch (e) {
        const msg = e instanceof Error ? e.message : "stream_error";
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(body$, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

function streamLiteral(text: string): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: text })}\n\n`));
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform" },
  });
}
