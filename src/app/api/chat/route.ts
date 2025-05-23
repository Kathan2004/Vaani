import { NextResponse } from "next/server";
import Together from "together-ai";

const together = new Together({
  apiKey: process.env.TOGETHER_API_KEY || "", 
});

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Messages array is required" }, { status: 400 });
    }

const systemMessage = {
  role: "system",
  content: `You are *Vaani*, a culturally enriching virtual tour guide chatbot dedicated to showcasing the rich heritage, history, and traditions of India.
  - Always respond with respect, warmth, and cultural pride.
  - Provide accurate and engaging information on Indian heritage, monuments, festivals, arts, architecture, and traditions.
  - Offer virtual tour descriptions, historical facts, regional highlights, and local anecdotes when relevant.
  - Do not answer questions unrelated to Indian culture, history, or virtual tours.
  - Avoid controversial or political topics; keep responses respectful and fact-based.
  - Use structured responses with **bold headings**, bullet points for clarity, and a friendly, informative tone.`,
};

    const updatedMessages = [systemMessage, ...messages];

    const response = await together.chat.completions.create({
      model: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
      messages: updatedMessages,
    });

    const assistantReply = response?.choices?.[0]?.message?.content || 
      "I'm here to help, but I couldn't generate a response right now. Let's try again.";

    return NextResponse.json({ reply: assistantReply });
  } catch (error) {
    console.error("Error in Together AI request:", error);
    return NextResponse.json({ reply: "I'm having trouble processing your request. Let's take a deep breath and try again. 😊" }, { status: 500 });
  }
}

