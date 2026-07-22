"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MedicalDisclaimer } from "@/components/medical-disclaimer";

type Vax = { id: string; name: string; category: string; due_on?: string | null };

export default function VaccinesPage() {
  const [items, setItems] = useState<Vax[]>([]);
  const [name, setName] = useState("Influenza");
  const [category, setCategory] = useState("adult");

  async function load() {
    const data = await api<{ items: Vax[] }>("/vaccinations");
    setItems(data.items);
  }

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  async function add() {
    await api("/vaccinations", {
      method: "POST",
      body: JSON.stringify({ name, category }),
    });
    await load();
  }

  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-white">Vaccination Tracker</h1>
      <MedicalDisclaimer compact />
      <Card>
        <CardHeader><CardTitle>Add vaccine</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} className="max-w-xs" />
          <select
            className="h-12 rounded-2xl border border-white/10 bg-white/5 px-3 text-white"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="adult">Adult</option>
            <option value="child">Child</option>
            <option value="travel">Travel</option>
          </select>
          <Button onClick={add}>Add</Button>
        </CardContent>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((i) => (
          <Card key={i.id}>
            <CardContent className="p-5">
              <div className="font-medium text-white">{i.name}</div>
              <div className="mt-1 text-xs uppercase tracking-wide text-cyan-300">{i.category}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
