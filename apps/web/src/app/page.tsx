"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  Bot,
  HeartPulse,
  ScanLine,
  ShieldAlert,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MedicalDisclaimer } from "@/components/medical-disclaimer";
import { dictionaries } from "@/lib/i18n";
import { useAppStore } from "@/lib/store";

const features = [
  { icon: Stethoscope, title: "Symptom search", desc: "Plain-English analysis with severity and red flags." },
  { icon: ScanLine, title: "AI image diagnosis", desc: "Upload rashes, wounds, and more for visual guidance." },
  { icon: ShieldAlert, title: "Emergency assistant", desc: "Step-by-step first aid with printable instructions." },
  { icon: HeartPulse, title: "Health memory", desc: "Profile-aware chat, timeline, labs, and risk insights." },
];

export default function LandingPage() {
  const locale = useAppStore((s) => s.locale);
  const t = dictionaries[locale] || dictionaries.en;

  return (
    <div className="mesh min-h-screen text-slate-100">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-cyan-300/80">Healthcare AI</div>
          <div className="font-[family-name:var(--font-display)] text-xl">{t.brand}</div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/app" className="text-sm text-slate-300 hover:text-white">
            {t.dashboard}
          </Link>
          <Button asChild>
            <Link href="/app">{t.getStarted}</Link>
          </Button>
        </div>
      </header>

      <section className="relative mx-auto grid max-w-6xl items-center gap-10 px-6 pb-20 pt-8 lg:grid-cols-2 lg:pt-16">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="font-[family-name:var(--font-display)] text-5xl leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
              {t.brand}
            </h1>
            <p className="mt-5 max-w-xl text-lg text-slate-300">{t.tagline}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/app">Start assessment</Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/app/emergency">Emergency guides</Link>
              </Button>
            </div>
          </motion.div>
        </div>

        <motion.div
          className="relative"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          <div className="absolute inset-0 animate-pulse-ring rounded-full bg-cyan-400/20 blur-2xl" />
          <div className="glass animate-floaty relative overflow-hidden rounded-[2rem] p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400/20 text-cyan-300">
                <Bot className="h-7 w-7" />
              </div>
              <div>
                <div className="text-sm text-slate-400">Interactive demo</div>
                <div className="font-medium text-white">Medical robot companion</div>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <div className="rounded-2xl bg-white/5 p-4 text-slate-200">
                “I have a headache and mild fever.”
              </div>
              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4 text-cyan-50">
                Possible viral illness. Rest, hydrate, watch red flags. See a clinician if symptoms worsen.
              </div>
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs text-slate-400">
              <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
              Streaming responses · Llama 3.3 via Groq · OpenRouter fallback
            </div>
          </div>
        </motion.div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <MedicalDisclaimer />
      </section>

      <section id="features" className="mx-auto max-w-6xl px-6 pb-24">
        <h2 className="font-[family-name:var(--font-display)] text-3xl text-white">{t.features}</h2>
        <p className="mt-2 text-slate-400">Premium clinical tools in one glassmorphic workspace.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="glass rounded-3xl p-5"
            >
              <f.icon className="mb-4 h-6 w-6 text-cyan-300" />
              <div className="font-medium text-white">{f.title}</div>
              <p className="mt-2 text-sm text-slate-400">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-6 pb-24 lg:grid-cols-3">
        <div className="glass rounded-3xl p-6 lg:col-span-2">
          <h3 className="font-[family-name:var(--font-display)] text-2xl text-white">Pricing</h3>
          <p className="mt-2 text-slate-400">Free informational tier for individuals. Bring your own Groq / OpenRouter keys.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-sm text-cyan-300">Starter</div>
              <div className="mt-1 text-3xl font-semibold text-white">$0</div>
              <ul className="mt-4 space-y-2 text-sm text-slate-300">
                <li>Symptom search</li>
                <li>Emergency guides</li>
                <li>Health chat (mock or your keys)</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 p-5">
              <div className="text-sm text-cyan-200">Clinic</div>
              <div className="mt-1 text-3xl font-semibold text-white">Custom</div>
              <ul className="mt-4 space-y-2 text-sm text-slate-200">
                <li>Admin audit logs</li>
                <li>Report OCR pipeline</li>
                <li>Deployed Vercel + Railway stack</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="glass rounded-3xl p-6">
          <h3 className="font-[family-name:var(--font-display)] text-2xl text-white">FAQ</h3>
          <div className="mt-4 space-y-4 text-sm text-slate-300">
            <div>
              <div className="font-medium text-white">Is this a real doctor?</div>
              <p className="mt-1 text-slate-400">No. It is an informational AI assistant only.</p>
            </div>
            <div>
              <div className="font-medium text-white">Which models?</div>
              <p className="mt-1 text-slate-400">Llama 3.3 70B on Groq, with open models via OpenRouter.</p>
            </div>
            <div>
              <div className="font-medium text-white">Emergencies?</div>
              <p className="mt-1 text-slate-400">Call your local emergency number immediately.</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-slate-400">
            <Activity className="h-4 w-4 text-cyan-300" />
            {t.brand} · {t.disclaimerShort}
          </div>
          <div className="text-sm text-slate-500">© {new Date().getFullYear()} AI Doctor in a Box</div>
        </div>
      </footer>
    </div>
  );
}
