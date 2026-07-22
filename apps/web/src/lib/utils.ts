import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const DISCLAIMER =
  "AI Doctor in a Box provides general information only and is not a substitute for professional medical advice, diagnosis, or treatment. Call local emergency services for emergencies.";

export function severityColor(severity?: string) {
  const s = (severity || "").toLowerCase();
  if (s.includes("high") || s.includes("severe") || s.includes("critical")) return "text-rose-400 bg-rose-500/15 border-rose-500/30";
  if (s.includes("moderate") || s.includes("medium")) return "text-amber-300 bg-amber-500/15 border-amber-500/30";
  return "text-emerald-300 bg-emerald-500/15 border-emerald-500/30";
}
