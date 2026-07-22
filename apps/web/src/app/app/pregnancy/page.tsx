"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MedicalDisclaimer } from "@/components/medical-disclaimer";

export default function PregnancyPage() {
  const [week, setWeek] = useState(20);
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  async function load() {
    const res = await api<Record<string, unknown>>("/pregnancy/week", {
      method: "POST",
      body: JSON.stringify({ week }),
    });
    setData(res);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-white">Pregnancy Assistant</h1>
      <MedicalDisclaimer compact />
      <Card>
        <CardHeader><CardTitle>Week by week</CardTitle></CardHeader>
        <CardContent className="flex gap-2">
          <Input
            type="number"
            min={1}
            max={42}
            value={week}
            onChange={(e) => setWeek(Number(e.target.value))}
          />
          <Button onClick={load}>Load guidance</Button>
        </CardContent>
      </Card>
      {data && (
        <Card>
          <CardContent className="space-y-3 p-6 text-sm text-slate-300">
            <pre className="overflow-x-auto whitespace-pre-wrap rounded-2xl bg-black/30 p-4 text-xs text-cyan-100">
              {JSON.stringify(data, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
