"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { dictionaries, type LocaleCode } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MedicalDisclaimer } from "@/components/medical-disclaimer";

export default function ProfilePage() {
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const store = useAppStore();

  useEffect(() => {
    api<Record<string, unknown>>("/profile").then(setProfile).catch(() => undefined);
  }, []);

  async function save() {
    if (!profile) return;
    const updated = await api<Record<string, unknown>>("/profile", {
      method: "PATCH",
      body: JSON.stringify({
        full_name: profile.full_name,
        age: Number(profile.age) || null,
        weight_kg: Number(profile.weight_kg) || null,
        height_cm: Number(profile.height_cm) || null,
        gender: profile.gender,
        conditions: String(profile.conditions_text || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        allergies: String(profile.allergies_text || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        medicines: String(profile.medicines_text || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        locale: store.locale,
        large_text: store.largeText,
        high_contrast: store.highContrast,
      }),
    });
    setProfile(updated);
    alert("Profile saved");
  }

  if (!profile) return <div className="h-40 animate-pulse rounded-3xl bg-white/5" />;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-white">User Profile</h1>
      <MedicalDisclaimer compact />
      <Card>
        <CardHeader>
          <CardTitle>
            Health score: {profile.health_score != null ? String(profile.health_score) : "—"}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <Input
            value={String(profile.full_name || "")}
            onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
            placeholder="Full name"
          />
          <Input
            value={String(profile.age ?? "")}
            onChange={(e) => setProfile({ ...profile, age: e.target.value })}
            placeholder="Age"
          />
          <Input
            value={String(profile.weight_kg ?? "")}
            onChange={(e) => setProfile({ ...profile, weight_kg: e.target.value })}
            placeholder="Weight kg"
          />
          <Input
            value={String(profile.height_cm ?? "")}
            onChange={(e) => setProfile({ ...profile, height_cm: e.target.value })}
            placeholder="Height cm"
          />
          <Input
            value={String(profile.gender || "")}
            onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
            placeholder="Gender"
          />
          <Input
            value={String(profile.conditions_text || (profile.conditions as string[] | undefined)?.join(", ") || "")}
            onChange={(e) => setProfile({ ...profile, conditions_text: e.target.value })}
            placeholder="Conditions (comma-separated)"
          />
          <Input
            value={String(profile.allergies_text || (profile.allergies as string[] | undefined)?.join(", ") || "")}
            onChange={(e) => setProfile({ ...profile, allergies_text: e.target.value })}
            placeholder="Allergies"
          />
          <Input
            value={String(profile.medicines_text || (profile.medicines as string[] | undefined)?.join(", ") || "")}
            onChange={(e) => setProfile({ ...profile, medicines_text: e.target.value })}
            placeholder="Medicines"
          />
          <label className="text-sm text-slate-300">
            Language
            <select
              className="mt-1 h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-3 text-white"
              value={store.locale}
              onChange={(e) => store.setLocale(e.target.value as LocaleCode)}
            >
              {Object.keys(dictionaries).map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={store.largeText} onChange={(e) => store.setLargeText(e.target.checked)} />
            Large text
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={store.highContrast}
              onChange={(e) => store.setHighContrast(e.target.checked)}
            />
            High contrast
          </label>
          <Button onClick={save}>Save profile</Button>
        </CardContent>
      </Card>
    </div>
  );
}
