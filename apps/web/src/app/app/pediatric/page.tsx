"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MedicalDisclaimer } from "@/components/medical-disclaimer";

export default function PediatricPage() {
  const [medicine, setMedicine] = useState("acetaminophen");
  const [weight, setWeight] = useState("15");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  async function calc() {
    const data = await api<Record<string, unknown>>("/pediatric/dose", {
      method: "POST",
      body: JSON.stringify({ medicine, weight_kg: Number(weight) }),
    });
    setResult(data);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-white">Pediatric Assistant</h1>
      <MedicalDisclaimer compact />
      <Card>
        <CardHeader><CardTitle>Weight-based dose calculator</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input value={medicine} onChange={(e) => setMedicine(e.target.value)} placeholder="Medicine" />
          <Input value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="Weight kg" />
          <Button onClick={calc}>Calculate</Button>
          <p className="text-xs text-slate-400">Educational estimate only — verify with a pediatric clinician.</p>
        </CardContent>
      </Card>
      {result && (
        <Card>
          <CardContent className="p-6">
            <pre className="overflow-x-auto whitespace-pre-wrap rounded-2xl bg-black/30 p-4 text-xs text-cyan-100">
              {JSON.stringify(result, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
