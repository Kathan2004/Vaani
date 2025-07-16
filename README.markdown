# Vaani - Your Bharat Explore

Vaani is a culturally immersive virtual tour chatbot built with Next.js, designed to celebrate and explore India’s rich heritage, history, and traditions. It features a conversational interface with speech recognition and text-to-speech (TTS) capabilities in English and multiple Indian languages, along with a journal feature to reflect on cultural experiences and receive curated insights.

Features
	•	Virtual Tour Guide: Discover monuments, festivals, art forms, architecture, and legends across India through engaging, guided conversations.<br>
	•	Multilingual Support: Supports speech recognition and TTS in:<br>
	•	English (US)
	•	Hindi
	•	Tamil
	•	Telugu
	•	Bengali
	•	Marathi
	•	Kannada
	•	Malayalam
	•	Gujarati
	•	Punjabi
	•	Speech Recognition: Explore Indian culture using voice commands (best in Chrome).
	•	Text-to-Speech: Listen to historical and cultural narratives in the selected language (voice availability varies by device).
	•	Travel Journal: Reflect on your cultural experiences or heritage journeys and receive AI-generated insights highlighting traditions, stories, and recommendations.
	•	Light/Dark Theme: Switch themes for comfortable viewing.
	•	Responsive Design: Seamlessly accessible across desktop and mobile devices.
## Prerequisites

- **Node.js**: Version 18.x or higher.
- **npm**: Comes with Node.js, or use `yarn`, `pnpm`, or `bun`.
- **Together AI API Key**: Sign up at [Together AI](https://www.together.ai) to get an API key.
- **Google Chrome**: Recommended for full speech recognition and TTS support.

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/manastithi.git
cd manastithi
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

### 3. Set Up Environment Variables

Create a `.env.local` file in the project root and add your Together AI API key:

```env
TOGETHER_API_KEY=your-together-ai-api-key
```

### 4. Run the Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the app.

### 5. Test the App

- **Chat**: Type or use the microphone to send messages. Select a language from the dropdown (e.g., Hindi, Gujarati).
- **Speech Recognition**: Click the microphone button, allow permission, and speak. Test with phrases like "नमस्ते" (Hindi) or "હેલો" (Gujarati).
- **Text-to-Speech**: Responses are spoken in the selected language’s voice (best on Android Chrome).
- **Journal**: Write an entry, select a mood, and save to view AI insights.
- **Theme**: Toggle between light and dark modes using the moon icon.

## Project Structure

- `app/page.tsx`: Main application component with chat and journal UI.
- `app/api/chat/route.ts`: API route for handling chat requests with Together AI.
- `public/`: Static assets (e.g., favicon).
- `components/`: Reusable React components (if any).
- `.env.local`: Environment variables (not tracked in git).

## Dependencies

- **Next.js**: Framework for server-side rendering and API routes.
- **React**: Frontend library.
- **Together AI**: API for chat completions.
- **lucide-react**: Icons for UI.
- **react-markdown**: Renders Markdown in chat responses.
- **@vercel/font**: Optimizes Geist font.

See `package.json` for the full list.

## Deployment

The easiest way to deploy is with [Vercel](https://vercel.com), the platform optimized for Next.js.

1. Push your code to a GitHub repository.
2. Import the repository into Vercel.
3. Add the `TOGETHER_API_KEY` environment variable in Vercel’s dashboard.
4. Deploy the app and access it at the provided URL.

For more details, see the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying).

## Troubleshooting

- **Speech Recognition Fails**: Ensure you’re using Chrome and have granted microphone permissions. Check the console (`F12`) for errors.
- **TTS Not Working**: Indian language voices are best supported on Android Chrome. Run `window.speechSynthesis.getVoices()` in the console to see available voices.
- **API Errors**: Verify your `TOGETHER_API_KEY` is correct and the Together AI service is operational.
- **Build Issues**: Ensure Node.js is up to date and run `npm install` again.

## Contributing

Contributions are welcome! To contribute:

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/your-feature`).
3. Commit your changes (`git commit -m "Add your feature"`).
4. Push to the branch (`git push origin feature/your-feature`).
5. Open a pull request.

Please follow the [Code of Conduct](CODE_OF_CONDUCT.md) and ensure your code passes linting (`npm run lint`).

## Learn More

- [Next.js Documentation](https://nextjs.org/docs): Learn about Next.js features and APIs.
- [Together AI Documentation](https://docs.together.ai): API details for chat completions.
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API): Details on speech recognition and TTS.
- [Vercel Font](https://vercel.com/font): About the Geist font used in this project.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contact

For questions or feedback, open an issue on the [GitHub repository](https://github.com/your-username/manastithi) or contact [your-email@example.com](mailto:your-email@example.com).
