import { useEffect, useRef, useState, type MouseEvent } from "react";
import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from "pdfjs-dist";
import { cn } from "@/lib/utils";

export type OverlayRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type SelectionPayload = {
  text: string;
  mouseX: number;
  mouseY: number;
  rects: OverlayRect[];
};

type PdfViewerProps = {
  source: string | ArrayBuffer | null;
  page: number;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  replaceText: string | null;
  replaceRects: OverlayRect[] | null;
  onNumPages: (n: number) => void;
  onSelection: (payload: SelectionPayload | null) => void;
  className?: string;
};

export function PdfViewer({
  source,
  page,
  zoom,
  onZoomChange,
  replaceText,
  replaceRects,
  onNumPages,
  onSelection,
  className,
}: PdfViewerProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const onNumPagesRef = useRef(onNumPages);
  const onSelectionRef = useRef(onSelection);
  onNumPagesRef.current = onNumPages;
  onSelectionRef.current = onSelection;

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState({ width: 396, height: 612 });
  const [viewWidth, setViewWidth] = useState(0);
  const [docGen, setDocGen] = useState(0);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? el.clientWidth;
      setViewWidth(Math.round(width));
    });
    ro.observe(el);
    setViewWidth(Math.round(el.clientWidth));
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!source) return;
    const src = source;
    let cancelled = false;
    let destroy: (() => void) | undefined;

    async function loadDoc() {
      setStatus("loading");
      setError(null);
      pdfRef.current = null;
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      const payload =
        typeof src === "string"
          ? { url: src }
          : { data: new Uint8Array(src.slice(0)) };
      const task = pdfjs.getDocument({
        ...payload,
        cMapUrl: "/cmaps/",
        cMapPacked: true,
        standardFontDataUrl: "/standard_fonts/",
      });
      destroy = () => {
        void task.destroy();
      };
      try {
        const pdf = await task.promise;
        if (cancelled) return;
        pdfRef.current = pdf;
        onNumPagesRef.current(pdf.numPages);
        setDocGen((n) => n + 1);
      } catch {
        if (cancelled) return;
        setStatus("error");
        setError("نتوانستیم این فایل را باز کنیم");
      }
    }

    void loadDoc();
    return () => {
      cancelled = true;
      destroy?.();
      pdfRef.current = null;
    };
  }, [source]);

  useEffect(() => {
    const loaded = pdfRef.current;
    if (!loaded || viewWidth < 80) return;
    let cancelled = false;

    async function renderPage(doc: PDFDocumentProxy) {
      setStatus("loading");
      const pdfjs = await import("pdfjs-dist");
      const pageNum = Math.min(Math.max(1, page), doc.numPages);
      let pdfPage: PDFPageProxy;
      try {
        pdfPage = await doc.getPage(pageNum);
      } catch {
        if (!cancelled) {
          setStatus("error");
          setError("این صفحه در دسترس نیست");
        }
        return;
      }
      if (cancelled) return;

      const available = Math.max(260, viewWidth - 40);
      const base = pdfPage.getViewport({ scale: 1 });
      const scale = (available / base.width) * zoom;
      const viewport = pdfPage.getViewport({ scale });
      setPageSize({ width: viewport.width, height: viewport.height });

      const canvas = canvasRef.current;
      const textLayerDiv = textLayerRef.current;
      const pageEl = pageRef.current;
      if (!canvas || !textLayerDiv || !pageEl) return;

      const outputScale = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      pageEl.style.setProperty("--total-scale-factor", String(scale));
      pageEl.style.width = `${Math.floor(viewport.width)}px`;
      pageEl.style.height = `${Math.floor(viewport.height)}px`;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      renderTaskRef.current?.cancel();
      const transform =
        outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;
      const renderTask = pdfPage.render({
        canvas,
        canvasContext: ctx,
        viewport,
        transform,
      });
      renderTaskRef.current = renderTask;

      try {
        await renderTask.promise;
      } catch (err) {
        const name = err instanceof Error ? err.name : "";
        if (name === "RenderingCancelledException" || cancelled) return;
        setStatus("error");
        setError("رسم صفحه با خطا روبه‌رو شد");
        return;
      }
      if (cancelled) return;

      const textContent = await pdfPage.getTextContent();
      if (cancelled) return;
      textLayerDiv.innerHTML = "";
      textLayerDiv.style.width = `${viewport.width}px`;
      textLayerDiv.style.height = `${viewport.height}px`;
      const textLayer = new pdfjs.TextLayer({
        textContentSource: textContent,
        container: textLayerDiv,
        viewport,
      });
      await textLayer.render();
      if (!cancelled) setStatus("ready");
    }

    void renderPage(loaded);
    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
    };
  }, [docGen, page, zoom, viewWidth]);

  function handleMouseUp(event: MouseEvent<HTMLDivElement>) {
    const layer = textLayerRef.current;
    if (!layer) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      onSelectionRef.current(null);
      return;
    }
    const anchor = sel.anchorNode;
    if (!anchor || !layer.contains(anchor)) {
      onSelectionRef.current(null);
      return;
    }
    const text = sel.toString().replace(/\s+/g, " ").trim();
    if (!text) {
      onSelectionRef.current(null);
      return;
    }
    const range = sel.getRangeAt(0);
    const pageEl = pageRef.current;
    if (!pageEl) return;
    const pageBox = pageEl.getBoundingClientRect();
    const rects: OverlayRect[] = [...range.getClientRects()]
      .filter((rect) => rect.width > 1 && rect.height > 1)
      .map((rect) => ({
        left: rect.left - pageBox.left,
        top: rect.top - pageBox.top,
        width: rect.width,
        height: rect.height,
      }));
    onSelectionRef.current({
      text,
      mouseX: event.clientX,
      mouseY: event.clientY,
      rects,
    });
  }

  const box = boundingBox(replaceRects);

  useEffect(() => {
    const layer = textLayerRef.current;
    if (!layer || !replaceText || !replaceRects?.length) return;
    const pageBox = pageRef.current?.getBoundingClientRect();
    if (!pageBox) return;
    const selected = replaceRects.map((rect) => ({
      left: pageBox.left + rect.left,
      top: pageBox.top + rect.top,
      right: pageBox.left + rect.left + rect.width,
      bottom: pageBox.top + rect.top + rect.height,
    }));
    const spans = [...layer.querySelectorAll<HTMLElement>("span")];
    const matches = spans.filter((span) => {
      const rect = span.getBoundingClientRect();
      return selected.some(
        (target) =>
          rect.left < target.right &&
          rect.right > target.left &&
          rect.top < target.bottom &&
          rect.bottom > target.top,
      );
    });
    if (!matches.length) return;
    matches.forEach((span, index) => {
      span.textContent = index === 0 ? replaceText : "";
      span.style.color = index === 0 ? "var(--fg)" : "transparent";
      span.style.whiteSpace = "normal";
      span.style.zIndex = "2";
    });
  }, [replaceText, replaceRects, pageSize]);

  function handleWheel(event: React.WheelEvent<HTMLDivElement>) {
    if (!event.ctrlKey) return;
    event.preventDefault();
    onZoomChange(zoom + (event.deltaY < 0 ? 0.1 : -0.1));
  }

  return (
    <div
      ref={scrollerRef}
      dir="ltr"
      className={cn("relative min-h-0 flex-1 overflow-auto bg-bg-subtle", className)}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
    >
      <div className="flex min-h-full justify-center p-4 sm:p-6">
        <div
          ref={pageRef}
          className="pdf-page relative bg-paper shadow-[var(--shadow-page)]"
          style={{
            width: pageSize.width,
            height: pageSize.height,
            ["--scale-round-x" as string]: "1px",
            ["--scale-round-y" as string]: "1px",
          }}
        >
          <canvas ref={canvasRef} className="pdf-canvas block h-full w-full" />
          <div ref={textLayerRef} className="textLayer" />
          {replaceText && box ? (
            <div
              data-translation-ui=""
              className="replace-overlay absolute z-20 overflow-auto rounded-sm bg-paper px-2 py-1.5 text-fg shadow-[var(--shadow-border)]"
              style={{
                left: box.left,
                top: box.top,
                minWidth: box.width,
                minHeight: box.height,
                maxWidth: Math.max(box.width, pageSize.width - box.left - 12),
              }}
              dir="auto"
            >
              <p className="text-pretty text-sm leading-relaxed">{replaceText}</p>
            </div>
          ) : null}
          {status === "loading" ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-paper/80 text-sm text-muted">
              در حال گشودن صفحه…
            </div>
          ) : null}
          {status === "error" ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-paper p-6 text-center text-sm text-muted">
              {error}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function boundingBox(rects: OverlayRect[] | null) {
  if (!rects || rects.length === 0) return null;
  let left = Infinity;
  let top = Infinity;
  let right = 0;
  let bottom = 0;
  for (const rect of rects) {
    left = Math.min(left, rect.left);
    top = Math.min(top, rect.top);
    right = Math.max(right, rect.left + rect.width);
    bottom = Math.max(bottom, rect.top + rect.height);
  }
  return { left, top, width: right - left, height: bottom - top };
}
