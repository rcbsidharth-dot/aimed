"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { MedicalDisclaimer } from "@/components/medical-disclaimer";
import { severityColor } from "@/lib/utils";

type Event = {
  id: string;
  title: string;
  summary?: string;
  event_type: string;
  severity?: string;
  created_at: string;
};

export default function TimelinePage() {
  const [items, setItems] = useState<Event[]>([]);

  useEffect(() => {
    api<{ items: Event[] }>("/timeline").then((d) => setItems(d.items)).catch(() => undefined);
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-white">Health Timeline</h1>
      <MedicalDisclaimer compact />
      <div className="relative space-y-4 border-l border-white/10 pl-6">
        {items.map((item) => (
          <Card key={item.id} className="relative">
            <div className="absolute -left-[1.9rem] top-6 h-3 w-3 rounded-full bg-cyan-400" />
            <CardContent className="p-5">
              <div className="flex flex-wrap items-center gap-2">
                <div className="font-medium text-white">{item.title}</div>
                {item.severity && (
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] ${severityColor(item.severity)}`}>
                    {item.severity}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-400">{item.summary}</p>
              <div className="mt-2 text-xs text-slate-500">
                {item.event_type} · {new Date(item.created_at).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        ))}
        {!items.length && <p className="text-slate-500">No events yet — run a search or scan.</p>}
      </div>
    </div>
  );
}
