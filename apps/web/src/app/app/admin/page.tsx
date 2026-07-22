"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MedicalDisclaimer } from "@/components/medical-disclaimer";

export default function AdminPage() {
  const [data, setData] = useState<{
    user_count: number;
    users: { id: string; email: string; health_score?: number }[];
    audit_logs: { id: string; action: string; resource?: string; created_at: string }[];
  } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<typeof data extends null ? never : NonNullable<typeof data>>("/admin/overview")
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-white">Admin Dashboard</h1>
      <MedicalDisclaimer compact />
      {error && <p className="text-rose-300">{error}</p>}
      {data && (
        <>
          <Card>
            <CardHeader><CardTitle>Users · {data.user_count}</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-300">
              {data.users.map((u) => (
                <div key={u.id} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                  {u.email} · score {u.health_score ?? "—"}
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Audit logs</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-300">
              {data.audit_logs.map((a) => (
                <div key={a.id} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                  {a.action} · {a.resource} · {new Date(a.created_at).toLocaleString()}
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
