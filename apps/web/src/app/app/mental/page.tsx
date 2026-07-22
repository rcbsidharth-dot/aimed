"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MedicalDisclaimer } from "@/components/medical-disclaimer";

export default function MentalPage() {
  const [phq9, setPhq9] = useState<string[]>([]);
  const [gad7, setGad7] = useState<string[]>([]);
  const [phqScores, setPhqScores] = useState<number[]>(Array(9).fill(0));
  const [gadScores, setGadScores] = useState<number[]>(Array(7).fill(0));
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    api<{ phq9: string[]; gad7: string[] }>("/mental/assessments").then((d) => {
      setPhq9(d.phq9);
      setGad7(d.gad7);
    });
  }, []);

  async function submit() {
    const phq9_score = phqScores.reduce((a, b) => a + b, 0);
    const gad7_score = gadScores.reduce((a, b) => a + b, 0);
    const mood = Math.max(1, 10 - Math.round(phq9_score / 3));
    const data = await api<Record<string, unknown>>("/mental/mood", {
      method: "POST",
      body: JSON.stringify({ mood, phq9_score, gad7_score }),
    });
    setResult(data);
  }

  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-white">Mental Health</h1>
      <MedicalDisclaimer compact />
      <Card>
        <CardHeader><CardTitle>PHQ-9</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {phq9.map((q, i) => (
            <label key={q} className="block text-sm text-slate-300">
              {q}
              <input
                type="range"
                min={0}
                max={3}
                value={phqScores[i]}
                onChange={(e) => {
                  const next = [...phqScores];
                  next[i] = Number(e.target.value);
                  setPhqScores(next);
                }}
                className="mt-1 w-full accent-cyan-400"
              />
            </label>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>GAD-7</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {gad7.map((q, i) => (
            <label key={q} className="block text-sm text-slate-300">
              {q}
              <input
                type="range"
                min={0}
                max={3}
                value={gadScores[i]}
                onChange={(e) => {
                  const next = [...gadScores];
                  next[i] = Number(e.target.value);
                  setGadScores(next);
                }}
                className="mt-1 w-full accent-cyan-400"
              />
            </label>
          ))}
          <Button onClick={submit}>Save assessment</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Breathing exercise</CardTitle></CardHeader>
        <CardContent className="text-sm text-slate-300">
          Inhale 4s · hold 4s · exhale 6s · repeat for 2 minutes.
        </CardContent>
      </Card>
      {result && (
        <Card>
          <CardContent className="space-y-2 p-6 text-sm text-slate-200">
            <p>{String(result.guidance)}</p>
            {Boolean(result.crisis) && (
              <a className="text-rose-300 underline" href="tel:988">
                Crisis support — call now
              </a>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
