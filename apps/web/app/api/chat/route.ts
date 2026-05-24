import { NextResponse } from "next/server";
import { z } from "zod";
import { getGeminiClient, GEMINI_MODELS } from "@/lib/ai/gemini";
import { CHAT_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { checkUserInput, wrapUntrusted } from "@/lib/ai/safety";
import { isGeminiConfigured } from "@/lib/env";

export const runtime = "nodejs"; // streaming SSE
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(40),
});

export async function POST(req: Request) {
  if (!isGeminiConfigured()) {
    return NextResponse.json(
      { error: "Gemini not configured. Set GEMINI_API_KEY in .env.local" },
      { status: 503 },
    );
  }

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Safety pre-filter on the most recent user message
  const lastUser = [...body.messages].reverse().find((m) => m.role === "user");
  if (lastUser) {
    const safety = checkUserInput(lastUser.content);
    if (!safety.ok) {
      // Return a single-chunk SSE stream with the refusal so the UI handles it uniformly.
      return streamLiteral(safety.reply);
    }
  }

  // Build Gemini contents — wrap user text as untrusted
  const contents = body.messages.map((m) => ({
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
      try {
        for await (const chunk of stream) {
          const text = chunk.text;
          if (text) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: text })}\n\n`));
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
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
