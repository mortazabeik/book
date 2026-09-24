import { i as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { a as RotateCcw, c as Minus, d as FileUp, f as Copy, g as BookOpen, h as Check, i as Settings2, l as LoaderCircle, m as ChevronLeft, o as Plus, p as ChevronRight, r as Sun, s as Moon, t as X, u as Languages } from "../_libs/lucide-react.mjs";
import { a as DialogPortal, i as DialogOverlay, n as DialogClose, o as DialogTitle, r as DialogContent, t as Dialog } from "../_libs/@radix-ui/react-dialog+[...].mjs";
import { n as TSS_SERVER_FUNCTION, r as getServerFnById, t as createServerFn } from "./ssr.mjs";
import { n as TARGET_LANGUAGES, t as SOURCE_LANGUAGES } from "./languages-DUb46b8-.mjs";
import { n as clsx, t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
import { n as SwitchThumb, t as Switch$1 } from "../_libs/@radix-ui/react-switch+[...].mjs";
import { n as create, t as persist } from "../_libs/zustand.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-C7bqFP_a.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
var buttonVariants = cva("inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-[color,background-color,box-shadow,transform,opacity] duration-150 ease-(--ease-out) disabled:pointer-events-none disabled:opacity-40 active:not-disabled:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50", {
	variants: {
		variant: {
			primary: "bg-accent text-accent-fg hover:bg-accent/90",
			ghost: "bg-transparent text-fg hover:bg-fg/6",
			outline: "bg-transparent text-fg shadow-[var(--shadow-border)] hover:bg-fg/5",
			subtle: "bg-elevated text-fg hover:bg-fg/8"
		},
		size: {
			sm: "h-8 px-2.5 text-xs",
			md: "h-10 px-3.5",
			icon: "size-10",
			"icon-sm": "size-8"
		}
	},
	defaultVariants: {
		variant: "primary",
		size: "md"
	}
});
function Button({ className, variant, size, type = "button", ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type,
		className: cn(buttonVariants({
			variant,
			size
		}), className),
		...props
	});
}
function Switch({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch$1, {
		className: cn("peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-border bg-elevated transition-colors duration-150 ease-(--ease-out) data-[state=checked]:border-accent data-[state=checked]:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50", className),
		...props,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SwitchThumb, { className: "pointer-events-none block size-5 translate-x-0.5 rounded-full bg-fg shadow-sm transition-transform duration-150 ease-(--ease-out) data-[state=checked]:translate-x-5 data-[state=checked]:bg-accent-fg" })
	});
}
var DB_NAME = "tarjomaan";
var STORE = "files";
var KEY = "uploaded-pdf";
function openDb() {
	return new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, 1);
		req.onupgradeneeded = () => {
			const db = req.result;
			if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}
