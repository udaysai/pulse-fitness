import { createClient } from "@/lib/supabase/server";

export type ChatThread = {
  id: string;
  user_id: string;
  title: string | null;
  created_at: string;
};

export type ChatMessage = {
  id: string;
  thread_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  tokens_in: number | null;
  tokens_out: number | null;
  model: string | null;
  created_at: string;
};

/** Find the user's most recent thread, or create a new one. */
export async function getOrCreateCurrentThread(userId: string): Promise<ChatThread> {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("chat_threads")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<ChatThread>();
  if (existing) return existing;

  const { data: created, error } = await supabase
    .from("chat_threads")
    .insert({ user_id: userId, title: "Coach chat" })
    .select("*")
    .single<ChatThread>();
  if (error || !created) throw new Error(error?.message ?? "Failed to create thread");
  return created;
}

export async function getMessagesForThread(threadId: string, limit = 200): Promise<ChatMessage[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .limit(limit);
  return (data ?? []) as ChatMessage[];
}
