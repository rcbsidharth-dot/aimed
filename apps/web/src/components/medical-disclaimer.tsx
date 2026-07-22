"use client";

import { DISCLAIMER } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

export function MedicalDisclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <div
      role="note"
      className="flex items-start gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-amber-100"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <p className={compact ? "text-xs leading-relaxed" : "text-sm leading-relaxed"}>
        {DISCLAIMER}
      </p>
    </div>
  );
}
