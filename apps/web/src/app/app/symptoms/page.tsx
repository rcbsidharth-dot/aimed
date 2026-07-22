"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MedicalDisclaimer } from "@/components/medical-disclaimer";
import { severityColor } from "@/lib/utils";

function SymptomsInner() {
  const params = useSearchParams();
  const region = params.get("region");
  const [complaint, setComplaint] = useState(region ? `Pain or symptoms in my ${region}` : "");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [step, setStep] = useState(0);
  const [total, setTotal] = useState(0);
  const [prediction, setPrediction] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  async function start() {
    setLoading(true);
    try {
      const data = await api<{ conversation_id: string; question: string; step: number; total: number }>(
        "/symptoms/start",
        {
          method: "POST",
          body: JSON.stringify({ chief_complaint: complaint, body_region: region }),
        },
      );
      setConversationId(data.conversation_id);
      setQuestion(data.question);
      setStep(data.step);
      setTotal(data.total);
      setPrediction(null);
    } finally {
      setLoading(false);
    }
  }

  async function submitAnswer() {
    if (!conversationId || !answer.trim()) return;
    setLoading(true);
    try {
      const data = await api<{
        done: boolean;
        question?: string;
        step?: number;
        total?: number;
        prediction?: Record<string, unknown>;
      }>("/symptoms/answer", {
        method: "POST",
        body: JSON.stringify({ conversation_id: conversationId, answer }),
      });
      setAnswer("");
      if (data.done) {
        setPrediction(data.prediction || null);
        setQuestion("");
      } else {
        setQuestion(data.question || "");
        setStep(data.step || 0);
        setTotal(data.total || total);
      }
    } finally {
      setLoading(false);
    }
  }

  const diseases = (prediction?.possible_diseases as { name: string; confidence: number; severity: string }[]) || [];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-white">AI Symptom Checker</h1>
      <MedicalDisclaimer compact />
      {!conversationId && (
        <Card>
          <CardHeader><CardTitle>What bothers you?</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input value={complaint} onChange={(e) => setComplaint(e.target.value)} placeholder="My stomach hurts" />
            <Button onClick={start} disabled={loading || !complaint.trim()}>
              Begin guided check
            </Button>
          </CardContent>
        </Card>
      )}
      {conversationId && question && (
        <Card>
          <CardHeader>
            <CardTitle>
              Question {step + 1}/{total}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-slate-200">{question}</p>
            <Input value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Your answer" />
            <Button onClick={submitAnswer} disabled={loading}>Continue</Button>
          </CardContent>
        </Card>
      )}
      {prediction && (
        <Card>
          <CardHeader><CardTitle>Prediction</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-300">
            <div className={`inline-flex rounded-full border px-3 py-1 text-xs ${severityColor(String(prediction.overall_severity || ""))}`}>
              {String(prediction.overall_severity || "")}
            </div>
            {diseases.map((d) => (
              <div key={d.name} className="rounded-xl border border-white/10 bg-white/5 p-3">
                {d.name} · {Math.round(d.confidence * 100)}% · {d.severity}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function SymptomsPage() {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-3xl bg-white/5" />}>
      <SymptomsInner />
    </Suspense>
  );
}
