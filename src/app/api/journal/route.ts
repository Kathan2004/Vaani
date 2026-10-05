import { NextResponse } from "next/server";
import { MAX_CHARS, rateLimited, together } from "@/lib/guard";
import { buildReadingPrompt } from "@/lib/philosophers";

const MODEL = process.env.VAANI_MODEL || "meta-llama/Llama-3.3-70B-Instruct-Turbo";

export async function POST(req: Request) {
  try {
    if (rateLimited(req)) {
      return NextResponse.json({ error: "Too many requests. Please wait a minute." }, { status: 429 });
    }
    const body = await req.json().catch(() => null);
    const journalEntry = typeof body?.journalEntry === "string" ? body.journalEntry.trim() : "";
    if (!journalEntry || journalEntry.length > MAX_CHARS) {
      return NextResponse.json({ error: `Entry is required (max ${MAX_CHARS} characters)` }, { status: 400 });
    }
    const mood = typeof body?.mood === "string" ? body.mood.slice(0, 30) : "";

    const response = await together().chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system" as const, content: buildReadingPrompt(body?.lang) },
        { role: "user" as const, content: `${mood ? `State of mind: ${mood}\n\n` : ""}Notebook entry:\n${journalEntry}` },
      ],
      max_tokens: 700,
      temperature: 0.8,
    });

    const text = response?.choices?.[0]?.message?.content?.trim() || "";
    const readings = text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const m = /^\**([^:*]{2,40})\**\s*:\s*(.+)$/.exec(line);
        return m ? { thinker: m[1].trim(), text: m[2].trim() } : { thinker: "", text: line };
      });

    return NextResponse.json({ readings, insights: readings.map((r) => (r.thinker ? `${r.thinker}: ${r.text}` : r.text)).join("\n") });
  } catch (error) {
    console.error("Reading request failed:", error);
    return NextResponse.json({ error: "Server error while reading the entry." }, { status: 500 });
  }
}
