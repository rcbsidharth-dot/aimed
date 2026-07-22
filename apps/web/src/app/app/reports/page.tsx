"use client";

import { useState } from "react";
import { API_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MedicalDisclaimer } from "@/components/medical-disclaimer";

export default function ReportsPage() {
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  async function onFile(file: File | null) {
    if (!file) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API_URL}/api/v1/reports/analyze?report_type=lab`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error(await res.text());
      setResult(await res.json());
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-white">Report Analyzer</h1>
      <MedicalDisclaimer compact />
      <Card>
        <CardHeader><CardTitle>Upload PDF or image</CardTitle></CardHeader>
        <CardContent>
          <input
            type="file"
            accept="image/*,application/pdf,.txt"
            onChange={(e) => onFile(e.target.files?.[0] || null)}
          />
          {loading && <p className="mt-3 text-sm text-slate-400">Extracting & explaining…</p>}
        </CardContent>
      </Card>
      {result && (
        <Card>
          <CardHeader><CardTitle>AI explanation</CardTitle></CardHeader>
          <CardContent>
            <pre className="overflow-x-auto whitespace-pre-wrap rounded-2xl bg-black/30 p-4 text-xs text-cyan-100">
              {JSON.stringify(result, null, 2)}
            </pre>
            <Button className="mt-4 no-print" variant="secondary" onClick={() => window.print()}>
              Export / Print
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
