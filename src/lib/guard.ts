/**
 * Request guards for the LLM routes: input validation and a per-client rate limit.
 * The routes proxy to a paid model, so unbounded or unvalidated input costs money
 * and lets callers override the system prompt.
 */
import Together from "together-ai";

export const MAX_MESSAGES = 20;
export const MAX_CHARS = 4000;
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 20;

export type ChatMessage = { role: "user" | "assistant"; content: string };

let client: Together | null = null;

/** Lazily create the client so a missing key fails the request, not the build. */
export function together(): Together {
  const apiKey = process.env.TOGETHER_API_KEY;
  if (!apiKey) throw new Error("TOGETHER_API_KEY is not configured");
  client ??= new Together({ apiKey });
  return client;
}

/** Accept only user/assistant turns with bounded string content; drop anything else. */
export function sanitizeMessages(input: unknown): ChatMessage[] | null {
  if (!Array.isArray(input) || input.length === 0) return null;
  const messages: ChatMessage[] = [];
  for (const m of input.slice(-MAX_MESSAGES)) {
    if (!m || typeof m !== "object") return null;
    const { role, content } = m as Record<string, unknown>;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") return null;
    const trimmed = content.trim();
    if (!trimmed) continue;
    // Long model replies from history are truncated; oversized user input is rejected.
    if (role === "user" && trimmed.length > MAX_CHARS) return null;
    messages.push({ role, content: trimmed.slice(0, MAX_CHARS) });
  }
  return messages[messages.length - 1]?.role === "user" ? messages : null;
}

const hits = new Map<string, number[]>();

/** Sliding-window limiter keyed by client IP. In-memory: per instance, best effort. */
export function rateLimited(req: Request): boolean {
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "local";
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 10_000) hits.clear();
  return recent.length > MAX_REQUESTS_PER_WINDOW;
}
