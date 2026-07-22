"use client";

import { Suspense, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { API_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MedicalDisclaimer } from "@/components/medical-disclaimer";
import { severityColor } from "@/lib/utils";

type Result = {
  id?: string;
  possible_conditions?: { name: string; confidence: number }[];
  severity_score?: number;
  confidence?: number;
  urgency?: string;
  visual_explanation?: string;
  bounding_boxes?: { label: string; x: number; y: number; w: number; h: number }[];
  recommendations?: string[];
};

function ScanInner() {
  const params = useSearchParams();
  const mode = params.get("mode");
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  function onFile(f: File | null) {
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
  }

  async function startCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }
  }

  function captureFrame() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx?.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const f = new File([blob], "capture.jpg", { type: "image/jpeg" });
      onFile(f);
    }, "image/jpeg");
  }

  async function analyze() {
    if (!file) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API_URL}/api/v1/images/analyze?body_region=skin`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error(await res.text());
      setResult(await res.json());
    } catch (e) {
      alert(e instanceof Error ? e.message : "Analyze failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-white">AI Image Diagnosis</h1>
      <MedicalDisclaimer compact />
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          onFile(e.dataTransfer.files?.[0] || null);
        }}
        className={`rounded-3xl border border-dashed p-8 text-center transition ${
          dragOver ? "border-cyan-400 bg-cyan-400/10" : "border-white/15 bg-white/5"
        }`}
      >
        <p className="text-slate-300">Drag and drop a medical photo, or choose a file.</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button variant="secondary" onClick={() => inputRef.current?.click()}>Upload Image</Button>
          <Button variant="secondary" onClick={startCamera}>
            {mode === "live" ? "Live Camera" : "Take Photo"}
          </Button>
          <Button onClick={captureFrame} variant="outline">Capture frame</Button>
          <Button onClick={analyze} disabled={!file || loading}>{loading ? "Analyzing…" : "Analyze with AI"}</Button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0] || null)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Preview</CardTitle></CardHeader>
          <CardContent>
            <video ref={videoRef} className="mb-3 w-full rounded-2xl bg-black" muted playsInline />
            {preview ? (
              <div className="relative overflow-hidden rounded-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Upload preview" className="w-full rounded-2xl object-cover" />
                {(result?.bounding_boxes || []).map((b, i) => (
                  <div
                    key={`${b.label}-${i}`}
                    className="absolute border-2 border-cyan-300/80 bg-cyan-300/10"
                    style={{
                      left: `${b.x * 100}%`,
                      top: `${b.y * 100}%`,
                      width: `${b.w * 100}%`,
                      height: `${b.h * 100}%`,
                    }}
                  >
                    <span className="bg-cyan-400 px-1 text-[10px] text-slate-950">{b.label}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-56 items-center justify-center rounded-2xl bg-white/5 text-sm text-slate-500">
                No image yet
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>AI findings</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-300">
            {result ? (
              <>
                <div className={`inline-flex rounded-full border px-3 py-1 text-xs ${severityColor(result.urgency)}`}>
                  Urgency: {result.urgency}
                </div>
                <p>{result.visual_explanation}</p>
                <div>Severity score: {Math.round((result.severity_score || 0) * 100)}%</div>
                <div>Confidence: {Math.round((result.confidence || 0) * 100)}%</div>
                {(result.possible_conditions || []).map((c) => (
                  <div key={c.name} className="rounded-xl border border-white/10 bg-white/5 p-3">
                    {c.name} · {Math.round(c.confidence * 100)}%
                  </div>
                ))}
                <ul className="list-disc pl-5">
                  {(result.recommendations || []).map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-slate-500">Results appear after analysis.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ScanPage() {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-3xl bg-white/5" />}>
      <ScanInner />
    </Suspense>
  );
}
