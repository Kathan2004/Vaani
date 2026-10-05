# Vaani: Your Bharat Explore Guide

A voice-first virtual tour guide for Indian heritage. Ask about monuments, festivals, art forms, architecture and regional traditions, by typing or speaking in one of ten languages, and Vaani answers in a structured, culturally grounded way. A travel journal turns your notes into three curated cultural insights.

## Features

- **Conversational guide.** Llama 3.3 70B (via Together AI) with a system prompt scoped to Indian culture and history. Off-topic and political questions are declined.
- **Speech in and out.** Web Speech API recognition and text-to-speech in English, Hindi, Tamil, Telugu, Bengali, Marathi, Kannada, Malayalam, Gujarati and Punjabi. Chrome is recommended.
- **Travel journal.** Write about a visit and get three insights: historical significance, living traditions, and where to go next.
- **Interface.** Markdown rendering, light and dark themes, responsive layout.

## Architecture

```
browser (speech, TTS, UI) ──► /api/chat, /api/journal (Next.js route handlers) ──► Together AI
                                     │
                                     └─ validation + per-IP rate limit (src/lib/guard.ts)
```

The API key stays on the server. The route handlers protect the paid model:
- **Role filtering.** Only `user` and `assistant` turns are forwarded, so callers cannot inject their own `system` prompt.
- **Input limits.** History is capped at 20 turns and input at 4,000 characters.
- **Rate limit.** 20 requests per minute per client IP.
- **Output limit.** Replies are capped at 800 tokens.

## Run

```bash
git clone https://github.com/Kathan2004/Vaani---Your-Bharat-Explore-Guide.git
cd Vaani---Your-Bharat-Explore-Guide
cp .env.example .env.local      # add TOGETHER_API_KEY
npm ci
npm run dev                     # http://localhost:3000
```

Production: `npm run build && npm start`. For multi-instance deployments, move the in-memory rate limiter to a shared store such as Redis or Upstash.

## Stack

Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, react-markdown, Together AI SDK.

## Contributors

Built by [@Kathan2004](https://github.com/Kathan2004) with [@Heisenberg7604](https://github.com/Heisenberg7604).
