import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  FileUp,
  Languages,
  LoaderCircle,
  Maximize2,
  Minimize2,
  Minus,
  Moon,
  Plus,
  RotateCcw,
  Settings2,
  Sun,
  X,
  ChevronDown,
  PanelLeft,
  Bookmark,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { SOURCE_LANGUAGES, TARGET_LANGUAGES } from "@/lib/languages";
import {
  loadUploadedPdf,
  saveUploadedPdf,
} from "@/lib/pdf-storage";
import {
  DEFAULT_PDF_URL,
  useSettings,
} from "@/lib/store";
import { translateText } from "@/lib/translate";
import { cn } from "@/lib/utils";
import {
  PdfViewer,
  type PdfBookmark,
  type SelectionPayload,
  type TextBlock,
} from "./pdf-viewer";

function BookmarkTree({ items, onSelect }: { items: PdfBookmark[]; onSelect: (page: number) => void }) {
  return (
    <ul className="space-y-0.5">
      {items.map((item, index) => (
        <li key={`${item.title}-${index}`}>
          <button
            type="button"
            disabled={!item.page}
            className="w-full truncate rounded-md px-2 py-1.5 text-start text-xs text-muted hover:bg-fg/6 hover:text-fg disabled:cursor-default disabled:opacity-60"
            onClick={() => item.page && onSelect(item.page)}
          >
            {item.title}
          </button>
          {item.children.length ? <div className="ms-3 border-s border-border ps-1"><BookmarkTree items={item.children} onSelect={onSelect} /></div> : null}
        </li>
      ))}
    </ul>
  );
}

export function ReaderApp() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const finish = () => setMounted(true);
    const unsub = useSettings.persist.onFinishHydration(finish);
    if (useSettings.persist.hasHydrated()) finish();
    return unsub;
  }, []);
  if (!mounted) {
    return (
      <div className="flex h-dvh items-center justify-center bg-bg text-sm text-muted">
        Preparing reader…
      </div>
    );
  }
  return <ReaderShell />;
}

