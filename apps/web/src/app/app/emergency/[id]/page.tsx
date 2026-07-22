"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Phone } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MedicalDisclaimer } from "@/components/medical-disclaimer";

type Guide = {
  title: string;
  summary: string;
  immediate_steps: string[];
  do_not: string[];
  call_emergency: boolean;
  visual_guide: string[];
};

export default function EmergencyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [guide, setGuide] = useState<Guide | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    api<Guide>(`/emergency/${id}`).then(setGuide).catch(() => undefined);
  }, [id]);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  if (!guide) return <div className="h-40 animate-pulse rounded-3xl bg-white/5" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-white">{guide.title}</h1>
          <p className="mt-2 text-slate-400">{guide.summary}</p>
        </div>
        <a href="tel:911">
          <Button variant="danger" className="gap-2">
            <Phone className="h-4 w-4" /> Call emergency
          </Button>
        </a>
      </div>
      <MedicalDisclaimer compact />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Immediate steps</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-200">
              {guide.immediate_steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>What NOT to do</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-2 pl-5 text-sm text-rose-100/90">
              {guide.do_not.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Visual guide</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {guide.visual_guide.map((step, i) => (
            <div key={step} className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-50">
              {i + 1}. {step}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="no-print">
        <CardHeader>
          <CardTitle>Timer</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <div className="font-[family-name:var(--font-display)] text-4xl text-white">
            {String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}
          </div>
          <Button variant="secondary" onClick={() => setRunning((r) => !r)}>
            {running ? "Pause" : "Start"}
          </Button>
          <Button variant="ghost" onClick={() => { setRunning(false); setSeconds(0); }}>
            Reset
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            Print instructions
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
