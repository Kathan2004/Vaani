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
  }

  interface SpeechRecognitionEvent {
    results: SpeechRecognitionResultList;
  }

  interface SpeechRecognitionErrorEvent {
    error: string;
    message: string;
  }
}

import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, Feather, Mic, Moon, Send, Sun, Trash2, Volume2, VolumeX, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { DEFAULT_LENS, LANGUAGES, LENSES, getLens, type LensId } from "@/lib/philosophers";

interface Message {
  role: "user" | "assistant";
  content: string;
  lens?: LensId;
  source?: "text" | "speech";
}

interface Reading {
  thinker: string;
  text: string;
}

interface NotebookEntry {
  id: number;
  content: string;
  date: string;
  mood: string;
  readings: Reading[] | null;
  failed?: boolean;
}

type Theme = "ink" | "paper";

const MOODS = ["restless", "melancholic", "lucid", "defiant", "numb", "tender"];

const OPENINGS = [
  "If nothing I do will last, why should any of it matter?",
  "Is wanting a quiet, ordinary life a kind of cowardice?",
  "I feel guilty, but I can't say what for.",
  "How do I forgive someone who never asked to be forgiven?",
];

const EPIGRAPHS = [
  { line: "He who has a why to live for can bear almost any how.", source: "Nietzsche, Twilight of the Idols, Maxims 12 (common rendering)" },
  { line: "In the midst of winter, I found there was, within me, an invincible summer.", source: "Camus, Return to Tipasa" },
  { line: "A book must be the axe for the frozen sea within us.", source: "Kafka, letter to Oskar Pollak, 1904" },
  { line: "Life can only be understood backwards; but it must be lived forwards.", source: "Kierkegaard, Journals, 1843" },
];

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function plainText(markdown: string): string {
  return markdown
    .replace(/[*_`>#]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export default function Home() {
  const [theme, setTheme] = useState<Theme>("ink");
  const [lens, setLens] = useState<LensId>(DEFAULT_LENS);
  const [lang, setLang] = useState("en-US");
  const [tab, setTab] = useState<"dialogue" | "notebook">("dialogue");

  const [chat, setChat] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);

  const [notebook, setNotebook] = useState<NotebookEntry[]>([]);
  const [entry, setEntry] = useState("");
  const [mood, setMood] = useState(MOODS[0]);
  const [openEntry, setOpenEntry] = useState<number | null>(null);

  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [epigraph, setEpigraph] = useState(EPIGRAPHS[0]);
  const [hydrated, setHydrated] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const sendRef = useRef<(text: string, source: "text" | "speech") => void>(() => {});

  // Persistence
  useEffect(() => {
    setTheme(load<Theme>("vaani.theme", "ink"));
    setLens(getLens(load<string>("vaani.lens", DEFAULT_LENS)).id);
    setLang(load<string>("vaani.lang", "en-US"));
    setChat(load<Message[]>("vaani.chat", []));
    setNotebook(load<NotebookEntry[]>("vaani.notebook", []));
    setEpigraph(EPIGRAPHS[Math.floor(Math.random() * EPIGRAPHS.length)]);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem("vaani.theme", JSON.stringify(theme));
      localStorage.setItem("vaani.lens", JSON.stringify(lens));
      localStorage.setItem("vaani.lang", JSON.stringify(lang));
      localStorage.setItem("vaani.chat", JSON.stringify(chat.slice(-60)));
      localStorage.setItem("vaani.notebook", JSON.stringify(notebook.slice(0, 200)));
    } catch {
      // Storage full or disabled: the session still works.
    }
  }, [hydrated, theme, lens, lang, chat, notebook]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [chat, loading]);

  // Speech
  useEffect(() => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setSpeechSupported(false);
    } else {
      const rec = new Recognition();
      rec.continuous = false;
      rec.interimResults = true;
      rec.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((r) => r[0].transcript)
          .join("");
        setDraft(transcript);
        const last = event.results[event.results.length - 1];
        if (last?.isFinal) {
          rec.stop();
          setIsListening(false);
          sendRef.current(transcript, "speech");
        }
      };
      rec.onerror = (event) => {
        setIsListening(false);
        setNotice(
          event.error === "not-allowed"
            ? "Microphone access was denied."
            : event.error === "no-speech"
              ? "Silence. Even that is an answer, but try again."
              : `Speech recognition failed (${event.error}).`,
        );
      };
      rec.onend = () => setIsListening(false);
      recognitionRef.current = rec;
    }

    const loadVoices = () => setVoices(window.speechSynthesis?.getVoices() ?? []);
    if (window.speechSynthesis) {
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    return () => {
      recognitionRef.current?.stop();
      window.speechSynthesis?.cancel();
    };
  }, []);

  const toggleListening = () => {
    const rec = recognitionRef.current;
    if (!rec) return;
    if (isListening) {
      rec.stop();
      setIsListening(false);
      return;
    }
    setNotice(null);
    rec.lang = lang;
    try {
      rec.start();
      setIsListening(true);
    } catch {
      setNotice("Could not start the microphone.");
    }
  };

  const speak = (markdown: string) => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    if (isSpeaking) {
      synth.cancel();
      setIsSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(plainText(markdown));
    const voice =
      voices.find((v) => v.lang === lang) || voices.find((v) => v.lang.startsWith(lang.split("-")[0]));
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang ?? lang;
    utterance.rate = 0.95;
    utterance.pitch = 0.95;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    synth.speak(utterance);
    setIsSpeaking(true);
  };

  // Dialogue
  const send = useCallback(
    async (text: string, source: "text" | "speech" = "text") => {
      const content = text.trim();
      if (!content || loading) return;
      const next: Message[] = [...chat, { role: "user", content, source }];
      setChat(next);
      setDraft("");
      setLoading(true);
      setNotice(null);
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lens,
            lang,
            messages: next.map(({ role, content }) => ({ role, content })),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(typeof data.error === "string" ? data.error : "The conversation could not be reached.");
        }
        if (typeof data.reply !== "string" || !data.reply.trim()) {
          throw new Error("No answer came back. Try once more.");
        }
        setChat((prev) => [
          ...prev,
          { role: "assistant", content: data.reply, lens },
        ]);
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "The connection broke before the thought could arrive.");
      } finally {
        setLoading(false);
      }
    },
    [chat, lang, lens, loading],
  );

  useEffect(() => {
    sendRef.current = (text, source) => void send(text, source);
  }, [send]);

  // Notebook
  const saveEntry = async () => {
    const content = entry.trim();
    if (!content) return;
    const item: NotebookEntry = {
      id: Date.now(),
      content,
      mood,
      date: new Date().toLocaleString(),
      readings: null,
    };
    setNotebook((prev) => [item, ...prev]);
    setEntry("");
    try {
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ journalEntry: content, mood, lang }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setNotebook((prev) => prev.map((e) => (e.id === item.id ? { ...e, readings: data.readings ?? [] } : e)));
    } catch {
      setNotice("The readers could not be reached. Your entry is still saved in this browser.");
      setNotebook((prev) => prev.map((e) => (e.id === item.id ? { ...e, failed: true, readings: [] } : e)));
    }
  };

  const active = getLens(lens);
  const opened = notebook.find((e) => e.id === openEntry);

  return (
    <div data-theme={theme} className="min-h-screen bg-[var(--bg)] text-[var(--text)] grain">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--line)] pb-6">
          <div>
            <h1 className="font-display text-5xl italic tracking-tight md:text-6xl">Vaani</h1>
            <p className="mt-1 text-[var(--muted)]">conversations at the edge of meaning</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              aria-label="Language"
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="rounded border border-[var(--line)] bg-[var(--panel)] px-2 py-1.5 text-sm"
            >
              {Object.entries(LANGUAGES).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
            <button
              aria-label="Toggle theme"
              onClick={() => setTheme((t) => (t === "ink" ? "paper" : "ink"))}
              className="rounded border border-[var(--line)] p-2 hover:bg-[var(--panel-2)]"
            >
              {theme === "ink" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </header>

        <nav aria-label="Primary" className="mb-6 flex gap-6 font-display text-xl">
          {(["dialogue", "notebook"] as const).map((t) => (
            <button
              key={t}
              aria-current={tab === t ? "page" : undefined}
              onClick={() => setTab(t)}
              className={`border-b-2 pb-1 capitalize transition-colors ${
                tab === t
                  ? "border-[var(--accent)] text-[var(--text)]"
                  : "border-transparent text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              {t}
            </button>
          ))}
        </nav>

        {tab === "dialogue" ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-[260px_minmax(0,1fr)]">
            <aside className="min-w-0">
              <p className="mb-3 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Speak with</p>
              <select
                aria-label="Thinker"
                value={lens}
                onChange={(e) => setLens(getLens(e.target.value).id)}
                className="w-full rounded border border-[var(--line)] bg-[var(--panel)] px-3 py-2 font-display text-lg md:hidden"
              >
                {LENSES.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                    {l.years ? ` (${l.years})` : ""}
                  </option>
                ))}
              </select>
              <ul className="hidden space-y-1 md:block">
                {LENSES.map((l) => (
                  <li key={l.id}>
                    <button
                      onClick={() => setLens(l.id)}
                      className={`w-full rounded px-3 py-2 text-left transition-colors ${
                        lens === l.id ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--panel-2)]"
                      }`}
                    >
                      <span className="font-display text-lg">{l.name}</span>
                      {l.years && <span className="ml-2 text-xs text-[var(--muted)]">{l.years}</span>}
                      <span className="block text-sm italic text-[var(--muted)]">{l.epithet}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </aside>

            <section className="flex min-h-[70vh] min-w-0 flex-col rounded border border-[var(--line)] bg-[var(--panel)]">
              <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-3 text-sm text-[var(--muted)]">
                <span>
                  In conversation with{" "}
                  <span className="font-display text-base italic text-[var(--text)]">{active.name}</span>
                </span>
                {chat.length > 0 && (
                  <button
                    onClick={() => setChat([])}
                    className="flex items-center gap-1 hover:text-[var(--accent)]"
                    aria-label="Clear conversation"
                  >
                    <Trash2 size={14} /> clear
                  </button>
                )}
              </div>

              <div ref={scrollRef} className="scrollbar-thin flex-1 space-y-6 overflow-y-auto px-5 py-6">
                {chat.length === 0 && (
                  <div className="mx-auto max-w-xl py-8 text-center">
                    <blockquote className="font-display text-2xl italic leading-snug">
                      &ldquo;{epigraph.line}&rdquo;
                    </blockquote>
                    <p className="mt-2 text-sm text-[var(--muted)]">{epigraph.source}</p>
                    <p className="mt-10 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Begin with</p>
                    <div className="mt-3 grid gap-2">
                      {OPENINGS.map((q) => (
                        <button
                          key={q}
                          onClick={() => send(q)}
                          className="rounded border border-[var(--line)] px-4 py-2 text-left italic hover:border-[var(--accent)]"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {chat.map((m, i) =>
                  m.role === "user" ? (
                    <div key={i} className="ml-auto max-w-[85%] rounded bg-[var(--user)] px-4 py-3 text-lg">
                      {m.content}
                    </div>
                  ) : (
                    <article key={i} className="max-w-[92%]">
                      <p className="mb-1 font-display text-sm italic text-[var(--accent)]">{getLens(m.lens).name}</p>
                      <div className="ink-prose">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    </article>
                  ),
                )}

                {loading && (
                  <p className="thinking font-display text-lg italic text-[var(--muted)]">
                    {active.id === "symposium" ? "The room falls quiet" : `${active.name.split(" ").pop()} is thinking`}
                    <span>.</span>
                    <span>.</span>
                    <span>.</span>
                  </p>
                )}
              </div>

              <div className="border-t border-[var(--line)] p-4">
                {notice && <p className="mb-2 text-sm text-[var(--accent)]">{notice}</p>}
                <div className="flex gap-2">
                  <textarea
                    rows={2}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void send(draft);
                      }
                    }}
                    placeholder={isListening ? "Listening..." : "Ask what you would not ask anyone else..."}
                    className="min-w-0 flex-1 resize-none rounded border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-lg outline-none focus:border-[var(--accent)]"
                  />
                  <div className="flex flex-col gap-2">
                    <button
                      aria-label={isListening ? "Stop listening" : "Speak"}
                      onClick={toggleListening}
                      disabled={!speechSupported}
                      className={`rounded border p-2 disabled:opacity-40 ${
                        isListening ? "border-[var(--accent)] text-[var(--accent)]" : "border-[var(--line)]"
                      }`}
                    >
                      <Mic size={18} />
                    </button>
                    <button
                      aria-label={isSpeaking ? "Stop reading aloud" : "Read last reply aloud"}
                      onClick={() => {
                        const last = [...chat].reverse().find((m) => m.role === "assistant");
                        if (last) speak(last.content);
                      }}
                      disabled={!chat.some((m) => m.role === "assistant")}
                      className="rounded border border-[var(--line)] p-2 disabled:opacity-40"
                    >
                      {isSpeaking ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </button>
                  </div>
                  <button
                    aria-label="Send"
                    onClick={() => send(draft)}
                    disabled={loading || !draft.trim()}
                    className="rounded bg-[var(--accent)] px-4 text-white disabled:opacity-40"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </section>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <section className="rounded border border-[var(--line)] bg-[var(--panel)] p-5">
              <h2 className="font-display text-2xl italic">Write it down</h2>
              <p className="mb-4 text-sm text-[var(--muted)]">
                Three thinkers who would disagree with each other will read what you wrote.
              </p>
              <div className="mb-3 flex flex-wrap gap-2">
                {MOODS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setMood(m)}
                    className={`rounded-full border px-3 py-1 text-sm ${
                      mood === m
                        ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                        : "border-[var(--line)] text-[var(--muted)]"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <textarea
                value={entry}
                onChange={(e) => setEntry(e.target.value)}
                placeholder="What is actually on your mind?"
                className="h-56 w-full resize-none rounded border border-[var(--line)] bg-[var(--bg)] p-4 text-lg outline-none focus:border-[var(--accent)]"
              />
              <button
                onClick={saveEntry}
                disabled={!entry.trim()}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded bg-[var(--accent)] py-3 text-white disabled:opacity-40"
              >
                <Feather size={16} /> Submit to the readers
              </button>
            </section>

            <section className="rounded border border-[var(--line)] bg-[var(--panel)] p-5">
              <h2 className="mb-4 font-display text-2xl italic">Notebook</h2>
              {notebook.length === 0 ? (
                <p className="italic text-[var(--muted)]">Empty pages. Nothing has been confessed yet.</p>
              ) : (
                <ul className="scrollbar-thin max-h-[60vh] space-y-3 overflow-y-auto pr-1">
                  {notebook.map((e) => (
                    <li key={e.id} className="rounded border border-[var(--line)] p-3">
                      <div className="flex justify-between text-xs text-[var(--muted)]">
                        <span>{e.date}</span>
                        <span className="italic">{e.mood}</span>
                      </div>
                      <p className="mt-1 line-clamp-3">{e.content}</p>
                      <button
                        onClick={() => setOpenEntry(e.id)}
                        disabled={e.readings === null}
                        className="mt-2 flex items-center gap-1 text-sm text-[var(--accent)] disabled:text-[var(--muted)]"
                      >
                        <BookOpen size={14} />
                        {e.readings === null ? "being read..." : e.failed ? "reading failed" : "read the readings"}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}

        <footer className="mt-10 border-t border-[var(--line)] pt-4 text-xs text-[var(--muted)]">
          Vaani is an AI working from these thinkers&apos; ideas, not the thinkers themselves. If you are in crisis,
          contact someone you trust or a crisis line now: Tele-MANAS 14416 (India), 988 (US), or your local emergency
          number.
        </footer>
      </div>

      {opened && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setOpenEntry(null)}
          role="presentation"
        >
          <div
            data-theme={theme}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="readings-title"
            className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded border border-[var(--line)] bg-[var(--panel)] text-[var(--text)]"
          >
            <div className="flex items-center justify-between border-b border-[var(--line)] px-6 py-4">
              <h3 id="readings-title" className="font-display text-2xl italic">
                Readings
              </h3>
              <button
                aria-label="Close"
                onClick={() => setOpenEntry(null)}
                className="text-[var(--muted)] hover:text-[var(--text)]"
              >
                <X size={20} />
              </button>
            </div>
            <div className="scrollbar-thin space-y-5 overflow-y-auto px-6 py-5">
              <blockquote className="border-l-2 border-[var(--accent)] pl-4 italic text-[var(--muted)]">
                {opened.content}
              </blockquote>
              {opened.failed && (
                <p className="text-[var(--accent)]">The readers could not be reached. Try submitting again later.</p>
              )}
              {(opened.readings ?? []).map((r, i) => (
                <div key={i}>
                  {r.thinker && <p className="font-display text-lg italic text-[var(--accent)]">{r.thinker}</p>}
                  <p className="text-lg leading-relaxed">{r.text}</p>
                </div>
              ))}
              <p className="text-xs text-[var(--muted)]">
                {opened.date} &middot; {opened.mood}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
