"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MedicalDisclaimer } from "@/components/medical-disclaimer";

const regions = [
  { id: "head", label: "Head", top: "8%", left: "42%", w: "16%", h: "10%" },
  { id: "eye", label: "Eye", top: "12%", left: "46%", w: "8%", h: "4%" },
  { id: "ear", label: "Ear", top: "14%", left: "36%", w: "6%", h: "5%" },
  { id: "neck", label: "Neck", top: "18%", left: "44%", w: "12%", h: "5%" },
  { id: "chest", label: "Chest", top: "24%", left: "38%", w: "24%", h: "14%" },
  { id: "abdomen", label: "Abdomen", top: "38%", left: "40%", w: "20%", h: "12%" },
  { id: "arm", label: "Arm", top: "28%", left: "22%", w: "12%", h: "22%" },
  { id: "back", label: "Back", top: "26%", left: "64%", w: "14%", h: "20%" },
  { id: "leg", label: "Leg", top: "55%", left: "40%", w: "10%", h: "28%" },
  { id: "skin", label: "Skin", top: "48%", left: "58%", w: "12%", h: "10%" },
];

export default function BodyMapPage() {
  const [view, setView] = useState<"front" | "back">("front");
  const [person, setPerson] = useState<"male" | "female" | "child">("male");
  const [selected, setSelected] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-white">Interactive Body Map</h1>
      <MedicalDisclaimer compact />
      <div className="flex flex-wrap gap-2">
        {(["front", "back"] as const).map((v) => (
          <Button key={v} variant={view === v ? "default" : "secondary"} onClick={() => setView(v)}>
            {v}
          </Button>
        ))}
        {(["male", "female", "child"] as const).map((p) => (
          <Button key={p} variant={person === p ? "outline" : "ghost"} onClick={() => setPerson(p)}>
            {p}
          </Button>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{person} · {view}</CardTitle></CardHeader>
          <CardContent>
            <div className="relative mx-auto aspect-[3/5] max-w-sm rounded-[2rem] bg-gradient-to-b from-slate-700/40 to-slate-900/60">
              <div className="absolute inset-x-[30%] top-[6%] h-[12%] rounded-full bg-slate-500/40" />
              <div className="absolute inset-x-[38%] top-[18%] h-[8%] bg-slate-500/30" />
              <div className="absolute inset-x-[28%] top-[24%] h-[30%] rounded-[2rem] bg-slate-500/25" />
              <div className="absolute left-[12%] top-[26%] h-[28%] w-[14%] rounded-full bg-slate-500/20" />
              <div className="absolute right-[12%] top-[26%] h-[28%] w-[14%] rounded-full bg-slate-500/20" />
              <div className="absolute left-[38%] top-[54%] h-[34%] w-[10%] rounded-full bg-slate-500/20" />
              <div className="absolute right-[38%] top-[54%] h-[34%] w-[10%] rounded-full bg-slate-500/20" />
              {regions.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  aria-label={r.label}
                  onClick={() => setSelected(r.id)}
                  className={`absolute rounded-xl border transition ${
                    selected === r.id
                      ? "border-cyan-300 bg-cyan-400/30"
                      : "border-cyan-400/20 bg-cyan-400/10 hover:bg-cyan-400/20"
                  }`}
                  style={{ top: r.top, left: r.left, width: r.w, height: r.h }}
                />
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Selected region</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-300">
            {selected ? (
              <>
                <p className="text-lg text-white capitalize">{selected}</p>
                <p>Common symptoms for this region can start a guided checker.</p>
                <Button
                  onClick={() =>
                    router.push(`/app/symptoms?region=${encodeURIComponent(selected)}`)
                  }
                >
                  Start symptom checker
                </Button>
              </>
            ) : (
              <p>Tap a body region to continue.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
