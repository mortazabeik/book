import { useEffect, useRef, useState, type MouseEvent, type PointerEvent, type WheelEvent } from "react";
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

export type TextBlock = {
  text: string;
  rect: OverlayRect;
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  fontStyle: string;
  color: string;
};

type PdfViewerProps = {
  source: string | ArrayBuffer | null;
  page: number;
  zoom: number;
  pdfDarkMode: boolean;
  onZoomChange: (zoom: number) => void;
  onNumPages: (n: number) => void;
  onSelection: (payload: SelectionPayload | null) => void;
  onPageText?: (text: string) => void;
  onPageImage?: (image: Blob, size: { width: number; height: number; pixelWidth: number; pixelHeight: number }) => void;
  onTextItems?: (items: string[]) => void;
  onTextBlocks?: (blocks: TextBlock[]) => void;
  translatedBlocks?: Array<TextBlock & { translation: string }> | null;
  className?: string;
};

export function PdfViewer({
  source,
  page,
  zoom,
  pdfDarkMode,
  onZoomChange,
  onNumPages,
  onSelection,
  onPageText,
  onPageImage,
  onTextItems,
  onTextBlocks,
  translatedBlocks,
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
  const onPageTextRef = useRef(onPageText);
  const onTextItemsRef = useRef(onTextItems);
  onNumPagesRef.current = onNumPages;
  onSelectionRef.current = onSelection;
  onPageTextRef.current = onPageText;
  onTextItemsRef.current = onTextItems;
  const onTextBlocksRef = useRef(onTextBlocks);
  onTextBlocksRef.current = onTextBlocks;

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
        setError("We could not open this file");
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
          setError("This page is unavailable");
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
        setError("The page could not be rendered");
        return;
      }
      if (cancelled) return;

      const imageBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (imageBlob) onPageImage?.(imageBlob, {
        width: viewport.width,
        height: viewport.height,
        pixelWidth: canvas.width,
        pixelHeight: canvas.height,
      });

      const textContent = await pdfPage.getTextContent();
      if (cancelled) return;
      const pageText = textContent.items
        .map((item) => ("str" in item && typeof item.str === "string" ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      onPageTextRef.current?.(pageText);
      onTextItemsRef.current?.(
        textContent.items
          .map((item) => ("str" in item && typeof item.str === "string" ? item.str : ""))
          .filter(Boolean),
      );
      const blocks: TextBlock[] = [];
      for (const item of textContent.items) {
        if (!("str" in item) || typeof item.str !== "string" || !item.str.trim()) continue;
        const style = textContent.styles[item.fontName];
        const [, , , scaleY, x, y] = item.transform;
        const fontSize = Math.max(8, Math.abs(scaleY) * scale);
        const itemBottom = y - (item.height || Math.abs(scaleY));
        const itemRight = x + item.width;
        const points = [
          viewport.convertToViewportPoint(x, itemBottom),
          viewport.convertToViewportPoint(itemRight, itemBottom),
          viewport.convertToViewportPoint(x, y),
          viewport.convertToViewportPoint(itemRight, y),
        ];
        const xs = points.map(([pointX]) => pointX);
        const ys = points.map(([, pointY]) => pointY);
        const left = Math.min(...xs);
        const top = Math.min(...ys);
        const right = Math.max(...xs);
        const bottom = Math.max(...ys);
        const rect = {
          left,
          top,
          width: right - left,
          height: Math.max(bottom - top, fontSize * 1.25),
        };
        const signature = `${item.fontName}:${Math.round(fontSize)}:${style?.fontFamily ?? "sans-serif"}`;
        const previous = blocks[blocks.length - 1];
        const previousSignature = previous ? `${previous.fontFamily}:${Math.round(previous.fontSize)}` : "";
        if (previous && previousSignature === `${style?.fontFamily ?? "sans-serif"}:${Math.round(fontSize)}` && Math.abs(rect.top - (previous.rect.top + previous.rect.height)) < fontSize * 2.5) {
          previous.text = `${previous.text} ${item.str}`.replace(/\s+/g, " ").trim();
          const rightEdge = Math.max(previous.rect.left + previous.rect.width, rect.left + rect.width);
          previous.rect.width = rightEdge - previous.rect.left;
          previous.rect.height = Math.max(previous.rect.height, rect.top + rect.height - previous.rect.top);
        } else {
          blocks.push({
            text: item.str.trim(),
            rect,
            fontSize,
            fontFamily: style?.fontFamily ?? "sans-serif",
            fontWeight: "400",
            fontStyle: "normal",
            color: "currentColor",
          });
        }
      }
      onTextBlocksRef.current?.(blocks);
      textLayerDiv.innerHTML = "";
      textLayerDiv.style.width = `${viewport.width}px`;
      textLayerDiv.style.height = `${viewport.height}px`;
      const textLayer = new pdfjs.TextLayer({
        textContentSource: textContent,
        container: textLayerDiv,
        viewport,
      });
      await textLayer.render();
      if (!cancelled) {
        setStatus("ready");
      }
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

  const pinchRef = useRef<{ distance: number; zoom: number } | null>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    if (!event.ctrlKey) return;
    event.preventDefault();
    onZoomChange(zoom + (event.deltaY < 0 ? 0.1 : -0.1));
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size === 2) {
      const points = [...pointersRef.current.values()];
      pinchRef.current = {
        distance: Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y),
        zoom,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size !== 2 || !pinchRef.current) return;
    event.preventDefault();
    const points = [...pointersRef.current.values()];
    const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
    onZoomChange(pinchRef.current.zoom * (distance / pinchRef.current.distance));
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
  }

  return (
    <div
      ref={scrollerRef}
      dir="ltr"
      className={cn("relative min-h-0 flex-1 overflow-auto bg-bg-subtle", className)}
      style={{ touchAction: "pan-x pan-y", overscrollBehavior: "contain" }}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
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
          <canvas ref={canvasRef} className={cn("pdf-canvas block h-full w-full", pdfDarkMode && "pdf-canvas-dark")} />
          <div ref={textLayerRef} className={cn("textLayer", translatedBlocks?.length && "translated-source-hidden")} />
  {translatedBlocks?.map((block, index) => {
  const blockWidth = Math.max(block.rect.width, 24);
  const originalFontSize = Math.max(block.fontSize, 10);
  const fittedFontSize = Math.max(
    7,
    Math.min(originalFontSize, blockWidth / Math.max(block.translation.length * 0.62, 1)),
  );
  return (
  <div
  key={`${index}-${block.text.slice(0, 12)}`}
  className="translated-block"
              dir="auto"
              aria-label="Translated paragraph"
              style={{
                left: block.rect.left,
                top: block.rect.top,
  width: blockWidth,
  height: Math.max(block.rect.height, fittedFontSize * 1.15),
  minHeight: fittedFontSize * 1.15,
  fontSize: fittedFontSize,
                fontFamily: block.fontFamily,
                fontWeight: block.fontWeight,
                fontStyle: block.fontStyle,
              }}
  >
  {block.translation}
  </div>
  );
  })}
          {status === "loading" ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-paper/80 text-sm text-muted">
              Opening page…
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

