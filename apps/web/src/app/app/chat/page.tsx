"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Mic, Send, Volume2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { MedicalDisclaimer } from "@/components/medical-disclaimer";

type Msg = { role: "user" | "assistant"; content: string };

export default function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Hi — I'm your informational AI health assistant. Ask a medical question, describe symptoms, or paste report text. I am not a licensed clinician.",
    },
  ]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { eli5, locale } = useAppStore();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(e?: FormEvent) {
    e?.preventDefault();
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setLoading(true);
    try {
      const data = await api<{ conversation_id: string; reply: string }>("/chat", {
        method: "POST",
        body: JSON.stringify({ message: text, conversation_id: conversationId, eli5, locale }),
      });
      setConversationId(data.conversation_id);
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `Sorry — ${err instanceof Error ? err.message : "chat failed"}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function speak(text: string) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(text.replace(/[#>*_`]/g, " "));
    window.speechSynthesis.speak(u);
  }

  function listen() {
    const SR = window.webkitSpeechRecognition || window.SpeechRecognition;
    if (!SR) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }
    const rec = new SR();
    rec.lang = locale === "en" ? "en-US" : locale;
    rec.onresult = (ev) => {
      setInput(ev.results[0][0].transcript);
    };
    rec.start();
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-3xl flex-col">
      <h1 className="mb-3 font-[family-name:var(--font-display)] text-3xl text-white">AI Health Chat</h1>
      <MedicalDisclaimer compact />
      <div className="mt-4 flex-1 space-y-4 overflow-y-auto rounded-3xl border border-white/10 bg-black/20 p-4">
        {messages.map((m, idx) => (
          <div
            key={`${idx}-${m.role}`}
            className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm ${
              m.role === "user" ? "ml-auto bg-cyan-400/15 text-cyan-50" : "bg-white/5 text-slate-200"
            }`}
          >
            {m.role === "assistant" ? (
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
              </div>
            ) : (
              m.content
            )}
            {m.role === "assistant" && (
              <button
                type="button"
                className="mt-2 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white"
                onClick={() => speak(m.content)}
              >
                <Volume2 className="h-3.5 w-3.5" /> Listen
              </button>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} className="mt-3 flex items-end gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything health-related…"
          className="min-h-[56px]"
        />
        <Button type="button" variant="secondary" size="icon" onClick={listen} aria-label="Voice input">
          <Mic className="h-4 w-4" />
        </Button>
        <Button type="submit" size="icon" disabled={loading} aria-label="Send">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
