import { create } from "zustand";
import { persist } from "zustand/middleware";

export type TranslateMode = "split" | "replace" | "float";
export type ThemeMode = "system" | "light" | "dark";

export type HistoryItem = {
  id: string;
  source: string;
  translation: string;
  sourceLang: string;
  targetLang: string;
  ts: number;
};

type SettingsState = {
  theme: ThemeMode;
  sourceLang: string;
  targetLang: string;
  mode: TranslateMode;
  autoTranslate: boolean;
  pdfDarkMode: boolean;
  page: number;
  zoom: number;
  pdfSource: "default" | "upload";
  uploadName: string;
  history: HistoryItem[];
  setTheme: (theme: ThemeMode) => void;
  setSourceLang: (code: string) => void;
  setTargetLang: (code: string) => void;
  setMode: (mode: TranslateMode) => void;
  setAutoTranslate: (value: boolean) => void;
  setPdfDarkMode: (value: boolean) => void;
  setPage: (page: number) => void;
  setZoom: (zoom: number) => void;
  setPdfSource: (source: "default" | "upload", name?: string) => void;
  addHistory: (item: Omit<HistoryItem, "id" | "ts">) => void;
  clearHistory: () => void;
};

export const DEFAULT_PDF_URL = "/book.pdf";

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "system",
      sourceLang: "auto",
      targetLang: "fa",
      mode: "split",
      autoTranslate: false,
      pdfDarkMode: false,
      page: 1,
      zoom: 1,
      pdfSource: "default",
      uploadName: "",
      history: [],
      setTheme: (theme) => set({ theme }),
      setSourceLang: (sourceLang) => set({ sourceLang }),
      setTargetLang: (targetLang) => set({ targetLang }),
      setMode: (mode) => set({ mode }),
      setAutoTranslate: (autoTranslate) => set({ autoTranslate }),
      setPdfDarkMode: (pdfDarkMode) => set({ pdfDarkMode }),
      setPage: (page) => set({ page: Math.max(1, page) }),
      setZoom: (zoom) => set({ zoom: Math.min(2.4, Math.max(0.6, zoom)) }),
      setPdfSource: (pdfSource, name) =>
        set({
          pdfSource,
          uploadName: pdfSource === "upload" ? (name ?? "") : "",
          page: 1,
        }),
      addHistory: (item) =>
        set((state) => ({
          history: [
            {
              ...item,
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              ts: Date.now(),
            },
            ...state.history,
          ].slice(0, 40),
        })),
      clearHistory: () => set({ history: [] }),
    }),
    {
      name: "tarjomaan-settings",
      partialize: (state) => ({
        theme: state.theme,
        sourceLang: state.sourceLang,
        targetLang: state.targetLang,
        mode: state.mode,
        autoTranslate: state.autoTranslate,
        pdfDarkMode: state.pdfDarkMode,
        page: state.page,
        zoom: state.zoom,
        pdfSource: state.pdfSource,
        uploadName: state.uploadName,
        history: state.history.slice(0, 12),
      }),
    },
  ),
);
