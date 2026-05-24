import { GoogleGenAI } from "@google/genai";
import { env, isGeminiConfigured } from "@/lib/env";

let _client: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!isGeminiConfigured()) {
    throw new Error("GEMINI_API_KEY is not set in .env.local");
  }
  if (!_client) {
    _client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY! });
  }
  return _client;
}

export const GEMINI_MODELS = {
  chat: "gemini-2.5-flash",
  plan: "gemini-2.5-flash",
  insights: "gemini-2.5-pro",
  classify: "gemini-2.5-flash-lite",
  embed: "text-embedding-004",
} as const;
