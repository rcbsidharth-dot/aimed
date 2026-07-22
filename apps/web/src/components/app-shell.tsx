"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Baby,
  Bone,
  Brain,
  ClipboardList,
  HeartPulse,
  LayoutDashboard,
  MapPin,
  MessageSquare,
  Pill,
  ScanLine,
  Settings,
  ShieldAlert,
  Stethoscope,
  Syringe,
  User,
  Apple,
  LineChart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAppStore } from "@/lib/store";

const links = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/chat", label: "AI Chat", icon: MessageSquare },
  { href: "/app/symptoms", label: "Symptom Checker", icon: Stethoscope },
  { href: "/app/scan", label: "Image Scan", icon: ScanLine },
  { href: "/app/body-map", label: "Body Map", icon: Bone },
  { href: "/app/emergency", label: "Emergency", icon: ShieldAlert },
  { href: "/app/medications", label: "Medications", icon: Pill },
  { href: "/app/reports", label: "Reports", icon: ClipboardList },
  { href: "/app/labs", label: "Labs", icon: LineChart },
  { href: "/app/vaccines", label: "Vaccines", icon: Syringe },
  { href: "/app/pregnancy", label: "Pregnancy", icon: HeartPulse },
  { href: "/app/pediatric", label: "Pediatric", icon: Baby },
  { href: "/app/mental", label: "Mental Health", icon: Brain },
  { href: "/app/nutrition", label: "Nutrition", icon: Apple },
  { href: "/app/fitness", label: "Fitness", icon: Activity },
  { href: "/app/nearby", label: "Nearby Care", icon: MapPin },
  { href: "/app/timeline", label: "Timeline", icon: Activity },
  { href: "/app/risk", label: "Risk", icon: HeartPulse },
  { href: "/app/profile", label: "Profile", icon: User },
  { href: "/app/admin", label: "Admin", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { largeText, highContrast, eli5, setEli5 } = useAppStore();

  return (
    <div
      className={cn(
        "min-h-screen text-slate-100",
        largeText && "text-lg",
        highContrast && "contrast-125",
      )}
    >
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_rgba(34,211,238,0.12),_transparent_50%),radial-gradient(ellipse_at_bottom_right,_rgba(16,185,129,0.1),_transparent_40%),linear-gradient(180deg,#05080f,#07111c_40%,#05080f)]" />
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 overflow-y-auto border-r border-white/10 bg-black/20 p-4 backdrop-blur-xl lg:block">
          <Link href="/" className="mb-8 block px-2">
            <div className="text-xs uppercase tracking-[0.25em] text-cyan-300/80">AI Doctor</div>
            <div className="font-[family-name:var(--font-display)] text-xl text-white">in a Box</div>
          </Link>
          <nav className="space-y-1" aria-label="Main">
            {links.map((link) => {
              const active = pathname === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                    active
                      ? "bg-cyan-400/15 text-cyan-100 border border-cyan-400/20"
                      : "text-slate-300 hover:bg-white/5 hover:text-white",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-white/10 bg-[#05080f]/70 px-4 py-3 backdrop-blur-xl sm:px-6">
            <div className="lg:hidden">
              <div className="text-sm font-medium text-white">AI Doctor in a Box</div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <label className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200">
                <input
                  type="checkbox"
                  checked={eli5}
                  onChange={(e) => setEli5(e.target.checked)}
                  className="accent-cyan-400"
                />
                ELI5 mode
              </label>
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
          <nav
            className="sticky bottom-0 grid grid-cols-5 gap-1 border-t border-white/10 bg-[#05080f]/90 p-2 backdrop-blur-xl lg:hidden"
            aria-label="Mobile"
          >
            {links.slice(0, 5).map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] text-slate-300"
                >
                  <Icon className="h-4 w-4" />
                  {link.label.split(" ")[0]}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
