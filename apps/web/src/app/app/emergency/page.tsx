"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { MedicalDisclaimer } from "@/components/medical-disclaimer";

type Item = { id: string; title: string; summary: string; call_emergency: boolean };

export default function EmergencyIndex() {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    api<{ items: Item[] }>("/emergency").then((d) => setItems(d.items)).catch(() => undefined);
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-white">Emergency Assistant</h1>
      <MedicalDisclaimer />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Link key={item.id} href={`/app/emergency/${item.id}`}>
            <Card className="h-full transition hover:border-rose-400/40">
              <CardContent className="p-5">
                <div className="font-medium text-white">{item.title}</div>
                <p className="mt-2 text-sm text-slate-400">{item.summary}</p>
                {item.call_emergency && (
                  <div className="mt-3 text-xs uppercase tracking-wide text-rose-300">Call emergency</div>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
