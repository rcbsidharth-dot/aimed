import { create } from "zustand";
import { persist } from "zustand/middleware";

type Locale = "en" | "es" | "hi" | "fr" | "de" | "ar" | "zh" | "ja";

interface AppState {
  locale: Locale;
  eli5: boolean;
  largeText: boolean;
  highContrast: boolean;
  setLocale: (locale: Locale) => void;
  setEli5: (v: boolean) => void;
  setLargeText: (v: boolean) => void;
  setHighContrast: (v: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      locale: "en",
      eli5: false,
      largeText: false,
      highContrast: false,
      setLocale: (locale) => set({ locale }),
      setEli5: (eli5) => set({ eli5 }),
      setLargeText: (largeText) => set({ largeText }),
      setHighContrast: (highContrast) => set({ highContrast }),
    }),
    { name: "aidoctor-prefs" },
  ),
);
