"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MedicalDisclaimer } from "@/components/medical-disclaimer";

export default function MedicationsPage() {
  const [text, setText] = useState("Ibuprofen, Aspirin");
  const [pregnant, setPregnant] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  async function check() {
    setLoading(true);
    try {
      const medicines = text.split(",").map((s) => s.trim()).filter(Boolean);
      const data = await api<Record<string, unknown>>("/medications/check", {
        method: "POST",
        body: JSON.stringify({ medicines, pregnant }),
      });
      setResult(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-white">Medication Checker</h1>
      <MedicalDisclaimer compact />
      <Card>
        <CardHeader><CardTitle>Enter medicines</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Comma-separated medicines" />
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={pregnant} onChange={(e) => setPregnant(e.target.checked)} />
            Pregnancy safety check
          </label>
          <Button onClick={check} disabled={loading}>{loading ? "Checking…" : "Check interactions"}</Button>
        </CardContent>
      </Card>
      {result && (
        <Card>
          <CardContent className="space-y-3 p-6 text-sm text-slate-300">
            <pre className="overflow-x-auto whitespace-pre-wrap rounded-2xl bg-black/30 p-4 text-xs text-cyan-100">
              {JSON.stringify(result, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
