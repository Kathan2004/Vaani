import { NextResponse } from "next/server";
import { MAX_CHARS, rateLimited, together } from "@/lib/guard";

export async function POST(req: Request) {
  try {
    if (rateLimited(req)) {
      return NextResponse.json({ error: "Too many requests. Please wait a minute." }, { status: 429 });
    }
    const body = await req.json().catch(() => null);
    const journalEntry = typeof body?.journalEntry === "string" ? body.journalEntry.trim() : "";
    if (!journalEntry || journalEntry.length > MAX_CHARS) {
      return NextResponse.json({ error: `Journal entry is required (max ${MAX_CHARS} characters)` }, { status: 400 });
    }

 const journalPrompt: { role: "system" | "user"; content: string }[] = [
  {
    role: "system",
    content: `You are Vaani, a knowledgeable and culturally rooted guide focused on Indian heritage and virtual exploration. Analyze the travel journal or cultural reflection provided and extract exactly 3 key cultural insights. Format your response as follows:

1. First key insight about historical or cultural significance
2. Second key insight about local traditions, customs, or practices
3. Third key insight offering a recommended experience, site, or story for deeper exploration
4. Also respond in any language requested by the user.

Keep each insight concise (1-2 sentences). Separate insights with exactly one newline. Do not add any additional text or formatting.`,
  },
  { role: "user", content: `Here is my journal entry: \n${journalEntry}` },
];

    const response = await together().chat.completions.create({
      model: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
      messages: journalPrompt, 
      max_tokens: 500,
    });

    const insights = response?.choices?.[0]?.message?.content || "No insights generated.";

    const formattedInsights = insights
      .split(/\d+\.\s+/) 
      .filter(insight => insight.trim()) 
      .map(insight => insight.trim()) 
      .slice(0, 3); 

    return NextResponse.json({ insights: formattedInsights.join('\n') });
  } catch (error) {
    console.error("Error in journal processing:", error);
    return NextResponse.json({ error: "Server error while processing journal entry." }, { status: 500 });
  }
}
