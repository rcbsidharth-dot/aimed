"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MedicalDisclaimer } from "@/components/medical-disclaimer";

export default function NearbyPage() {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [message, setMessage] = useState("");

  async function find(kind: string) {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject),
    ).catch(() => null);
    const lat = pos?.coords.latitude ?? 37.7749;
    const lng = pos?.coords.longitude ?? -122.4194;
    const data = await api<{ items: Record<string, unknown>[]; demo?: Record<string, unknown>[]; message?: string }>(
      "/nearby",
      {
        method: "POST",
        body: JSON.stringify({ lat, lng, kind }),
      },
    );
    setItems(data.items.length ? data.items : data.demo || []);
    setMessage(data.message || "");
  }

  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-white">Nearby Care</h1>
      <MedicalDisclaimer compact />
      <div className="flex flex-wrap gap-2">
        {["hospital", "clinic", "pharmacy", "emergency"].map((k) => (
          <Button key={k} variant="secondary" onClick={() => find(k)}>
            {k}
          </Button>
        ))}
      </div>
      {message && <p className="text-sm text-slate-400">{message}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item, idx) => (
          <Card key={idx}>
            <CardHeader>
              <CardTitle>{String(item.name || "Place")}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-400">
              {String(item.address || item.kind || "")}
              {item.distance_m ? ` · ${item.distance_m}m` : ""}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
