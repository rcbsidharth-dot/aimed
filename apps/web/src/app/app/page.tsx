"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { motion } from "framer-motion";
import {
  Camera,
  ImagePlus,
  Search,
  Upload,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MedicalDisclaimer } from "@/components/medical-disclaimer";
import { dictionaries } from "@/lib/i18n";
import { useAppStore } from "@/lib/store";

const emergencies = [
  { id: "snake-bite", title: "Snake Bite" },
  { id: "dog-bite", title: "Dog Bite" },
  { id: "bee-sting", title: "Bee Sting" },
  { id: "poison", title: "Poison" },
  { id: "burns", title: "Burns" },
  { id: "electric-shock", title: "Electric Shock" },
  { id: "heart-attack", title: "Heart Attack" },
  { id: "stroke", title: "Stroke" },
];

const popular = [
  "Fever",
  "Cold",
  "Flu",
  "COVID",
  "Food Poisoning",
  "Head Injury",
  "Bleeding",
  "Broken Bone",
  "Eye Infection",
  "Ear Infection",
  "Tooth Pain",
];

export default function DashboardPage() {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const locale = useAppStore((s) => s.locale);
  const t = dictionaries[locale] || dictionaries.en;

  function onSearch(e: FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/app/search?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <div className="space-y-8">
      <div>
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-[family-name:var(--font-display)] text-3xl text-white sm:text-4xl"
        >
          {t.dashboard}
        </motion.h1>
        <p className="mt-2 text-slate-400">Search symptoms, scan with AI, or open emergency guidance.</p>
      </div>

      <form onSubmit={onSearch} className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.searchPlaceholder}
          className="h-16 rounded-[1.5rem] pl-12 pr-28 text-base"
          aria-label="Search diseases and symptoms"
        />
        <Button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2">
          Analyze
        </Button>
      </form>

      <MedicalDisclaimer compact />

      <section>
        <div className="mb-3 flex items-center gap-2">
          <Zap className="h-4 w-4 text-rose-300" />
          <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-slate-400">{t.emergency}</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {emergencies.map((item) => (
            <Link key={item.id} href={`/app/emergency/${item.id}`}>
              <Card className="h-full transition hover:border-rose-400/30 hover:bg-rose-500/5">
                <CardContent className="p-4">
                  <div className="text-sm font-medium text-white">{item.title}</div>
                  <div className="mt-1 text-xs text-slate-400">Open guide</div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Scan with AI</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { href: "/app/scan", label: "Upload Image", icon: Upload },
              { href: "/app/scan?mode=camera", label: "Take Photo", icon: Camera },
              { href: "/app/scan", label: "Drag and Drop", icon: ImagePlus },
              { href: "/app/scan?mode=live", label: "Live Camera", icon: Camera },
            ].map((a) => (
              <Button key={a.label} asChild variant="secondary" className="h-auto justify-start py-4">
                <Link href={a.href}>
                  <a.icon className="h-4 w-4" />
                  {a.label}
                </Link>
              </Button>
            ))}
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-slate-400">Popular conditions</h2>
        <div className="flex flex-wrap gap-2">
          {popular.map((name) => (
            <Link
              key={name}
              href={`/app/search?q=${encodeURIComponent(`I have ${name.toLowerCase()}`)}`}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:border-cyan-400/30 hover:bg-cyan-400/10"
            >
              {name}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
