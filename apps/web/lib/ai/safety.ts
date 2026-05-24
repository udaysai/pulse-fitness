/**
 * AI safety guardrails — pre-filter user inputs, post-filter AI outputs.
 * Pulse is a fitness coach, NOT a medical professional. Refuse anything that
 * looks like a medical/diagnostic/prescription question.
 */

const MEDICAL_KEYWORDS = [
  /\b(diagnos(e|is|ing)|treat(ment)?|cure|prescription|prescribe|medication|medicine|drug|pill)\b/i,
  /\b(symptom|disease|condition|disorder|syndrome|cancer|tumor|infection)\b/i,
  /\b(dosage|mg|milligram|microgram|iu\b)/i,
  /\b(insulin|metformin|adderall|ozempic|wegovy|statin|ssri|anti-?depressant|opioid|steroid|testosterone|tren\b)/i,
  /\b(blood\s*pressure|cholesterol|diabetes|hypertension|thyroid|adhd|anxiety|depression)\b.*\?/i,
  /\b(should i (take|stop taking)|can i (take|combine))\b/i,
];

const INJURY_KEYWORDS = [
  /\b(broken|fractur|torn|rupture|severe pain|sharp pain|can'?t move|emergency)\b/i,
];

export type SafetyResult =
  | { ok: true }
  | { ok: false; reason: "medical" | "injury" | "self_harm"; reply: string };

const REPLY_MEDICAL =
  "I can help with training, nutrition, recovery, and habits — but I can't give medical advice or recommend medications. For anything diagnostic or prescription-related, please talk to your doctor or a qualified clinician.";

const REPLY_INJURY =
  "That sounds like it needs in-person assessment. Please see a doctor, physio, or urgent care today — don't wait. I'm not the right tool for acute injuries.";

const REPLY_SELF_HARM =
  "If you're in crisis, please reach out to a crisis line right now — Lifeline (US): 988, Samaritans (UK): 116 123, or your local emergency number. You deserve support from a real human.";

export function checkUserInput(text: string): SafetyResult {
  const t = text.trim();
  if (!t) return { ok: true };

  if (/\b(suicide|kill myself|self.?harm|end it all)\b/i.test(t)) {
    return { ok: false, reason: "self_harm", reply: REPLY_SELF_HARM };
  }

  for (const re of INJURY_KEYWORDS) {
    if (re.test(t)) return { ok: false, reason: "injury", reply: REPLY_INJURY };
  }

  for (const re of MEDICAL_KEYWORDS) {
    if (re.test(t)) return { ok: false, reason: "medical", reply: REPLY_MEDICAL };
  }

  return { ok: true };
}

/**
 * Wrap user-supplied free text so it can never be mistaken for system instructions.
 * Prompt-injection defense.
 */
export function wrapUntrusted(text: string): string {
  return `<<<USER_INPUT_BEGIN>>>\n${text}\n<<<USER_INPUT_END>>>`;
}
