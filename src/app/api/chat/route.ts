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
      content: `You are Manastithi, a compassionate therapy chatbot designed to provide mental health support, stress relief, and motivation.
      - Always respond with empathy and encouragement.
      - Dont answer any questions other than the ones related to mental health.
      - Offer mindfulness techniques, breathing exercises, and cognitive reframing methods when relevant.
      - Avoid diagnosing or providing medical advice.
      - Keep responses positive and constructive but breif and to the point.
      - Use structured responses with **bold headings**, bullet points for clarity, and a calm tone.`,
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

