"use client";

declare global {
  interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: (event: SpeechRecognitionEvent) => void;
    onerror: (event: SpeechRecognitionErrorEvent) => void;
    onend: () => void;
    start: () => void;
    stop: () => void;
  }

  interface Window {
    webkitSpeechRecognition: new () => SpeechRecognition;
    SpeechRecognition: new () => SpeechRecognition;
    readonly speechSynthesis: SpeechSynthesis;
    SpeechSynthesisUtterance: new (text: string) => SpeechSynthesisUtterance;
  }

  interface SpeechRecognitionEvent {
    results: SpeechRecognitionResultList;
  }

  interface SpeechRecognitionErrorEvent {
    error: string;
    message: string;
  }

  interface SpeechSynthesisUtterance {
    text: string;
    lang: string;
    voice: SpeechSynthesisVoice | null;
    volume: number;
    rate: number;
    pitch: number;
    onend: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisEvent) => any) | null;
    onerror: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisErrorEvent) => any) | null;
  }

  interface SpeechSynthesisVoice {
    readonly name: string;
    readonly lang: string;
    readonly default: boolean;
    readonly localService: boolean;
  }
}

import { useState, useEffect, useRef } from "react";
import { Send, X, BookOpen, MessageCircle, Sparkles, Moon, Mic, Volume2, VolumeX } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
  lang?: string;
  source?: "text" | "speech"; // Added to track input source
}

interface JournalEntry {
  id: number;
  content: string;
  date: string;
  wordCount: number;
  insights: string;
  mood?: string;
}

const supportedLanguages = [
  { value: "en-US", label: "English (US)" },
  { value: "hi-IN", label: "Hindi" },
  { value: "ta-IN", label: "Tamil" },
  { value: "te-IN", label: "Telugu" },
  { value: "bn-IN", label: "Bengali" },
  { value: "mr-IN", label: "Marathi" },
  { value: "kn-IN", label: "Kannada" },
  { value: "ml-IN", label: "Malayalam" },
  { value: "gu-IN", label: "Gujarati" },
  { value: "pa-IN", label: "Punjabi" },
];

