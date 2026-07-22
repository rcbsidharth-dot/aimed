"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MedicalDisclaimer } from "@/components/medical-disclaimer";

export default function FitnessPage() {
  const [hours, setHours] = useState("7.5");
  const [tip, setTip] = useState("");

  async function logSleep() {
    const data = await api<{ tip: string }>("/fitness/sleep", {
      method: "POST",
      body: JSON.stringify({ hours: Number(hours), quality: 7 }),
    });
    setTip(data.tip);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-white">Fitness & Sleep</h1>
      <MedicalDisclaimer compact />
      <Card>
        <CardHeader><CardTitle>Sleep tracking</CardTitle></CardHeader>
        <CardContent className="flex gap-2">
          <Input value={hours} onChange={(e) => setHours(e.target.value)} />
          <Button onClick={logSleep}>Log hours</Button>
          {tip && <p className="w-full text-sm text-slate-300">{tip}</p>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Recovery stretches</CardTitle></CardHeader>
        <CardContent className="text-sm text-slate-300">
          Neck rolls · Hip openers · Cat-cow · Hamstring stretch · Box breathing between sets
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Heart rate zones (guide)</CardTitle></CardHeader>
        <CardContent className="text-sm text-slate-300">
          Easy · Tempo · Threshold · VO2 — consult a clinician before intense training if you have cardiac risk factors.
        </CardContent>
      </Card>
    </div>
  );
}
