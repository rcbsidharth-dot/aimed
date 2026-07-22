"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MedicalDisclaimer } from "@/components/medical-disclaimer";

export default function NutritionPage() {
  const [weight, setWeight] = useState("70");
  const [height, setHeight] = useState("170");
  const [bmi, setBmi] = useState<Record<string, unknown> | null>(null);
  const [water, setWater] = useState("250");

  async function calcBmi() {
    setBmi(
      await api("/nutrition/bmi", {
        method: "POST",
        body: JSON.stringify({ weight_kg: Number(weight), height_cm: Number(height) }),
      }),
    );
  }

  async function logWater() {
    await api("/nutrition/water", {
      method: "POST",
      body: JSON.stringify({ ml: Number(water) }),
    });
    alert("Water logged");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-white">Nutrition</h1>
      <MedicalDisclaimer compact />
      <Card>
        <CardHeader><CardTitle>BMI</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Input value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="kg" />
          <Input value={height} onChange={(e) => setHeight(e.target.value)} placeholder="cm" />
          <Button onClick={calcBmi}>Calculate</Button>
          {bmi && (
            <p className="w-full text-sm text-cyan-100">
              BMI {String(bmi.bmi)} · {String(bmi.category)}
            </p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Water intake</CardTitle></CardHeader>
        <CardContent className="flex gap-2">
          <Input value={water} onChange={(e) => setWater(e.target.value)} />
          <Button onClick={logWater}>Log ml</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Healthy recipe ideas</CardTitle></CardHeader>
        <CardContent className="text-sm text-slate-300">
          Oat bowl with berries · Lentil salad · Grilled fish with greens · Yogurt + nuts
        </CardContent>
      </Card>
    </div>
  );
}