export default function Home() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [journalEntry, setJournalEntry] = useState("");
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [expandedEntry, setExpandedEntry] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"chat" | "journal">("chat");
  const [mood, setMood] = useState<string>("peaceful");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [isSpeechSupported, setIsSpeechSupported] = useState<boolean>(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [ttsError, setTtsError] = useState<string | null>(null);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Initialize Web Speech API (Recognition and Synthesis)
  useEffect(() => {
    // Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    console.log("Checking SpeechRecognition support:", !!SpeechRecognition);

    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = "en-US"; // Default to en-US, backend will detect actual language
      console.log("SpeechRecognition initialized");

      recognitionRef.current.onresult = (event) => {
        if (!event.results) return;
        const transcript = Array.from(event.results)
          .map((result) => result[0].transcript)
          .join("");
        console.log("Speech result:", transcript);
        setMessage(transcript);
        if (event.results[0].isFinal) {
          sendMessage(transcript, "speech");
          setIsListening(false);
          recognitionRef.current?.stop();
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error("Speech recognition error:", event.error, event.message);
        let errorMessage = "Speech recognition failed. Please try again.";
        switch (event.error) {
          case "no-speech":
            errorMessage = "No speech detected. Please speak clearly.";
            break;
          case "audio-capture":
            errorMessage = "Microphone not found or inaccessible. Check your device.";
            break;
          case "not-allowed":
            errorMessage = "Microphone permission denied. Please allow access.";
            break;
          case "network":
            errorMessage = "Network issue. Please check your connection.";
            break;
          default:
            errorMessage = `Speech error: ${event.error}. ${event.message}`;
        }
        setSpeechError(errorMessage);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        console.log("Speech recognition ended");
        setIsListening(false);
        recognitionRef.current?.stop();
      };
    } else {
      setIsSpeechSupported(false);
      setSpeechError("Speech recognition is not supported in this browser. Please use Chrome or Edge.");
      console.warn("Speech recognition not supported");
    }

    // Speech Synthesis
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      console.log("Available voices:", availableVoices.map(v => ({ name: v.name, lang: v.lang })));
      if (availableVoices.length > 0) {
        setVoices(availableVoices);
      } else {
        // Retry after a short delay if voices aren't loaded
        setTimeout(loadVoices, 1000);
      }
    };

    if (window.speechSynthesis) {
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices; // Handle async voice loading
    } else {
      setTtsError("Text-to-speech is not supported in this browser.");
    }

    // Cleanup
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        console.log("Cleaning up SpeechRecognition");
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        console.log("Cleaning up SpeechSynthesis");
      }
    };
  }, []);

  // Load stored data
  useEffect(() => {
    const storedChat = localStorage.getItem("chat");
    if (storedChat) setChat(JSON.parse(storedChat));

    const storedJournal = localStorage.getItem("journal");
    if (storedJournal) setJournal(JSON.parse(storedJournal));

    const storedTheme = localStorage.getItem("theme");
    if (storedTheme) setTheme(storedTheme as "light" | "dark");
  }, []);

  // Save data to localStorage
  useEffect(() => {
    localStorage.setItem("chat", JSON.stringify(chat));
    localStorage.setItem("journal", JSON.stringify(journal));
    localStorage.setItem("theme", theme);
  }, [chat, journal, theme]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chat]);

  // Check microphone permission
  const checkMicPermission = async (): Promise<boolean> => {
    try {
      const permissionStatus = await navigator.permissions.query({ name: "microphone" as PermissionName });
      console.log("Microphone permission:", permissionStatus.state);
      if (permissionStatus.state === "denied") {
        setSpeechError("Microphone access is denied. Please enable it in your browser settings.");
        return false;
      }
      return permissionStatus.state === "granted" || permissionStatus.state === "prompt";
    } catch (error) {
      console.error("Error checking microphone permission:", error);
      setSpeechError("Unable to check microphone permission.");
      return false;
    }
  };

  const toggleListening = async () => {
    if (!recognitionRef.current || !isSpeechSupported) {
      setSpeechError("Speech recognition is not available in this browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      setMessage("");
      console.log("Stopped speech recognition");
    } else {
      const hasPermission = await checkMicPermission();
      if (!hasPermission) return;

      try {
        setSpeechError(null);
        setIsListening(true);
        setMessage("Listening...");
        recognitionRef.current.start();
        console.log("Started speech recognition");
      } catch (error) {
        console.error("Error starting speech recognition:", error);
        setSpeechError("Failed to start speech recognition. Please try again.");
        setIsListening(false);
      }
    }
  };

  const speakResponse = (text: string, lang: string = "en-US") => {
    if (!window.speechSynthesis) {
      setTtsError("Text-to-speech is not supported in this browser.");
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new window.SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;

    // Select a voice matching the detected language or fallback
    const matchingVoice = voices.find((voice) => voice.lang === lang) ||
                         voices.find((voice) => voice.lang.startsWith(lang.split('-')[0])) ||
                         voices.find((voice) => voice.lang === "en-US") ||
                         voices.find((voice) => voice.default);
    
    if (matchingVoice) {
      utterance.voice = matchingVoice;
      utterance.lang = matchingVoice.lang;
      console.log("Selected voice:", matchingVoice.name, matchingVoice.lang);
    } else {
      utterance.lang = lang;
      setTtsError(`No voice available for ${supportedLanguages.find(opt => opt.value === lang)?.label || lang}. Using default voice.`);
      console.warn("No matching voice found, using default");
    }

    utterance.volume = 1.0;
    utterance.rate = 1.4; // Increased speed for faster speech
    utterance.pitch = 1.3; // Higher pitch for a more engaging voice

    utterance.onend = () => {
      setIsSpeaking(false);
      console.log("Speech synthesis ended");
    };

    utterance.onerror = (event) => {
      setTtsError(`Text-to-speech error: ${event.error}`);
      setIsSpeaking(false);
      console.error("Speech synthesis error:", event.error);
    };

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const sendMessage = async (text: string = message, source: "text" | "speech" = "text") => {
    if (!text.trim() || text === "Listening...") return;
    setLoading(true);

    const userMessage: Message = { role: "user", content: text, source };
    const updatedChat = [...chat, userMessage];
    setChat(updatedChat);
    setMessage("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedChat, detectLanguage: true }),
      });

      if (!response.ok) throw new Error("Failed to send message");

      const data = await response.json();
      const detectedLang = data.detectedLanguage || "en-US";
      const assistantMessage: Message = { role: "assistant", content: data.reply, lang: detectedLang };
      setChat((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        role: "assistant",
        content: "I apologize, but I'm having trouble connecting right now. Please try again in a moment.",
        lang: "en-US",
      };
      setChat((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const saveJournalEntry = async () => {
    if (!journalEntry.trim()) return;

    const newEntry: JournalEntry = {
      id: Date.now(),
      content: journalEntry,
      date: new Date().toLocaleString(),
      wordCount: journalEntry.trim().split(/\s+/).length,
      insights: "Analyzing your entry...",
      mood,
    };

    setJournal((prev) => [newEntry, ...prev]);
    setJournalEntry("");

    try {
      const response = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ journalEntry: newEntry.content }),
      });

      if (!response.ok) throw new Error("Failed to analyze journal entry");

      const data = await response.json();
      setJournal((prev) =>
        prev.map((entry) =>
          entry.id === newEntry.id ? { ...entry, insights: data.insights } : entry
        )
      );
    } catch (error) {
      setJournal((prev) =>
        prev.map((entry) =>
          entry.id === newEntry.id
            ? { ...entry, insights: "Failed to analyze this entry. Please try again later." }
            : entry
        )
      );
    }
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        theme === "dark" ? "bg-gray-900 text-gray-100" : "bg-gray-50 text-gray-800"
      } p-8`}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div
          className={`rounded-2xl p-6 mb-8 shadow-lg ${
            theme === "dark"
              ? "bg-gradient-to-r from-blue-900 to-purple-900"
              : "bg-gradient-to-r from-blue-500 to-purple-500"
          }`}
        >
          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-bold text-white flex items-center gap-3">
              <Sparkles className="text-yellow-300" />
              Manastithi
              <span className="text-lg font-normal text-gray-100 opacity-90">
                Your Mindful Companion
              </span>
            </h1>
            <div className="flex gap-4">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full hover:bg-white/20 text-white"
                aria-label="Toggle theme"
              >
                <Moon size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Chat Section */}
          <div
            className={`transition-all duration-300 ${activeTab === "chat" ? "block" : "hidden lg:block"}`}
          >
            <div
              className={`rounded-2xl shadow-lg overflow-hidden ${
                theme === "dark" ? "bg-gray-800 border border-gray-700" : "bg-white"
              }`}
            >
              <div
                ref={chatContainerRef}
                className="h-[600px] overflow-y-auto p-6 space-y-4 scroll-smooth"
              >
                {chat.map((msg, i) => (
                  <div
                    key={i}
                    className={`chat-message p-4 rounded-xl max-w-[80%] ${
                      msg.role === "user"
                        ? "ml-auto bg-gradient-to-r from-blue-500 to-blue-600 text-white"
                        : theme === "dark"
                        ? "bg-gray-700 text-gray-100"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    <ReactMarkdown className="prose prose-sm max-w-none dark:prose-invert">
                      {msg.content}
                    </ReactMarkdown>
                    {msg.source && (
                      <span className="text-xs text-gray-400 mt-1 block">
                        (via {msg.source})
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <div
                className={`p-4 border-t ${
                  theme === "dark" ? "border-gray-700" : "border-gray-100"
                }`}
              >
                {(speechError || ttsError) && (
                  <p className="text-red-500 text-sm mb-2">{speechError || ttsError}</p>
                )}
                <div className="flex gap-4">
                  <input
                    className={`flex-1 p-3 rounded-xl text-lg outline-none border transition-colors ${
                      theme === "dark"
                        ? "bg-gray-700 border-gray-600 focus:border-blue-500 text-white"
                        : "bg-gray-50 border-gray-200 focus:border-blue-500"
                    }`}
                    placeholder={isListening ? "Listening..." : "Type or speak your message..."}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  />
                  <button
                    className={`p-4 rounded-xl transition-all ${
                      isListening
                        ? "bg-red-500 hover:bg-red-600"
                        : theme === "dark"
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                    } text-white disabled:opacity-50`}
                    onClick={toggleListening}
                    disabled={!isSpeechSupported}
                    title={isListening ? "Stop listening" : "Start listening"}
                  >
                    <Mic size={20} />
                  </button>
                  <button
                    className={`p-4 rounded-xl transition-all ${
                      isSpeaking
                        ? "bg-red-500 hover:bg-red-600"
                        : theme === "dark"
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                    } text-white disabled:opacity-50`}
                    onClick={() => speakResponse(chat[chat.length - 1]?.content || "", chat[chat.length - 1]?.lang || "en-US")}
                    disabled={!chat.length || !window.speechSynthesis}
                    title={isSpeaking ? "Stop speaking" : "Speak response"}
                  >
                    {isSpeaking ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  </button>
                  <button
                    className={`${
                      theme === "dark"
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                    } text-white p-4 rounded-xl transition-all disabled:opacity-50`}
                    onClick={() => sendMessage()}
                    disabled={loading || !message.trim() || message === "Listening..."}
                  >
                    {loading ? "..." : <Send size={20} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Journal Section */}
          <div
            className={`transition-all duration-300 ${
              activeTab === "journal" ? "block" : "hidden lg:block"
            }`}
          >
            <div
              className={`rounded-2xl shadow-lg overflow-hidden ${
                theme === "dark" ? "bg-gray-800 border border-gray-700" : "bg-white"
              }`}
            >
              <div className="p-6">
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Today's Mood</label>
                  <select
                    value={mood}
                    onChange={(e) => setMood(e.target.value)}
                    className={`w-full p-2 rounded-lg border transition-colors ${
                      theme === "dark"
                        ? "bg-gray-700 border-gray-600 focus:border-blue-500 text-white"
                        : "bg-gray-50 border-gray-200 focus:border-blue-500"
                    }`}
                  >
                    <option value="peaceful">Peaceful 😌</option>
                    <option value="happy">Happy 😊</option>
                    <option value="anxious">Anxious 😰</option>
                    <option value="sad">Sad 😢</option>
                    <option value="energetic">Energetic ⚡</option>
                  </select>
                </div>
                <textarea
                  className={`w-full h-40 p-4 rounded-xl text-lg resize-none outline-none border transition-colors ${
                    theme === "dark"
                      ? "bg-gray-700 border-gray-600 focus:border-blue-500 text-white"
                      : "bg-gray-50 border-gray-200 focus:border-blue-500"
                  }`}
                  placeholder="Write your thoughts..."
                  value={journalEntry}
                  onChange={(e) => setJournalEntry(e.target.value)}
                />
                <button
                  className={`mt-4 w-full ${
                    theme === "dark"
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                  } text-white py-3 rounded-xl transition-all disabled:opacity-50`}
                  onClick={saveJournalEntry}
                  disabled={!journalEntry.trim()}
                >
                  Save Entry
                </button>
              </div>

              <div
                className={`border-t ${
                  theme === "dark" ? "border-gray-700" : "border-gray-100"
                }`}
              >
                <div className="p-6 space-y-4 max-h-[300px] overflow-y-auto">
                  {journal.map((entry) => (
                    <div
                      key={entry.id}
                      className={`p-4 rounded-xl ${
                        theme === "dark" ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-100 hover:bg-gray-50"
                      } transition-all`}
                    >
                      <div className="flex justify-between items-center text-sm text-gray-500">
                        <span className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              theme === "dark" ? "bg-blue-400" : "bg-blue-500"
                            }`}
                          ></span>
                          {entry.date}
                        </span>
                        <span>{entry.wordCount} words</span>
                      </div>
                      <p
                        className={`text-lg mt-2 line-clamp-3 ${
                          theme === "dark" ? "text-gray-100" : "text-gray-800"
                        }`}
                      >
                        {entry.content}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-sm text-gray-500">Mood: {entry.mood}</span>
                        <button
                          className={`text-sm hover:underline transition-colors ${
                            theme === "dark" ? "text-blue-400" : "text-blue-600"
                          }`}
                          onClick={() => setExpandedEntry(entry.id)}
                        >
                          View Insights
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Modal with Scroll */}
        {expandedEntry !== null && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div
              ref={modalRef}
              className={`max-w-2xl w-full rounded-2xl shadow-2xl ${
                theme === "dark" ? "bg-gray-800 border border-gray-700" : "bg-white"
              } max-h-[80vh] flex flex-col`}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3
                    className={`text-2xl font-bold flex items-center gap-2 ${
                      theme === "dark" ? "text-blue-400" : "text-blue-600"
                    }`}
                  >
                    <Sparkles className="text-yellow-500" />
                    Mindful Insights
                  </h3>
                  <button
                    className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      theme === "dark" ? "text-gray-400" : "text-gray-500"
                    }`}
                    onClick={() => setExpandedEntry(null)}
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              {/* Modal Content with Scroll */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                  {/* Entry Content */}
                  <div
                    className={`rounded-xl p-4 ${theme === "dark" ? "bg-gray-700" : "bg-gray-50"}`}
                  >
                    <h4
                      className={`text-lg font-semibold mb-2 ${
                        theme === "dark" ? "text-gray-200" : "text-gray-800"
                      }`}
                    >
                      Journal Entry
                    </h4>
                    <p
                      className={`text-base ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}
                    >
                      {journal.find((entry) => entry.id === expandedEntry)?.content}
                    </p>
                  </div>

                  {/* Insights Section */}
                  <div className="space-y-4">
                    <h4
                      className={`text-lg font-semibold ${
                        theme === "dark" ? "text-gray-200" : "text-gray-800"
                      }`}
                    >
                      AI Analysis
                    </h4>
                    {journal
                      .find((entry) => entry.id === expandedEntry)
                      ?.insights.split("\n")
                      .map((insight, index) => (
                        <div
                          key={index}
                          className={`p-4 rounded-xl ${
                            theme === "dark" ? "bg-gray-700" : "bg-white"
                          } border ${theme === "dark" ? "border-gray-600" : "border-gray-200"}`}
                        >
                          <h5
                            className={`font-bold mb-2 flex items-center gap-2 ${
                              theme === "dark" ? "text-blue-400" : "text-blue-600"
                            }`}
                          >
                            <span className="w-2 h-2 rounded-full bg-current"></span>
                            Key Insight {index + 1}
                          </h5>
                          <p
                            className={`text-base ${
                              theme === "dark" ? "text-gray-300" : "text-gray-600"
                            }`}
                          >
                            {insight}
                          </p>
                        </div>
                      ))}
                  </div>

                  <div
                    className={`mt-4 pt-4 border-t ${
                      theme === "dark" ? "border-gray-700" : "border-gray-200"
                    }`}
                  >
                    <div className="flex justify-between text-sm">
                      <span className={theme === "dark" ? "text-gray-400" : "text-gray-500"}>
                        Date: {journal.find((entry) => entry.id === expandedEntry)?.date}
                      </span>
                      <span className={theme === "dark" ? "text-gray-400" : "text-gray-500"}>
                        Mood: {journal.find((entry) => entry.id === expandedEntry)?.mood}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}