function ReaderShell() {
  const theme = useSettings((s) => s.theme);
  const pdfDarkMode = useSettings((s) => s.pdfDarkMode);
  const sourceLang = useSettings((s) => s.sourceLang);
  const targetLang = useSettings((s) => s.targetLang);
  const mode = useSettings((s) => s.mode);
  const setMode = useSettings((s) => s.setMode);
  const autoTranslate = useSettings((s) => s.autoTranslate);
  const page = useSettings((s) => s.page);
  const zoom = useSettings((s) => s.zoom);
  const pdfSource = useSettings((s) => s.pdfSource);
  const uploadName = useSettings((s) => s.uploadName);
  const history = useSettings((s) => s.history);
  const setTheme = useSettings((s) => s.setTheme);
  const setPage = useSettings((s) => s.setPage);
  const setZoom = useSettings((s) => s.setZoom);
  const setPdfSource = useSettings((s) => s.setPdfSource);
  const bookmarksOpen = useSettings((s) => s.bookmarksOpen);
  const setBookmarksOpen = useSettings((s) => s.setBookmarksOpen);
  const addHistory = useSettings((s) => s.addHistory);

  const [numPages, setNumPages] = useState(1);
  const [pageInput, setPageInput] = useState(String(page));
  const [pdfData, setPdfData] = useState<string | ArrayBuffer>(DEFAULT_PDF_URL);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bookmarks, setBookmarks] = useState<PdfBookmark[]>([]);
  const [mobileBookmarksOpen, setMobileBookmarksOpen] = useState(false);
  const [pending, setPending] = useState<SelectionPayload | null>(null);
  const [showBtn, setShowBtn] = useState(false);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [btnPos, setBtnPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setPageInput(String(page));
  }, [page]);

  useEffect(() => {
    if (!copyDialogOpen) return;
    const timeout = window.setTimeout(() => setCopyDialogOpen(false), 2600);
    return () => window.clearTimeout(timeout);
  }, [copyDialogOpen]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<{
    source: string;
    translation: string;
  } | null>(null);
  const [pageText, setPageText] = useState("");
  const [pageTextItems, setPageTextItems] = useState<string[]>([]);
  const [translatedPageText, setTranslatedPageText] = useState<string | null>(null);
  const [pageBlocks, setPageBlocks] = useState<TextBlock[]>([]);
  const [translatedBlocks, setTranslatedBlocks] = useState<Array<TextBlock & { translation: string }> | null>(null);
  const [pageTranslating, setPageTranslating] = useState(false);
  const [floatCard, setFloatCard] = useState<{
    x: number;
    y: number;
    source: string;
    text: string;
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const translatingFor = useRef<string | null>(null);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.classList.toggle("dark", theme === "dark" || (theme === "system" && media.matches));
    };
    apply();
    media.addEventListener("change", apply);
    document.documentElement.lang = "en";
    document.documentElement.dir = "ltr";
    return () => media.removeEventListener("change", apply);
  }, [theme]);

  useEffect(() => {
    let alive = true;
    async function restore() {
      if (pdfSource !== "upload") {
        setPdfData(DEFAULT_PDF_URL);
        return;
      }
      const stored = await loadUploadedPdf();
      if (!alive) return;
      if (stored) setPdfData(stored.data);
      else {
        setPdfSource("default");
        setPdfData(DEFAULT_PDF_URL);
      }
    }
    void restore();
    return () => {
      alive = false;
    };
  }, [pdfSource, setPdfSource]);

  const dismissTransient = useCallback(() => {
    setShowBtn(false);
    setFloatCard(null);
    setPending(null);
  }, []);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest("[data-translation-ui]")) return;
      if (target.closest("[data-settings-root]")) return;
      dismissTransient();
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [dismissTransient]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setPage(Math.min(numPages, page + 1));
        dismissTransient();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        setPage(Math.max(1, page - 1));
        dismissTransient();
      } else if (event.key === "Escape") {
        dismissTransient();
        setSettingsOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dismissTransient, numPages, page, setPage]);

  useEffect(() => {
    dismissTransient();
    setTranslatedBlocks(null);
    setTranslatedPageText(null);
    setPageTranslating(false);
  }, [page, dismissTransient]);

  const runTranslate = useCallback(
    async (payload: SelectionPayload) => {
      const key = `${sourceLang}:${targetLang}:${payload.text}`;
      if (translatingFor.current === key) return;
      translatingFor.current = key;
      setLoading(true);
      setError(null);
      setShowBtn(false);
      try {
        const res = await translateText({
          data: {
            text: payload.text,
            sourceLang,
            targetLang,
          },
        });
        if (!res.ok) {
          setError(res.error);
          return;
        }
        setCurrent({ source: payload.text, translation: res.text });
        addHistory({
          source: payload.text,
          translation: res.text,
          sourceLang,
          targetLang,
        });
        if (mode === "float") {
          setFloatCard({
            x: payload.mouseX,
            y: payload.mouseY,
            source: payload.text,
            text: res.text,
          });
        } else {
          setFloatCard(null);
        }
        window.getSelection()?.removeAllRanges();
      } catch {
        setError("Translation failed. Please try again.");
      } finally {
        setLoading(false);
        translatingFor.current = null;
      }
    },
    [addHistory, mode, sourceLang, targetLang],
  );

  const handleSelection = useCallback(
    (payload: SelectionPayload | null) => {
      if (!payload || !payload.text.trim()) {
        setShowBtn(false);
        setPending(null);
        return;
      }
      setFloatCard(null);
      setPending(payload);
      setError(null);
      if (autoTranslate) {
        void runTranslate(payload);
        return;
      }
      const pad = 12;
      const x = Math.min(window.innerWidth - 140, payload.mouseX + pad);
      const y = Math.min(window.innerHeight - 56, payload.mouseY + pad);
      setBtnPos({ x: Math.max(8, x), y: Math.max(8, y) });
      setShowBtn(true);
    },
    [autoTranslate, runTranslate],
  );

  async function onPickFile(file: File | undefined) {
    if (!file) return;
    setTranslatedPageText(null);
    setPageTextItems([]);
    await saveUploadedPdf(file);
    const buffer = await file.arrayBuffer();
    setPdfSource("upload", file.name);
    setPdfData(buffer);
    setCurrent(null);
    dismissTransient();
  }


  async function translateWholePage() {
    if (translatedBlocks) {
      setTranslatedBlocks(null);
      setTranslatedPageText(null);
        setCurrent(null);
      return;
    }
    if (!pageBlocks.length || pageTranslating) return;
    setPageTranslating(true);
    setError(null);
    try {
      const blocks = pageBlocks;
      if (!blocks.length) throw new Error("No text was detected on this page.");
      const paragraphTranslations: string[] = [];
      const results = await Promise.all(blocks.map(async (block, index) => {
        const res = await translateText({
          data: { text: block.text, sourceLang, targetLang },
        });
        if (!res.ok) throw new Error(res.error);
        paragraphTranslations[index] = res.text.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
        const parts = block.parts ?? [{ text: block.text, rect: block.rect }];
        if (parts.length === 1) return { ...block, translation: res.text };
        const words = res.text.trim().split(/\s+/).filter(Boolean);
        const totalChars = parts.reduce((sum, part) => sum + part.text.length, 0) || 1;
        let wordIndex = 0;
        const segmented = parts.map((part, index) => {
          const remainingParts = parts.length - index - 1;
          const targetChars = Math.round((part.text.length / totalChars) * words.length);
          const count = index === parts.length - 1
            ? words.length - wordIndex
            : Math.max(0, Math.min(words.length - wordIndex - remainingParts, targetChars));
          const translation = words.slice(wordIndex, wordIndex + count).join(" ");
          wordIndex += count;
          return { ...block, text: part.text, rect: part.rect, translation, parts: undefined };
        });
        return segmented;
      })).then((items) => items.flat());
      setTranslatedBlocks(results);
      setTranslatedPageText(paragraphTranslations.join("\n\n"));
      setCurrent({ source: blocks.map((block) => block.text).join("\n\n"), translation: results.map((block) => block.translation).join("\n\n") });
      addHistory({ source: blocks.map((block) => block.text).join("\n\n"), translation: results.map((block) => block.translation).join("\n\n"), sourceLang, targetLang });
      setSettingsOpen(false);
    } catch (error) {
      console.error("[v0] Page translation failed", error);
      setError(error instanceof Error ? error.message : "Page translation failed. Please try again.");
    } finally {
      setPageTranslating(false);
    }
  }

  const split = mode === "split";

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 767px)");
    const syncMobileMode = () => {
      if (mobileQuery.matches && mode === "split") setMode("float");
    };
    syncMobileMode();
    mobileQuery.addEventListener("change", syncMobileMode);
    return () => mobileQuery.removeEventListener("change", syncMobileMode);
  }, [mode, setMode]);

  const canPrev = page > 1;
  const canNext = page < numPages;

  const desktopWindow = (typeof window !== "undefined" ? window : undefined) as
    (Window & {
        morioDesktop?: {
          isDesktop?: boolean;
          windowControls?: {
            minimize: () => void;
            toggleMaximize: () => void;
            close: () => void;
          };
        };
      })
    | undefined;
  const desktopControls = desktopWindow?.morioDesktop;

  useEffect(() => {
    const electronAPI = (typeof window !== "undefined" ? window : undefined) as
      | (Window & {
          electronAPI?: {
            minimize: () => void;
            maximize: () => void;
            close: () => void;
          };
        })
      | undefined;
    if (!electronAPI?.electronAPI) return;

    const controls = electronAPI.electronAPI;
    const minimize = document.getElementById("minimize");
    const maximize = document.getElementById("maximize");
    const close = document.getElementById("close");
    minimize?.addEventListener("click", controls.minimize);
    maximize?.addEventListener("click", controls.maximize);
    close?.addEventListener("click", controls.close);
    return () => {
      minimize?.removeEventListener("click", controls.minimize);
      maximize?.removeEventListener("click", controls.maximize);
      close?.removeEventListener("click", controls.close);
    };
  }, []);

  return (
    <div className="glass-root flex h-dvh flex-col bg-bg text-fg">
      <div className="glass-backdrop" aria-hidden="true" />
      <header className="glass-panel flex shrink-0 items-center gap-2 bg-[var(--header)] px-2 py-1.5 text-white sm:px-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Morio%20book-dark%20mod-YFq92plZKjHgqOzYtNJeFjEFHNHdeQ.png"
            alt="Morio Book"
            className="h-8 w-auto max-w-[7.5rem] object-contain sm:h-9 sm:max-w-36"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-medium text-white">
              {pdfSource === "upload" && uploadName ? uploadName : "book.pdf"}
            </p>
          </div>
        </div>

        <div
          dir="ltr"
          className="mx-auto hidden shrink-0 items-center gap-1 rounded-lg bg-white/10 px-1 py-0.5 shadow-[0_0_0_1px_rgba(255,255,255,0.14)] sm:flex"
        >
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Previous page"
            disabled={!canPrev}
            onClick={() => {
              setPage(page - 1);
              dismissTransient();
            }}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <label className="flex min-w-20 items-center justify-center gap-1 px-1 text-xs tabular-nums text-muted">
            <span className="sr-only">Go to page</span>
            <input
              type="number"
              min={1}
              max={Math.max(numPages, 1)}
              value={pageInput}
              aria-label="Current page"
              className="w-10 bg-transparent text-center text-xs text-fg outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              onChange={(event) => {
                const nextValue = event.target.value;
                const previousValue = pageInput;
                setPageInput(nextValue);
                if (nextValue.length > previousValue.length) {
                  const nextPage = Number(nextValue);
                  if (Number.isFinite(nextPage)) setPage(Math.min(Math.max(1, nextPage), Math.max(numPages, 1)));
                }
              }}
              onKeyDown={(event) => {
                if ((event.nativeEvent as KeyboardEvent).isComposing || event.keyCode === 229) return;
                if (event.key === "Enter") event.currentTarget.blur();
              }}
              onBlur={(event) => {
                const nextPage = Number(event.currentTarget.value);
                const normalized = Number.isFinite(nextPage) ? Math.min(Math.max(1, nextPage), Math.max(numPages, 1)) : page;
                setPage(normalized);
                setPageInput(String(normalized));
              }}
            />
            <span aria-hidden="true">/ {numPages}</span>
          </label>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Next page"
            disabled={!canNext}
            onClick={() => {
              setPage(page + 1);
              dismissTransient();
            }}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <div className="ms-auto hidden shrink-0 items-center gap-0.5 sm:flex">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Zoom out"
            className="hidden sm:inline-flex"
            onClick={() => setZoom(zoom - 0.1)}
          >
            <Minus className="size-4" />
          </Button>
          <span className="hidden min-w-10 text-center text-[11px] tabular-nums text-muted sm:inline">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Zoom in"
            className="hidden sm:inline-flex"
            onClick={() => setZoom(zoom + 0.1)}
          >
            <Plus className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={translatedBlocks ? "Restore original" : "Translate page"}
            disabled={pageTranslating || (!translatedBlocks && !pageBlocks.length)}
            onClick={() => void translateWholePage()}
          >
            {pageTranslating ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : translatedPageText ? (
              <RotateCcw className="size-4" />
            ) : (
              <Languages className="size-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open another PDF"
            onClick={() => fileRef.current?.click()}
          >
            <FileUp className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={theme === "dark" ? "Light mode" : "Dark mode"}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? (
              <Sun className="size-4" />
            ) : (
              <Moon className="size-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Settings"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings2 className="size-4" />
          </Button>
        </div>
        {desktopControls?.isDesktop && desktopControls.windowControls ? (
          <div className="electron-window-controls ms-2 flex shrink-0 items-center gap-0.5 border-s border-white/15 ps-2">
            <button id="minimize" type="button" className="electron-window-button" aria-label="Minimize window">
              <Minimize2 className="size-3.5" />
            </button>
            <button id="maximize" type="button" className="electron-window-button" aria-label="Toggle fullscreen">
              <Maximize2 className="size-3.5" />
            </button>
            <button id="close" type="button" className="electron-window-button electron-window-close" aria-label="Close window">
              <X className="size-3.5" />
            </button>
          </div>
        ) : null}
      </header>

      <div className="fixed inset-x-2 bottom-14 z-50 flex items-center gap-0 rounded-2xl border border-white/10 bg-[var(--header)]/95 p-1.5 text-white shadow-[var(--shadow-float)] backdrop-blur-xl sm:hidden" dir="ltr">
        <Button className="min-w-0 flex-1" variant="ghost" size="icon-sm" aria-label="Previous page" disabled={!canPrev} onClick={() => setPage(page - 1)}><ChevronLeft className="size-4" /></Button>
        <label className="flex w-full min-w-0 items-center justify-center gap-0.5 text-xs tabular-nums text-muted"><span className="sr-only">Go to page</span><input type="number" min={1} max={Math.max(numPages, 1)} value={pageInput} aria-label="Current page" className="w-8 bg-transparent text-center text-xs text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" onChange={(event) => { const nextValue = event.target.value; const previousValue = pageInput; setPageInput(nextValue); if (nextValue.length > previousValue.length) { const nextPage = Number(nextValue); if (Number.isFinite(nextPage)) setPage(Math.min(Math.max(1, nextPage), Math.max(numPages, 1))); } }} onBlur={(event) => { const nextPage = Number(event.currentTarget.value); const normalized = Number.isFinite(nextPage) ? Math.min(Math.max(1, nextPage), Math.max(numPages, 1)) : page; setPage(normalized); setPageInput(String(normalized)); }} /><span aria-hidden="true">/ {numPages}</span></label>
        <Button className="min-w-0 flex-1" variant="ghost" size="icon-sm" aria-label="Next page" disabled={!canNext} onClick={() => setPage(page + 1)}><ChevronRight className="size-4" /></Button>
        <Button className="min-w-0 flex-1" variant="ghost" size="icon-sm" aria-label="Zoom out" onClick={() => setZoom(zoom - 0.1)}><Minus className="size-4" /></Button><span className="min-w-0 text-center text-[10px] tabular-nums text-muted">{Math.round(zoom * 100)}%</span><Button className="min-w-0 flex-1" variant="ghost" size="icon-sm" aria-label="Zoom in" onClick={() => setZoom(zoom + 0.1)}><Plus className="size-4" /></Button>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-1 border-t border-white/10 bg-[var(--header)] p-1 text-white sm:hidden" dir="ltr">
        <Button className="min-w-0 flex-1" variant="ghost" size="icon-sm" aria-label={translatedBlocks ? "Restore original" : "Translate page"} disabled={pageTranslating || (!translatedBlocks && !pageBlocks.length)} onClick={() => void translateWholePage()}>{pageTranslating ? <LoaderCircle className="size-4 animate-spin" /> : translatedPageText ? <RotateCcw className="size-4" /> : <Languages className="size-4" />}</Button>
        <Button className="min-w-0 flex-1" variant="ghost" size="icon-sm" aria-label="Open another PDF" onClick={() => fileRef.current?.click()}><FileUp className="size-4" /></Button>
        <Button className="min-w-0 flex-1" variant="ghost" size="icon-sm" aria-label={theme === "dark" ? "Light mode" : "Dark mode"} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}</Button>
        <Button className="min-w-0 flex-1" variant="ghost" size="icon-sm" aria-label="Settings" onClick={() => setSettingsOpen(true)}><Settings2 className="size-4" /></Button>
        {bookmarks.length ? <Button className="min-w-0 flex-1" variant="ghost" size="icon-sm" aria-label="Show bookmarks" onClick={() => setMobileBookmarksOpen(true)}><Bookmark className="size-4" /></Button> : <span />}
      </div>

      {mobileBookmarksOpen && bookmarks.length ? (
        <div className="fixed inset-0 z-[60] flex flex-col bg-bg p-4 sm:hidden" aria-label="PDF bookmarks">
          <div className="flex shrink-0 items-center justify-between border-b border-border pb-3">
            <h2 className="text-sm font-semibold text-fg">Bookmarks</h2>
            <Button variant="ghost" size="icon-sm" aria-label="Close bookmarks" onClick={() => setMobileBookmarksOpen(false)}><X className="size-4" /></Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-3"><BookmarkTree items={bookmarks} onSelect={(targetPage) => { setPage(targetPage); setMobileBookmarksOpen(false); }} /></div>
        </div>
      ) : null}

      <div
        className="flex min-h-0 flex-1 flex-col md:flex-row"
      >
        {bookmarks.length ? (
          <aside className={cn("relative hidden min-h-0 shrink-0 flex-col border-b border-border bg-elevated/40 md:flex md:h-full md:border-b-0 md:border-e", bookmarksOpen ? "md:w-64" : "md:w-10")} aria-label="PDF bookmarks">
            {bookmarksOpen ? (
              <>
                <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-border px-3 text-xs font-medium text-fg">
                  <span>Bookmarks</span>
                  <button type="button" className="rounded-md p-1.5 text-muted hover:bg-fg/8 hover:text-fg" onClick={() => setBookmarksOpen(false)} aria-label="Hide bookmarks">
                    <PanelLeft className="size-4" />
                  </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2">
                  <BookmarkTree items={bookmarks} onSelect={(targetPage) => setPage(targetPage)} />
                </div>
              </>
            ) : (
              <button type="button" className="flex h-10 w-full items-center justify-center rounded-md text-muted hover:bg-fg/8 hover:text-fg" onClick={() => setBookmarksOpen(true)} aria-label="Show bookmarks">
                <PanelLeft className="size-4" />
              </button>
            )}
          </aside>
        ) : null}
        <PdfViewer
          source={pdfData}
          page={Math.min(page, numPages)}
          zoom={zoom}
          onZoomChange={setZoom}
          onBookmarks={setBookmarks}
          onNumPages={(n) => {
            setNumPages(n);
            if (page > n) setPage(n);
          }}
          onSelection={handleSelection}
          pdfDarkMode={pdfDarkMode}
          onPageText={setPageText}
          onTextItems={setPageTextItems}
          onTextBlocks={(blocks) => {
            setPageBlocks(blocks);
            setTranslatedBlocks((previous) => {
              if (!previous) return previous;
              return blocks.map((block, index) => {
                const previousBlock = previous[index];
                return {
                  ...block,
                  translation:
                    previousBlock?.text === block.text
                      ? previousBlock.translation
                      : "",
                };
              }).filter((block) => block.translation.trim());
            });
          }}
          translatedBlocks={translatedBlocks}
          className="min-h-[min(24rem,58dvh)] min-w-0 flex-1 max-md:flex-[2]"
        />
        {split ? (
          <TranslatePanel
            current={current}
            loading={loading}
            error={error}
            history={history}
            className="min-h-0 shrink-0 max-md:max-h-[28%] md:w-80 md:max-w-[30vw]"
          />
        ) : null}
      </div>

      {showBtn && pending ? (
        <div
          data-translation-ui=""
          className="translation-actions fixed z-40 flex h-10 items-center gap-1 rounded-full border border-white/20 p-1 text-sm font-medium text-white shadow-[var(--shadow-float)]"
          style={{ left: btnPos.x, top: btnPos.y }}
        >
          <button
            type="button"
            className="translation-action flex size-8 items-center justify-center rounded-full transition-colors"
            aria-label="Translate selected text"
            onClick={() => void runTranslate(pending)}
          >
            <Languages className="size-4" />
          </button>
          <button
            type="button"
            className="translation-action flex size-8 items-center justify-center rounded-full transition-colors"
            aria-label="Copy selected text"
            onClick={async () => {
              await navigator.clipboard.writeText(pending.text);
              setCopyDialogOpen(true);
            }}
          >
            <Copy className="size-3.5" />
          </button>
        </div>
      ) : null}

      {loading && mode !== "split" ? (
        <div
          data-translation-ui=""
          className="fixed z-40 flex items-center gap-2 rounded-full bg-elevated px-3 py-2 text-xs text-muted shadow-[var(--shadow-float)]"
          style={{
            left: Math.min(window.innerWidth - 160, (pending?.mouseX ?? 24) + 8),
            top: Math.min(window.innerHeight - 48, (pending?.mouseY ?? 24) + 8),
          }}
        >
          <LoaderCircle className="size-3.5 animate-spin" />
          Translating…
        </div>
      ) : null}

      {floatCard ? (
        <aside
          data-translation-ui=""
          className="fixed z-40 max-w-80 rounded-xl bg-elevated p-3 text-fg shadow-[var(--shadow-float)]"
          style={{
            left: clamp(floatCard.x + 12, 8, window.innerWidth - 328),
            top: clamp(floatCard.y + 12, 8, window.innerHeight - 180),
          }}
          dir="auto"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[11px] font-medium text-muted">Translation</p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="flex size-8 items-center justify-center rounded-md text-muted hover:bg-fg/6 hover:text-fg"
                aria-label="Close"
                onClick={dismissTransient}
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>
          <p className="text-pretty text-sm leading-relaxed">{floatCard.text}</p>
        </aside>
      ) : null}

      {error && mode !== "split" ? (
        <div
          data-translation-ui=""
          className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-lg bg-elevated px-3 py-2 text-xs text-muted shadow-[var(--shadow-float)]"
        >
          {error}
        </div>
      ) : null}

      <input
        ref={fileRef}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          void onPickFile(file);
          event.target.value = "";
        }}
      />


      {copyDialogOpen ? (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed bottom-4 left-4 z-50 rounded-xl border border-border bg-elevated/75 px-3.5 py-2.5 text-sm text-fg shadow-[var(--shadow-float)] backdrop-blur-xl"
        >
          Copied successfully
        </div>
      ) : null}

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
    </div>
  );
}

