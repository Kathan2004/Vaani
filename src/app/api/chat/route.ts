import { NextResponse } from "next/server";
import { rateLimited, sanitizeMessages, together } from "@/lib/guard";
import { buildSystemPrompt } from "@/lib/philosophers";

const MODEL = process.env.VAANI_MODEL || "meta-llama/Llama-3.3-70B-Instruct-Turbo";

export async function POST(req: Request) {
  try {
    if (rateLimited(req)) {
      return NextResponse.json({ reply: "Even Sisyphus pauses at the top. Try again in a minute." }, { status: 429 });
    }
    const body = await req.json().catch(() => null);
    const messages = sanitizeMessages(body?.messages);
    if (!messages) {
      return NextResponse.json({ error: "messages must be user/assistant turns ending with a user message" }, { status: 400 });
    }

    const response = await together().chat.completions.create({
      model: MODEL,
      messages: [{ role: "system" as const, content: buildSystemPrompt(body?.lens, body?.lang) }, ...messages],
      max_tokens: 900,
      temperature: 0.85,
    });

    const reply =
      response?.choices?.[0]?.message?.content ||
      "The silence of the world answered first. Ask again.";
    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Chat request failed:", error);
    return NextResponse.json({ reply: "Something failed on my side, not yours. Try again in a moment." }, { status: 500 });
  }
}
