"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { severityColor } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MedicalDisclaimer } from "@/components/medical-disclaimer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SearchResult = {
  possible_diseases?: { name: string; confidence: number; severity: string }[];
  overall_severity?: string;
  red_flags?: string[];
  recommended_actions?: string[];
  medicine_suggestions?: { name: string; note: string }[];
  home_remedies?: string[];
  when_to_go_to_er?: string[];
  specialist?: string;
  recovery_timeline?: string;
  references?: string[];
  disclaimer?: string;
};

function SearchInner() {
  const params = useSearchParams();
  const initial = params.get("q") || "";
  const [query, setQuery] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState("");
  const { eli5, locale } = useAppStore();

  async function run(q = query) {
    if (!q.trim()) return;
    setLoading(true);
    setError("");
    try {
      const data = await api<SearchResult>("/search", {
        method: "POST",
        body: JSON.stringify({ query: q, eli5, locale }),
      });
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initial) run(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-white">Disease search</h1>
      <div className="flex gap-2">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="I have chest pain" />
        <Button onClick={() => run()} disabled={loading}>
          {loading ? "Analyzing…" : "Search"}
        </Button>
      </div>
      <MedicalDisclaimer compact />
      {error && <p className="text-rose-300">{error}</p>}
      {loading && <div className="h-40 animate-pulse rounded-3xl bg-white/5" />}
      {result && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Possible diseases</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className={`inline-flex rounded-full border px-3 py-1 text-xs ${severityColor(result.overall_severity)}`}>
                Overall severity: {result.overall_severity || "unknown"}
              </div>
              {(result.possible_diseases || []).map((d) => (
                <div key={d.name} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium text-white">{d.name}</div>
                    <div className="text-xs text-cyan-300">{Math.round(d.confidence * 100)}%</div>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full bg-cyan-400" style={{ width: `${Math.round(d.confidence * 100)}%` }} />
                  </div>
                  <div className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-[11px] ${severityColor(d.severity)}`}>
                    {d.severity}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Actions & red flags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-300">
              <Section title="Red flags" items={result.red_flags} />
              <Section title="Recommended actions" items={result.recommended_actions} />
              <Section title="When to go to ER" items={result.when_to_go_to_er} />
              <Section title="Home remedies" items={result.home_remedies} />
              <div>
                <div className="mb-1 text-white">Specialist</div>
                <p>{result.specialist}</p>
              </div>
              <div>
                <div className="mb-1 text-white">Recovery timeline</div>
                <p>{result.recovery_timeline}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Medicines & references</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                {(result.medicine_suggestions || []).map((m) => (
                  <div key={m.name} className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm">
                    <div className="font-medium text-white">{m.name}</div>
                    <div className="text-slate-400">{m.note}</div>
                  </div>
                ))}
              </div>
              <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">
                {(result.references || []).map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function Section({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <div className="mb-1 text-white">{title}</div>
      <ul className="list-disc space-y-1 pl-5">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-3xl bg-white/5" />}>
      <SearchInner />
    </Suspense>
  );
}