function TranslatePanel({
  current,
  loading,
  error,
  history,
  className,
}: {
  current: { source: string; translation: string } | null;
  loading: boolean;
  error: string | null;
  history: { id: string; source: string; translation: string }[];
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const visible = current ?? (history[0]
    ? { source: history[0].source, translation: history[0].translation }
    : null);

  return (
    <aside
      className={cn(
        "flex min-h-0 flex-col border-t border-border bg-elevated md:border-t-0 md:border-s",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <p className="text-sm font-medium">Translation</p>
          <p className="text-[11px] text-subtle">Selected text from the book</p>
        </div>
        {visible ? (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Copy translation"
            onClick={async () => {
              await navigator.clipboard.writeText(visible.translation);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1200);
            }}
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          </Button>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted">
            <LoaderCircle className="size-4 animate-spin" />
            Translating…
          </div>
        ) : error ? (
          <p className="text-sm text-muted">{error}</p>
        ) : visible ? (
          <div className="space-y-4">
            <section>
              <p className="mb-1.5 text-[11px] font-medium text-subtle">Original</p>
              <p
                dir="auto"
                className="text-pretty text-sm leading-relaxed text-muted"
              >
                {visible.source}
              </p>
            </section>
            <section>
              <p className="mb-1.5 text-[11px] font-medium text-subtle">Translation</p>
              <p dir="auto" className="text-pretty text-base leading-relaxed">
                {visible.translation}
              </p>
            </section>
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-muted">
            Select text on the page. The Translation button will appear next to your selection.
          </p>
        )}
      </div>
    </aside>
  );
}

function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const sourceLang = useSettings((s) => s.sourceLang);
  const targetLang = useSettings((s) => s.targetLang);
  const mode = useSettings((s) => s.mode);
  const autoTranslate = useSettings((s) => s.autoTranslate);
  const theme = useSettings((s) => s.theme);
  const pdfDarkMode = useSettings((s) => s.pdfDarkMode);
  const zoom = useSettings((s) => s.zoom);
  const setSourceLang = useSettings((s) => s.setSourceLang);
  const setTargetLang = useSettings((s) => s.setTargetLang);
  const setMode = useSettings((s) => s.setMode);
  const setAutoTranslate = useSettings((s) => s.setAutoTranslate);
  const setTheme = useSettings((s) => s.setTheme);
  const setPdfDarkMode = useSettings((s) => s.setPdfDarkMode);
  const setZoom = useSettings((s) => s.setZoom);
  const pdfSource = useSettings((s) => s.pdfSource);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-bg/70" />
        <Dialog.Content
          data-settings-root=""
          className="fixed start-0 top-0 z-50 flex h-dvh w-full max-w-md flex-col bg-elevated shadow-[var(--shadow-float)] outline-none"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <Dialog.Title className="text-sm font-medium">Settings</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Close">
                <X className="size-4" />
              </Button>
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 space-y-6 overflow-auto p-4">
            <section className="space-y-3">
              <h3 className="text-xs font-medium text-muted">Language</h3>
              <FieldSelect
                label="Source language"
                value={sourceLang}
                onChange={setSourceLang}
                options={SOURCE_LANGUAGES}
              />
              <FieldSelect
                label="Target language"
                value={targetLang}
                onChange={setTargetLang}
                options={TARGET_LANGUAGES}
              />
            </section>

            <section className="space-y-3">
              <h3 className="text-xs font-medium text-muted">Translation mode</h3>
              <div className="grid gap-2">
                <div className="hidden md:block">
                  <ModeCard
                    active={mode === "split"}
                    title="70 / 30 split"
                  body="Book on the larger side, translation in the side panel."
                  onClick={() => setMode("split")}
                />
                <ModeCard
                  active={mode === "float"}
                  title="Floating"
                  body="Translation appears in a small window beside the selection."
                  onClick={() => setMode("float")}
                />
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3 rounded-xl bg-bg px-3 py-3 shadow-[var(--shadow-border)]">
                <div>
                  <p className="text-sm font-medium">Auto-translate</p>
                  <p className="text-[11px] text-subtle">
                    Translate automatically after a selection is completed.
                  </p>
                </div>
                <Switch
                  checked={autoTranslate}
                  onCheckedChange={setAutoTranslate}
                  aria-label="Auto-translate"
                />
              </div>
              <div className="flex flex-col items-stretch gap-2 rounded-xl bg-bg px-3 py-3 shadow-[var(--shadow-border)] sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                <div>
                  <p className="text-sm font-medium">Appearance</p>
                  <p className="text-[11px] text-subtle">Light for paper, dark for night.</p>
                </div>
                <div className="flex w-full rounded-lg bg-elevated p-0.5 shadow-[var(--shadow-border)] sm:w-auto">
                  <ThemeChip
                    active={theme === "system"}
                    onClick={() => setTheme("system")}
                    icon={<Settings2 className="size-3.5" />}
                    label="System"
                  />
                  <ThemeChip
                    active={theme === "light"}
                    onClick={() => setTheme("light")}
                    icon={<Sun className="size-3.5" />}
                    label="Light"
                  />
                  <ThemeChip
                    active={theme === "dark"}
                    onClick={() => setTheme("dark")}
                    icon={<Moon className="size-3.5" />}
                    label="Dark"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl bg-bg px-3 py-3 shadow-[var(--shadow-border)]">
                <div>
                  <p className="text-sm font-medium">Dark PDF mode</p>
                  <p className="text-[11px] text-subtle">Apply dark rendering to the PDF only.</p>
                </div>
                <Switch checked={pdfDarkMode} onCheckedChange={setPdfDarkMode} aria-label="Dark PDF mode" />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl bg-bg px-3 py-3 shadow-[var(--shadow-border)] sm:hidden">
                <p className="text-sm font-medium">Page size</p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setZoom(zoom - 0.1)}
                    aria-label="کوچ��‌نمایی"
                  >
                    <Minus className="size-4" />
                  </Button>
                  <span className="min-w-10 text-center text-xs tabular-nums text-muted">
                    {Math.round(zoom * 100)}%
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setZoom(zoom + 0.1)}
                    aria-label="Zoom in"
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
              </div>
            </section>

            <section className="space-y-3 border-t border-border pt-5">
              <h3 className="text-xs font-medium text-muted">About</h3>
              <div className="rounded-xl bg-bg px-3.5 py-3 shadow-[var(--shadow-border)]">
                <p className="text-sm font-medium">Morteza Beik-Nezhad</p>
                <a
                  className="mt-1 block text-xs text-accent transition-colors hover:text-accent/80"
                  href="mailto:moriobeik.dev@gmail.com"
                >
                  moriobeik.dev@gmail.com
                </a>
              </div>
            </section>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function FieldSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { code: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.code === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [open]);

  return (
    <div ref={containerRef} className="relative block">
      <span className="mb-1.5 block text-[11px] text-subtle">{label}</span>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex h-11 w-full items-center justify-between rounded-xl border border-border bg-bg-elevated px-3 text-start text-sm text-fg shadow-[var(--shadow-border)] outline-none transition-colors hover:border-accent/55 focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/25"
      >
        <span>{selected?.label}</span>
        <ChevronDown className={cn("size-4 text-subtle transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <div className="language-options absolute inset-x-0 top-full z-50 mt-2 max-h-60 overflow-auto rounded-xl p-1.5" role="listbox">
          {options.map((option) => (
            <button
              key={option.code}
              type="button"
              role="option"
              aria-selected={option.code === value}
              onClick={() => {
                onChange(option.code);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-start text-sm text-fg transition-colors hover:bg-accent/10",
                option.code === value && "bg-accent/15 font-medium text-accent",
              )}
            >
              {option.label}
              {option.code === value ? <Check className="size-4" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ModeCard({
  active,
  title,
  body,
  onClick,
}: {
  active: boolean;
  title: string;
  body: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl bg-bg px-3 py-3 text-start shadow-[var(--shadow-border)] transition-colors duration-150",
        active && "ring-2 ring-accent/50",
      )}
    >
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-0.5 text-[11px] leading-relaxed text-subtle">{body}</p>
    </button>
  );
}

function ThemeChip({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-8 items-center gap-1 rounded-md px-2.5 text-xs transition-colors duration-150",
        active ? "bg-accent text-accent-fg" : "text-muted hover:text-fg",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
