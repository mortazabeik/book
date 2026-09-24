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
  Minus,
  Moon,
  Plus,
  RotateCcw,
  Settings2,
  Sun,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { SOURCE_LANGUAGES, TARGET_LANGUAGES } from "@/lib/languages";
import {
  clearUploadedPdf,
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
  type SelectionPayload,
} from "./pdf-viewer";

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
        در حال آماده‌سازی خواننده…
      </div>
    );
  }
  return <ReaderShell />;
}

function ReaderShell() {
  const theme = useSettings((s) => s.theme);
  const sourceLang = useSettings((s) => s.sourceLang);
  const targetLang = useSettings((s) => s.targetLang);
  const mode = useSettings((s) => s.mode);
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
  const addHistory = useSettings((s) => s.addHistory);

  const [numPages, setNumPages] = useState(1);
  const [pdfData, setPdfData] = useState<string | ArrayBuffer>(DEFAULT_PDF_URL);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pending, setPending] = useState<SelectionPayload | null>(null);
  const [showBtn, setShowBtn] = useState(false);
  const [btnPos, setBtnPos] = useState({ x: 0, y: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<{
    source: string;
    translation: string;
  } | null>(null);
  const [pageTranslation, setPageTranslation] = useState<string | null>(null);
  const [floatCard, setFloatCard] = useState<{
    x: number;
    y: number;
    text: string;
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const translatingFor = useRef<string | null>(null);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.lang = "fa";
    document.documentElement.dir = "rtl";
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
  }, [mode, dismissTransient]);

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
            text: res.text,
          });
        } else {
          setFloatCard(null);
        }
        window.getSelection()?.removeAllRanges();
      } catch {
        setError("خطا در ترجمه. دوباره تلاش کنید.");
      } finally {
        setLoading(false);
        translatingFor.current = null;
      }
    },
    [addHistory, mode, sourceLang, targetLang],
  );

  const handleSelection = useCallback(
    (payload: SelectionPayload | null) => {
      if (!payload) {
        setShowBtn(false);
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
    await saveUploadedPdf(file);
    const buffer = await file.arrayBuffer();
    setPdfSource("upload", file.name);
    setPdfData(buffer);
    setCurrent(null);
    dismissTransient();
  }

  const translatePage = useCallback(
    async (text: string) => {
      setLoading(true);
      setError(null);
      const res = await translateText({ data: { text, sourceLang, targetLang } });
      if (res.ok) setPageTranslation(res.text);
      else setError(res.error);
      setLoading(false);
    },
    [sourceLang, targetLang],
  );

  async function restoreDefaultPdf() {
    await clearUploadedPdf();
    setPdfSource("default");
    setPdfData(DEFAULT_PDF_URL);
    setCurrent(null);
    dismissTransient();
  }

  const split = mode === "split";
  const canPrev = page > 1;
  const canNext = page < numPages;

  return (
    <div className="glass-root flex h-dvh flex-col bg-bg text-fg">
      <div className="glass-backdrop" aria-hidden="true" />
      <header className="glass-panel flex shrink-0 items-center gap-2 border-b border-border px-2 py-1.5 sm:px-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-md bg-accent/12 text-accent">
            <BookOpen className="size-4" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium leading-tight">ترجمان</p>
            <p className="truncate text-[11px] text-subtle">
              {pdfSource === "upload" && uploadName ? uploadName : "book.pdf"}
            </p>
          </div>
        </div>

        <div
          dir="ltr"
          className="mx-auto flex items-center gap-1 rounded-lg bg-bg px-1 py-0.5 shadow-[var(--shadow-border)]"
        >
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="صفحه قبل"
            disabled={!canPrev}
            onClick={() => {
              setPage(page - 1);
              dismissTransient();
            }}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-16 px-1 text-center text-xs tabular-nums text-muted">
            {page} / {numPages}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="صفحه بعد"
            disabled={!canNext}
            onClick={() => {
              setPage(page + 1);
              dismissTransient();
            }}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <div className="ms-auto flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="کوچک‌نمایی"
            className="hidden sm:inline-flex"
            onClick={() => setZoom(zoom - 0.1)}
          >
            <Minus className="size-4" />
          </Button>
          <span className="hidden min-w-10 text-center text-[11px] tabular-nums text-muted sm:inline">
            {Math.round(zoom * 100)}٪
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="بزرگ‌نمایی"
            className="hidden sm:inline-flex"
            onClick={() => setZoom(zoom + 0.1)}
          >
            <Plus className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="ترجمه کل صفحه"
            disabled={loading}
            onClick={() => {
              const text = document.querySelector(".pdf-page .textLayer")?.textContent?.trim();
              if (text) void translatePage(text);
            }}
          >
            <Languages className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="باز کردن PDF دیگر"
            onClick={() => fileRef.current?.click()}
          >
            <FileUp className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={theme === "dark" ? "حالت روشن" : "حالت تاریک"}
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
            aria-label="تنظیمات"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings2 className="size-4" />
          </Button>
        </div>
      </header>

      <div
        className={cn(
          "flex min-h-0 flex-1",
          split
            ? "flex-col md:grid md:grid-cols-10"
            : "flex-col",
        )}
      >
        <PdfViewer
          source={pdfData}
          page={Math.min(page, numPages)}
          zoom={zoom}
          onZoomChange={setZoom}
          translatedText={pageTranslation}
          onNumPages={(n) => {
            setNumPages(n);
            if (page > n) setPage(n);
          }}
          onSelection={handleSelection}
          className={split ? "md:col-span-7 min-h-0 max-md:min-h-0 max-md:flex-[1.2]" : ""}
        />
        {split ? (
          <TranslatePanel
            current={current}
            loading={loading}
            error={error}
            history={history}
            className="max-md:max-h-[38%] md:col-span-3"
          />
        ) : null}
      </div>

      {showBtn && pending ? (
        <button
          type="button"
          data-translation-ui=""
          className="fixed z-40 flex h-10 items-center gap-1.5 rounded-full bg-accent px-3.5 text-sm font-medium text-accent-fg shadow-[var(--shadow-float)]"
          style={{ left: btnPos.x, top: btnPos.y }}
          onClick={() => void runTranslate(pending)}
        >
          <Languages className="size-3.5" />
          ترجمه
        </button>
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
          در حال ترجمه…
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
            <p className="text-[11px] font-medium text-muted">ترجمه</p>
            <button
              type="button"
              className="flex size-8 items-center justify-center rounded-md text-muted hover:bg-fg/6 hover:text-fg"
              aria-label="بستن"
              onClick={dismissTransient}
            >
              <X className="size-3.5" />
            </button>
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

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onRestorePdf={() => void restoreDefaultPdf()}
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
          <p className="text-sm font-medium">ترجمه</p>
          <p className="text-[11px] text-subtle">متن انتخاب‌شده در کتاب</p>
        </div>
        {visible ? (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="رونوشت"
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
            در حال ترجمه…
          </div>
        ) : error ? (
          <p className="text-sm text-muted">{error}</p>
        ) : visible ? (
          <div className="space-y-4">
            <section>
              <p className="mb-1.5 text-[11px] font-medium text-subtle">اصل</p>
              <p
                dir="auto"
                className="text-pretty text-sm leading-relaxed text-muted"
              >
                {visible.source}
              </p>
            </section>
            <section>
              <p className="mb-1.5 text-[11px] font-medium text-subtle">ترجمه</p>
              <p dir="auto" className="text-pretty text-base leading-relaxed">
                {visible.translation}
              </p>
            </section>
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-muted">
            متنی را در صفحه کتاب انتخاب کنید. دکمه ترجمه کنار نشانگر ظاهر
            می‌شود.
          </p>
        )}
      </div>
    </aside>
  );
}

function SettingsDialog({
  open,
  onOpenChange,
  onRestorePdf,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestorePdf: () => void;
}) {
  const sourceLang = useSettings((s) => s.sourceLang);
  const targetLang = useSettings((s) => s.targetLang);
  const mode = useSettings((s) => s.mode);
  const autoTranslate = useSettings((s) => s.autoTranslate);
  const theme = useSettings((s) => s.theme);
  const zoom = useSettings((s) => s.zoom);
  const setSourceLang = useSettings((s) => s.setSourceLang);
  const setTargetLang = useSettings((s) => s.setTargetLang);
  const setMode = useSettings((s) => s.setMode);
  const setAutoTranslate = useSettings((s) => s.setAutoTranslate);
  const setTheme = useSettings((s) => s.setTheme);
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
            <Dialog.Title className="text-sm font-medium">تنظیمات</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon-sm" aria-label="بستن">
                <X className="size-4" />
              </Button>
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 space-y-6 overflow-auto p-4">
            <section className="space-y-3">
              <h3 className="text-xs font-medium text-muted">زبان</h3>
              <FieldSelect
                label="زبان مبدأ"
                value={sourceLang}
                onChange={setSourceLang}
                options={SOURCE_LANGUAGES}
              />
              <FieldSelect
                label="زبان مقصد"
                value={targetLang}
                onChange={setTargetLang}
                options={TARGET_LANGUAGES}
              />
            </section>

            <section className="space-y-3">
              <h3 className="text-xs font-medium text-muted">حالت ترجمه</h3>
              <div className="grid gap-2">
                <ModeCard
                  active={mode === "split"}
                  title="تقسیم ۷۰ / ۳۰"
                  body="کتاب در سمت بزرگ‌تر، ترجمه در پنل کناری."
                  onClick={() => setMode("split")}
                />
                <ModeCard
                  active={mode === "float"}
                  title="شناور"
                  body="ترجمه در پنجره‌ای کوچک کنار انتخاب ظاهر می‌شود."
                  onClick={() => setMode("float")}
                />
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3 rounded-xl bg-bg px-3 py-3 shadow-[var(--shadow-border)]">
                <div>
                  <p className="text-sm font-medium">ترجمه خودکار</p>
                  <p className="text-[11px] text-subtle">
                    پس از تمام شدن انتخاب، بدون دکمه ترجمه شود.
                  </p>
                </div>
                <Switch
                  checked={autoTranslate}
                  onCheckedChange={setAutoTranslate}
                  aria-label="ترجمه خودکار"
                />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl bg-bg px-3 py-3 shadow-[var(--shadow-border)]">
                <div>
                  <p className="text-sm font-medium">ظاهر</p>
                  <p className="text-[11px] text-subtle">روشن برای کاغذ، تاریک برای شب</p>
                </div>
                <div className="flex rounded-lg bg-elevated p-0.5 shadow-[var(--shadow-border)]">
                  <ThemeChip
                    active={theme === "light"}
                    onClick={() => setTheme("light")}
                    icon={<Sun className="size-3.5" />}
                    label="روشن"
                  />
                  <ThemeChip
                    active={theme === "dark"}
                    onClick={() => setTheme("dark")}
                    icon={<Moon className="size-3.5" />}
                    label="تاریک"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl bg-bg px-3 py-3 shadow-[var(--shadow-border)] sm:hidden">
                <p className="text-sm font-medium">اندازه صفحه</p>
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
                    {Math.round(zoom * 100)}٪
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setZoom(zoom + 0.1)}
                    aria-label="بزرگ‌نمایی"
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="text-xs font-medium text-muted">فایل</h3>
              {pdfSource === "upload" ? (
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={onRestorePdf}
                >
                  <RotateCcw className="size-4" />
                  بازگشت به book.pdf
                </Button>
              ) : (
                <p className="px-1 text-[11px] text-subtle">
                  فایل پیش‌فرض book.pdf از حافظه همین برنامه خوانده می‌شود.
                </p>
              )}
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
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] text-subtle">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-lg bg-bg px-3 text-sm text-fg shadow-[var(--shadow-border)] outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        {options.map((option) => (
          <option key={option.code} value={option.code}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
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