async function saveUploadedPdf(file) {
	const buf = await file.arrayBuffer();
	const db = await openDb();
	await new Promise((resolve, reject) => {
		const tx = db.transaction(STORE, "readwrite");
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
		tx.objectStore(STORE).put({
			name: file.name,
			type: file.type,
			data: buf
		}, KEY);
	});
	db.close();
}
async function loadUploadedPdf() {
	const db = await openDb();
	const result = await new Promise((resolve, reject) => {
		const req = db.transaction(STORE, "readonly").objectStore(STORE).get(KEY);
		req.onsuccess = () => {
			const value = req.result;
			resolve(value ?? null);
		};
		req.onerror = () => reject(req.error);
	});
	db.close();
	return result;
}
async function clearUploadedPdf() {
	const db = await openDb();
	await new Promise((resolve, reject) => {
		const tx = db.transaction(STORE, "readwrite");
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
		tx.objectStore(STORE).delete(KEY);
	});
	db.close();
}
var DEFAULT_PDF_URL = "/book.pdf";
var useSettings = create()(persist((set) => ({
	theme: "light",
	sourceLang: "auto",
	targetLang: "fa",
	mode: "split",
	autoTranslate: false,
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
	setPage: (page) => set({ page: Math.max(1, page) }),
	setZoom: (zoom) => set({ zoom: Math.min(2.4, Math.max(.6, zoom)) }),
	setPdfSource: (pdfSource, name) => set({
		pdfSource,
		uploadName: pdfSource === "upload" ? name ?? "" : "",
		page: 1
	}),
	addHistory: (item) => set((state) => ({ history: [{
		...item,
		id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
		ts: Date.now()
	}, ...state.history].slice(0, 40) })),
	clearHistory: () => set({ history: [] })
}), {
	name: "tarjomaan-settings",
	partialize: (state) => ({
		theme: state.theme,
		sourceLang: state.sourceLang,
		targetLang: state.targetLang,
		mode: state.mode,
		autoTranslate: state.autoTranslate,
		page: state.page,
		zoom: state.zoom,
		pdfSource: state.pdfSource,
		uploadName: state.uploadName,
		history: state.history.slice(0, 12)
	})
}));
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
function sanitizeInput(input) {
	const data = input;
	const text = typeof data.text === "string" ? data.text.trim() : "";
	if (!text) throw new Error("متنی برای ترجمه وجود ندارد");
	return {
		text: text.slice(0, 5e3),
		sourceLang: typeof data.sourceLang === "string" ? data.sourceLang : "auto",
		targetLang: typeof data.targetLang === "string" ? data.targetLang : "fa"
	};
}
var translateText = createServerFn({ method: "POST" }).validator(sanitizeInput).handler(createSsrRpc("5a82a487ec2f76fe951e4717718e8de908e24c3c78e7fc11294310fd9edc4635"));
function PdfViewer({ source, page, zoom, replaceText, replaceRects, onNumPages, onSelection, className }) {
	const scrollerRef = (0, import_react.useRef)(null);
	const pageRef = (0, import_react.useRef)(null);
	const canvasRef = (0, import_react.useRef)(null);
	const textLayerRef = (0, import_react.useRef)(null);
	const pdfRef = (0, import_react.useRef)(null);
	const renderTaskRef = (0, import_react.useRef)(null);
	const onNumPagesRef = (0, import_react.useRef)(onNumPages);
	const onSelectionRef = (0, import_react.useRef)(onSelection);
	onNumPagesRef.current = onNumPages;
	onSelectionRef.current = onSelection;
	const [status, setStatus] = (0, import_react.useState)("loading");
	const [error, setError] = (0, import_react.useState)(null);
	const [pageSize, setPageSize] = (0, import_react.useState)({
		width: 396,
		height: 612
	});
	const [viewWidth, setViewWidth] = (0, import_react.useState)(0);
	const [docGen, setDocGen] = (0, import_react.useState)(0);
	(0, import_react.useEffect)(() => {
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
	(0, import_react.useEffect)(() => {
		if (!source) return;
		let cancelled = false;
		let destroy;
		async function loadDoc() {
			setStatus("loading");
			setError(null);
			pdfRef.current = null;
			const pdfjs = await import("../_libs/pdfjs-dist.mjs").then((n) => n.t);
			pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
			const payload = typeof source === "string" ? { url: source } : { data: new Uint8Array(source.slice(0)) };
			const task = pdfjs.getDocument({
				...payload,
				cMapUrl: "/cmaps/",
				cMapPacked: true,
				standardFontDataUrl: "/standard_fonts/"
			});
			destroy = () => {
				task.destroy();
			};
			try {
				const pdf = await task.promise;
				if (cancelled) {
					pdf.destroy();
					return;
				}
				pdfRef.current = pdf;
				onNumPagesRef.current(pdf.numPages);
				setDocGen((n) => n + 1);
			} catch {
				if (cancelled) return;
				setStatus("error");
				setError("نتوانستیم این فایل را باز کنیم");
			}
		}
		loadDoc();
		return () => {
			cancelled = true;
			destroy?.();
			pdfRef.current = null;
		};
	}, [source]);
	(0, import_react.useEffect)(() => {
		const doc = pdfRef.current;
		if (!doc || viewWidth < 80) return;
		let cancelled = false;
		async function renderPage() {
			setStatus("loading");
			const pdfjs = await import("../_libs/pdfjs-dist.mjs").then((n) => n.t);
			const pageNum = Math.min(Math.max(1, page), doc.numPages);
			let pdfPage;
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
			const scale = Math.max(260, viewWidth - 40) / pdfPage.getViewport({ scale: 1 }).width * zoom;
			const viewport = pdfPage.getViewport({ scale });
			setPageSize({
				width: viewport.width,
				height: viewport.height
			});
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
			const transform = outputScale !== 1 ? [
				outputScale,
				0,
				0,
				outputScale,
				0,
				0
			] : void 0;
			const renderTask = pdfPage.render({
				canvas,
				canvasContext: ctx,
				viewport,
				transform
			});
			renderTaskRef.current = renderTask;
			try {
				await renderTask.promise;
			} catch (err) {
				if ((err instanceof Error ? err.name : "") === "RenderingCancelledException" || cancelled) return;
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
			await new pdfjs.TextLayer({
				textContentSource: textContent,
				container: textLayerDiv,
				viewport
			}).render();
			if (!cancelled) setStatus("ready");
		}
		renderPage();
		return () => {
			cancelled = true;
			renderTaskRef.current?.cancel();
		};
	}, [
		docGen,
		page,
		zoom,
		viewWidth
	]);
	function handleMouseUp(event) {
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
		const rects = [...range.getClientRects()].filter((rect) => rect.width > 1 && rect.height > 1).map((rect) => ({
			left: rect.left - pageBox.left,
			top: rect.top - pageBox.top,
			width: rect.width,
			height: rect.height
		}));
		onSelectionRef.current({
			text,
			mouseX: event.clientX,
			mouseY: event.clientY,
			rects
		});
	}
	const box = boundingBox(replaceRects);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		ref: scrollerRef,
		dir: "ltr",
		className: cn("relative min-h-0 flex-1 overflow-auto bg-bg-subtle", className),
		onMouseUp: handleMouseUp,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex min-h-full justify-center p-4 sm:p-6",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				ref: pageRef,
				className: "pdf-page relative bg-paper shadow-[var(--shadow-page)]",
				style: {
					width: pageSize.width,
					height: pageSize.height,
					["--scale-round-x"]: "1px",
					["--scale-round-y"]: "1px"
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
						ref: canvasRef,
						className: "pdf-canvas block h-full w-full"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						ref: textLayerRef,
						className: "textLayer"
					}),
					replaceText && box ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						"data-translation-ui": "",
						className: "replace-overlay absolute z-20 overflow-auto rounded-sm bg-paper px-2 py-1.5 text-fg shadow-[var(--shadow-border)]",
						style: {
							left: box.left,
							top: box.top,
							minWidth: box.width,
							minHeight: box.height,
							maxWidth: Math.max(box.width, pageSize.width - box.left - 12)
						},
						dir: "auto",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-pretty text-sm leading-relaxed",
							children: replaceText
						})
					}) : null,
					status === "loading" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "absolute inset-0 z-10 flex items-center justify-center bg-paper/80 text-sm text-muted",
						children: "در حال گشودن صفحه…"
					}) : null,
					status === "error" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "absolute inset-0 z-10 flex items-center justify-center bg-paper p-6 text-center text-sm text-muted",
						children: error
					}) : null
				]
			})
		})
	});
}
function boundingBox(rects) {
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
	return {
		left,
		top,
		width: right - left,
		height: bottom - top
	};
}
function ReaderApp() {
	const [mounted, setMounted] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		const finish = () => setMounted(true);
		const unsub = useSettings.persist.onFinishHydration(finish);
		if (useSettings.persist.hasHydrated()) finish();
		return unsub;
	}, []);
	if (!mounted) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex h-dvh items-center justify-center bg-bg text-sm text-muted",
		children: "در حال آماده‌سازی خواننده…"
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReaderShell, {});
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
	const [numPages, setNumPages] = (0, import_react.useState)(1);
	const [pdfData, setPdfData] = (0, import_react.useState)(DEFAULT_PDF_URL);
	const [settingsOpen, setSettingsOpen] = (0, import_react.useState)(false);
	const [pending, setPending] = (0, import_react.useState)(null);
	const [showBtn, setShowBtn] = (0, import_react.useState)(false);
	const [btnPos, setBtnPos] = (0, import_react.useState)({
		x: 0,
		y: 0
	});
	const [loading, setLoading] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	const [current, setCurrent] = (0, import_react.useState)(null);
	const [replace, setReplace] = (0, import_react.useState)(null);
	const [floatCard, setFloatCard] = (0, import_react.useState)(null);
	const fileRef = (0, import_react.useRef)(null);
	const translatingFor = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		document.documentElement.classList.toggle("dark", theme === "dark");
		document.documentElement.lang = "fa";
		document.documentElement.dir = "rtl";
	}, [theme]);
	(0, import_react.useEffect)(() => {
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
		restore();
		return () => {
			alive = false;
		};
	}, [pdfSource, setPdfSource]);
	const dismissTransient = (0, import_react.useCallback)(() => {
		setShowBtn(false);
		setReplace(null);
		setFloatCard(null);
		setPending(null);
	}, []);
	(0, import_react.useEffect)(() => {
		function onPointerDown(event) {
			const target = event.target;
			if (!target) return;
			if (target.closest("[data-translation-ui]")) return;
			if (target.closest("[data-settings-root]")) return;
			dismissTransient();
		}
		document.addEventListener("pointerdown", onPointerDown);
		return () => document.removeEventListener("pointerdown", onPointerDown);
	}, [dismissTransient]);
	(0, import_react.useEffect)(() => {
		function onKey(event) {
			const tag = event.target?.tagName;
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
	}, [
		dismissTransient,
		numPages,
		page,
		setPage
	]);
	(0, import_react.useEffect)(() => {
		dismissTransient();
	}, [mode, dismissTransient]);
	const runTranslate = (0, import_react.useCallback)(async (payload) => {
		const key = `${sourceLang}:${targetLang}:${payload.text}`;
		if (translatingFor.current === key) return;
		translatingFor.current = key;
		setLoading(true);
		setError(null);
		setShowBtn(false);
		try {
			const res = await translateText({ data: {
				text: payload.text,
				sourceLang,
				targetLang
			} });
			if (!res.ok) {
				setError(res.error);
				return;
			}
			setCurrent({
				source: payload.text,
				translation: res.text
			});
			addHistory({
				source: payload.text,
				translation: res.text,
				sourceLang,
				targetLang
			});
			if (mode === "replace") {
				setReplace({
					text: res.text,
					rects: payload.rects
				});
				setFloatCard(null);
			} else if (mode === "float") {
				setFloatCard({
					x: payload.mouseX,
					y: payload.mouseY,
					text: res.text
				});
				setReplace(null);
			} else {
				setReplace(null);
				setFloatCard(null);
			}
			window.getSelection()?.removeAllRanges();
		} catch {
			setError("خطا در ترجمه. دوباره تلاش کنید.");
		} finally {
			setLoading(false);
			translatingFor.current = null;
		}
	}, [
		addHistory,
		mode,
		sourceLang,
		targetLang
	]);
	const handleSelection = (0, import_react.useCallback)((payload) => {
		if (!payload) {
			setShowBtn(false);
			return;
		}
		setReplace(null);
		setFloatCard(null);
		setPending(payload);
		setError(null);
		if (autoTranslate) {
			runTranslate(payload);
			return;
		}
		const pad = 12;
		const x = Math.min(window.innerWidth - 140, payload.mouseX + pad);
		const y = Math.min(window.innerHeight - 56, payload.mouseY + pad);
		setBtnPos({
			x: Math.max(8, x),
			y: Math.max(8, y)
		});
		setShowBtn(true);
	}, [autoTranslate, runTranslate]);
	async function onPickFile(file) {
		if (!file) return;
		await saveUploadedPdf(file);
		const buffer = await file.arrayBuffer();
		setPdfSource("upload", file.name);
		setPdfData(buffer);
		setCurrent(null);
		dismissTransient();
	}
	async function restoreDefaultPdf() {
		await clearUploadedPdf();
		setPdfSource("default");
		setPdfData(DEFAULT_PDF_URL);
		setCurrent(null);
		dismissTransient();
	}
	const split = mode === "split";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-dvh flex-col bg-bg text-fg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex shrink-0 items-center gap-2 border-b border-border bg-elevated px-2 py-1.5 sm:px-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex min-w-0 items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "flex size-9 items-center justify-center rounded-md bg-accent/12 text-accent",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BookOpen, {
								className: "size-4",
								strokeWidth: 1.75
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-0",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "truncate text-sm font-medium leading-tight",
								children: "ترجمان"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "truncate text-[11px] text-subtle",
								children: pdfSource === "upload" && uploadName ? uploadName : "book.pdf"
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						dir: "ltr",
						className: "mx-auto flex items-center gap-1 rounded-lg bg-bg px-1 py-0.5 shadow-[var(--shadow-border)]",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "ghost",
								size: "icon-sm",
								"aria-label": "صفحه قبل",
								disabled: !(page > 1),
								onClick: () => {
									setPage(page - 1);
									dismissTransient();
								},
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronLeft, { className: "size-4" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "min-w-16 px-1 text-center text-xs tabular-nums text-muted",
								children: [
									page,
									" / ",
									numPages
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "ghost",
								size: "icon-sm",
								"aria-label": "صفحه بعد",
								disabled: !(page < numPages),
								onClick: () => {
									setPage(page + 1);
									dismissTransient();
								},
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "size-4" })
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "ms-auto flex items-center gap-0.5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "ghost",
								size: "icon-sm",
								"aria-label": "کوچک‌نمایی",
								className: "hidden sm:inline-flex",
								onClick: () => setZoom(zoom - .1),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Minus, { className: "size-4" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "hidden min-w-10 text-center text-[11px] tabular-nums text-muted sm:inline",
								children: [Math.round(zoom * 100), "٪"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "ghost",
								size: "icon-sm",
								"aria-label": "بزرگ‌نمایی",
								className: "hidden sm:inline-flex",
								onClick: () => setZoom(zoom + .1),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-4" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "ghost",
								size: "icon",
								"aria-label": theme === "dark" ? "حالت روشن" : "حالت تاریک",
								onClick: () => setTheme(theme === "dark" ? "light" : "dark"),
								children: theme === "dark" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sun, { className: "size-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Moon, { className: "size-4" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "ghost",
								size: "icon",
								"aria-label": "تنظیمات",
								onClick: () => setSettingsOpen(true),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Settings2, { className: "size-4" })
							})
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: cn("flex min-h-0 flex-1", split ? "flex-col md:grid md:grid-cols-10" : "flex-col"),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PdfViewer, {
					source: pdfData,
					page: Math.min(page, numPages),
					zoom,
					replaceText: replace?.text ?? null,
					replaceRects: replace?.rects ?? null,
					onNumPages: (n) => {
						setNumPages(n);
						if (page > n) setPage(n);
					},
					onSelection: handleSelection,
					className: split ? "md:col-span-7 min-h-0 max-md:min-h-0 max-md:flex-[1.2]" : ""
				}), split ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TranslatePanel, {
					current,
					loading,
					error,
					history,
					className: "max-md:max-h-[38%] md:col-span-3"
				}) : null]
			}),
			showBtn && pending ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				"data-translation-ui": "",
				className: "fixed z-40 flex h-10 items-center gap-1.5 rounded-full bg-accent px-3.5 text-sm font-medium text-accent-fg shadow-[var(--shadow-float)]",
				style: {
					left: btnPos.x,
					top: btnPos.y
				},
				onClick: () => void runTranslate(pending),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Languages, { className: "size-3.5" }), "ترجمه"]
			}) : null,
			loading && mode !== "split" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				"data-translation-ui": "",
				className: "fixed z-40 flex items-center gap-2 rounded-full bg-elevated px-3 py-2 text-xs text-muted shadow-[var(--shadow-float)]",
				style: {
					left: Math.min(window.innerWidth - 160, (pending?.mouseX ?? 24) + 8),
					top: Math.min(window.innerHeight - 48, (pending?.mouseY ?? 24) + 8)
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "size-3.5 animate-spin" }), "در حال ترجمه…"]
			}) : null,
			floatCard ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
				"data-translation-ui": "",
				className: "fixed z-40 max-w-80 rounded-xl bg-elevated p-3 text-fg shadow-[var(--shadow-float)]",
				style: {
					left: clamp(floatCard.x + 12, 8, window.innerWidth - 328),
					top: clamp(floatCard.y + 12, 8, window.innerHeight - 180)
				},
				dir: "auto",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mb-2 flex items-center justify-between gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[11px] font-medium text-muted",
						children: "ترجمه"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "flex size-8 items-center justify-center rounded-md text-muted hover:bg-fg/6 hover:text-fg",
						"aria-label": "بستن",
						onClick: dismissTransient,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-3.5" })
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-pretty text-sm leading-relaxed",
					children: floatCard.text
				})]
			}) : null,
			error && mode !== "split" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				"data-translation-ui": "",
				className: "fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-lg bg-elevated px-3 py-2 text-xs text-muted shadow-[var(--shadow-float)]",
				children: error
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				ref: fileRef,
				type: "file",
				accept: "application/pdf,.pdf",
				className: "sr-only",
				onChange: (event) => {
					const file = event.target.files?.[0];
					onPickFile(file);
					event.target.value = "";
				}
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SettingsDialog, {
				open: settingsOpen,
				onOpenChange: setSettingsOpen,
				onOpenFile: () => fileRef.current?.click(),
				onRestorePdf: () => void restoreDefaultPdf()
			})
		]
	});
}
function TranslatePanel({ current, loading, error, history, className }) {
	const [copied, setCopied] = (0, import_react.useState)(false);
	const visible = current ?? (history[0] ? {
		source: history[0].source,
		translation: history[0].translation
	} : null);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
		className: cn("flex min-h-0 flex-col border-t border-border bg-elevated md:border-t-0 md:border-s", className),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between gap-2 border-b border-border px-4 py-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm font-medium",
				children: "ترجمه"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-[11px] text-subtle",
				children: "متن انتخاب‌شده در کتاب"
			})] }), visible ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				variant: "ghost",
				size: "icon-sm",
				"aria-label": "رونوشت",
				onClick: async () => {
					await navigator.clipboard.writeText(visible.translation);
					setCopied(true);
					window.setTimeout(() => setCopied(false), 1200);
				},
				children: copied ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "size-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { className: "size-4" })
			}) : null]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "min-h-0 flex-1 overflow-auto p-4",
			children: loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2 text-sm text-muted",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "size-4 animate-spin" }), "در حال ترجمه…"]
			}) : error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: error
			}) : visible ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mb-1.5 text-[11px] font-medium text-subtle",
					children: "اصل"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					dir: "auto",
					className: "text-pretty text-sm leading-relaxed text-muted",
					children: visible.source
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mb-1.5 text-[11px] font-medium text-subtle",
					children: "ترجمه"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					dir: "auto",
					className: "text-pretty text-base leading-relaxed",
					children: visible.translation
				})] })]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm leading-relaxed text-muted",
				children: "متنی را در صفحه کتاب انتخاب کنید. دکمه ترجمه کنار نشانگر ظاهر می‌شود."
			})
		})]
	});
}
function SettingsDialog({ open, onOpenChange, onOpenFile, onRestorePdf }) {
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
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
		open,
		onOpenChange,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogPortal, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogOverlay, { className: "fixed inset-0 z-50 bg-bg/70" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
			"data-settings-root": "",
			className: "fixed start-0 top-0 z-50 flex h-dvh w-full max-w-md flex-col bg-elevated shadow-[var(--shadow-float)] outline-none",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between border-b border-border px-4 py-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, {
					className: "text-sm font-medium",
					children: "تنظیمات"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogClose, {
					asChild: true,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "ghost",
						size: "icon-sm",
						"aria-label": "بستن",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-4" })
					})
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-h-0 flex-1 space-y-6 overflow-auto p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "space-y-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
								className: "text-xs font-medium text-muted",
								children: "زبان"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FieldSelect, {
								label: "زبان مبدأ",
								value: sourceLang,
								onChange: setSourceLang,
								options: SOURCE_LANGUAGES
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FieldSelect, {
								label: "زبان مقصد",
								value: targetLang,
								onChange: setTargetLang,
								options: TARGET_LANGUAGES
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "space-y-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "text-xs font-medium text-muted",
							children: "حالت ترجمه"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid gap-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModeCard, {
									active: mode === "split",
									title: "تقسیم ۷۰ / ۳۰",
									body: "کتاب در سمت بزرگ‌تر، ترجمه در پنل کناری.",
									onClick: () => setMode("split")
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModeCard, {
									active: mode === "replace",
									title: "جایگزینی",
									body: "متن ترجمه‌شده روی همان سطر می‌نشیند تا وقتی جای دیگری کلیک کنید.",
									onClick: () => setMode("replace")
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModeCard, {
									active: mode === "float",
									title: "شناور",
									body: "ترجمه در پنجره‌ای کوچک کنار انتخاب ظاهر می‌شود.",
									onClick: () => setMode("float")
								})
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "space-y-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between gap-3 rounded-xl bg-bg px-3 py-3 shadow-[var(--shadow-border)]",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm font-medium",
									children: "ترجمه خودکار"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-[11px] text-subtle",
									children: "پس از تمام شدن انتخاب، بدون دکمه ترجمه شود."
								})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
									checked: autoTranslate,
									onCheckedChange: setAutoTranslate,
									"aria-label": "ترجمه خودکار"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between gap-3 rounded-xl bg-bg px-3 py-3 shadow-[var(--shadow-border)]",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm font-medium",
									children: "ظاهر"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-[11px] text-subtle",
									children: "روشن برای کاغذ، تاریک برای شب"
								})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex rounded-lg bg-elevated p-0.5 shadow-[var(--shadow-border)]",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ThemeChip, {
										active: theme === "light",
										onClick: () => setTheme("light"),
										icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sun, { className: "size-3.5" }),
										label: "روشن"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ThemeChip, {
										active: theme === "dark",
										onClick: () => setTheme("dark"),
										icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Moon, { className: "size-3.5" }),
										label: "تاریک"
									})]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between gap-3 rounded-xl bg-bg px-3 py-3 shadow-[var(--shadow-border)] sm:hidden",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm font-medium",
									children: "اندازه صفحه"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-1",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											variant: "ghost",
											size: "icon-sm",
											onClick: () => setZoom(zoom - .1),
											"aria-label": "کوچک‌نمایی",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Minus, { className: "size-4" })
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "min-w-10 text-center text-xs tabular-nums text-muted",
											children: [Math.round(zoom * 100), "٪"]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											variant: "ghost",
											size: "icon-sm",
											onClick: () => setZoom(zoom + .1),
											"aria-label": "بزرگ‌نمایی",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-4" })
										})
									]
								})]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "space-y-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
								className: "text-xs font-medium text-muted",
								children: "فایل"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								variant: "outline",
								className: "w-full",
								onClick: onOpenFile,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileUp, { className: "size-4" }), "باز کردن PDF دیگر"]
							}),
							pdfSource === "upload" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								variant: "ghost",
								className: "w-full",
								onClick: onRestorePdf,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, { className: "size-4" }), "بازگشت به book.pdf"]
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "px-1 text-[11px] text-subtle",
								children: "فایل پیش‌فرض book.pdf از حافظه همین برنامه خوانده می‌شود."
							})
						]
					})
				]
			})]
		})] })
	});
}
function FieldSelect({ label, value, onChange, options }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "block",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "mb-1.5 block text-[11px] text-subtle",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
			value,
			onChange: (event) => onChange(event.target.value),
			className: "h-11 w-full rounded-lg bg-bg px-3 text-sm text-fg shadow-[var(--shadow-border)] outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
			children: options.map((option) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
				value: option.code,
				children: option.label
			}, option.code))
		})]
	});
}
function ModeCard({ active, title, body, onClick }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		onClick,
		className: cn("rounded-xl bg-bg px-3 py-3 text-start shadow-[var(--shadow-border)] transition-colors duration-150", active && "ring-2 ring-accent/50"),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-sm font-medium",
			children: title
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-0.5 text-[11px] leading-relaxed text-subtle",
			children: body
		})]
	});
}
function ThemeChip({ active, onClick, icon, label }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		onClick,
		className: cn("flex h-8 items-center gap-1 rounded-md px-2.5 text-xs transition-colors duration-150", active ? "bg-accent text-accent-fg" : "text-muted hover:text-fg"),
		children: [icon, label]
	});
}
function clamp(value, min, max) {
	return Math.min(max, Math.max(min, value));
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReaderApp, {});
}
//#endregion
export { Home as component };
