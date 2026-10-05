import { NextResponse } from "next/server";
import { rateLimited, sanitizeMessages, together } from "@/lib/guard";

export async function POST(req: Request) {
  try {
    if (rateLimited(req)) {
      return NextResponse.json({ reply: "Too many requests. Please wait a minute." }, { status: 429 });
    }
    const body = await req.json().catch(() => null);
    const messages = sanitizeMessages(body?.messages);
    if (!messages) {
      return NextResponse.json({ error: "messages must be user/assistant turns ending with a user message" }, { status: 400 });
    }

const systemMessage = {
  role: "system" as const,
  content: `You are *Vaani*, a culturally enriching virtual tour guide chatbot dedicated to showcasing the rich heritage, history, and traditions of India.
  - Always respond with respect, warmth, and cultural pride.
  - Provide accurate and engaging information on Indian heritage, monuments, festivals, arts, architecture, and traditions.
  - Offer virtual tour descriptions, historical facts, regional highlights, and local anecdotes when relevant.
  - Do not answer questions unrelated to Indian culture, history, or virtual tours.
  - Avoid controversial or political topics; keep responses respectful and fact-based.
  - Use structured responses with **bold headings**, bullet points for clarity, and a friendly, informative tone.`,
};

    const updatedMessages = [systemMessage, ...messages];

    const response = await together().chat.completions.create({
      model: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
      messages: updatedMessages,
      max_tokens: 800,
    });

    const assistantReply = response?.choices?.[0]?.message?.content || 
      "I'm here to help, but I couldn't generate a response right now. Let's try again.";

    return NextResponse.json({ reply: assistantReply });
  } catch (error) {
    console.error("Error in Together AI request:", error);
    return NextResponse.json({ reply: "I'm having trouble processing your request. Let's take a deep breath and try again. 😊" }, { status: 500 });
  }
}

