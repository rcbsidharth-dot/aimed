"use client";

import { useEffect, useState } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MedicalDisclaimer } from "@/components/medical-disclaimer";

export default function LabsPage() {
  const [name, setName] = useState("Hemoglobin");
  const [value, setValue] = useState("11.2");
  const [unit, setUnit] = useState("g/dL");
  const [low, setLow] = useState("12");
  const [high, setHigh] = useState("16");
  const [items, setItems] = useState<{ measured_at: string; value: number; name: string }[]>([]);
  const [plain, setPlain] = useState("");

  async function refresh() {
    const data = await api<{ items: { measured_at: string; value: number; name: string }[] }>(
      `/labs?name=${encodeURIComponent(name)}`,
    );
    setItems(data.items);
  }

  useEffect(() => {
    refresh().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function add() {
    const res = await api<{ plain_english: string }>("/labs", {
      method: "POST",
      body: JSON.stringify({
        name,
        value: Number(value),
        unit,
        reference_low: Number(low),
        reference_high: Number(high),
      }),
    });
    setPlain(res.plain_english);
    await refresh();
  }

  const chart = items.map((i) => ({
    date: new Date(i.measured_at).toLocaleDateString(),
    value: i.value,
  }));

  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-white">Lab Value Interpreter</h1>
      <MedicalDisclaimer compact />
      <Card>
        <CardHeader><CardTitle>Add value</CardTitle></CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-5">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
          <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Value" />
          <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Unit" />
          <Input value={low} onChange={(e) => setLow(e.target.value)} placeholder="Ref low" />
          <Input value={high} onChange={(e) => setHigh(e.target.value)} placeholder="Ref high" />
          <Button onClick={add} className="sm:col-span-5">Save & interpret</Button>
          {plain && <p className="sm:col-span-5 text-sm text-cyan-100">{plain}</p>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Trend</CardTitle></CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chart}>
              <XAxis dataKey="date" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#22d3ee" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
