"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MedicalDisclaimer } from "@/components/medical-disclaimer";

export default function RiskPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  async function run() {
    setData(await api("/risk/predict", { method: "POST", body: JSON.stringify({ include_profile: true }) }));
  }

  const risks = (data?.risks as { condition: string; score: number; level: string }[]) || [];

  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-white">AI Risk Prediction</h1>
      <MedicalDisclaimer compact />
      <Button onClick={run}>Estimate informational risks</Button>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {risks.map((r) => (
          <Card key={r.condition}>
            <CardHeader>
              <CardTitle>{r.condition}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-2 text-2xl text-cyan-200">{Math.round(r.score * 100)}%</div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full bg-cyan-400" style={{ width: `${Math.round(r.score * 100)}%` }} />
              </div>
              <div className="mt-2 text-xs uppercase tracking-wide text-slate-400">{r.level}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
