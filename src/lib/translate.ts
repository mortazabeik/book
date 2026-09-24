import { createServerFn } from "@tanstack/react-start";
import { languageLabel } from "./languages";

export type TranslateResult =
  | { ok: true; text: string; detected?: string }
  | { ok: false; error: string };

type TranslateInput = {
  text: string;
  sourceLang: string;
  targetLang: string;
};

type ImageTranslateInput = {
  image: string;
  sourceLang: string;
  targetLang: string;
};

function sanitizeImageInput(input: unknown): ImageTranslateInput {
  const data = input as Partial<ImageTranslateInput>;
  const image = typeof data.image === "string" ? data.image : "";
  if (!image.startsWith("data:image/")) throw new Error("تصویر صفحه معتبر نیست");
  return {
    image: image.slice(0, 8_000_000),
    sourceLang: typeof data.sourceLang === "string" ? data.sourceLang : "auto",
    targetLang: typeof data.targetLang === "string" ? data.targetLang : "fa",
  };
}

async function extractTextFromImage(input: ImageTranslateInput): Promise<string | null> {
  const form = new FormData();
  form.append("base64Image", input.image);
  form.append("language", input.sourceLang === "auto" ? "eng" : input.sourceLang);
  form.append("isOverlayRequired", "false");
  form.append("OCREngine", "2");
  const response = await fetch("https://api.ocr.space/parse/image", {
    method: "POST",
    headers: { apikey: "helloworld" },
    body: form,
  });
  if (!response.ok) return null;
  const body = (await response.json()) as {
    IsErroredOnProcessing?: boolean;
    ParsedResults?: { ParsedText?: string }[];
  };
  if (body.IsErroredOnProcessing) return null;
  const text = body.ParsedResults?.map((result) => result.ParsedText ?? "")
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text || null;
}

function sanitizeInput(input: unknown): TranslateInput {
  const data = input as Partial<TranslateInput>;
  const text = typeof data.text === "string" ? data.text.trim() : "";
  if (!text) throw new Error("متنی برای ترجمه وجود ندارد");
  return {
    text: text.slice(0, 5000),
    sourceLang: typeof data.sourceLang === "string" ? data.sourceLang : "auto",
    targetLang: typeof data.targetLang === "string" ? data.targetLang : "fa",
  };
}

async function translateWithGrok(input: TranslateInput): Promise<string | null> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return null;

  const source =
    input.sourceLang === "auto"
      ? "the detected source language"
      : languageLabel(input.sourceLang);
  const target = languageLabel(input.targetLang);

  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "grok-4.5",
      temperature: 0.15,
      max_tokens: Math.min(1800, Math.max(256, input.text.length * 2)),
      messages: [
        {
          role: "system",
          content:
            "You are a precise literary translator. Return only the translation. Preserve paragraph breaks and punctuation. Do not add quotes, labels, or commentary. If the text is already in the target language, return it unchanged.",
        },
        {
          role: "user",
          content: `Translate from ${source} to ${target}:\n\n${input.text}`,
        },
      ],
    }),
  });

  if (!res.ok) return null;
  const body = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = body.choices?.[0]?.message?.content?.trim();
  return text || null;
}

async function translateWithGoogle(
  input: TranslateInput,
): Promise<{ text: string; detected?: string } | null> {
  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", input.sourceLang === "auto" ? "auto" : input.sourceLang);
  url.searchParams.set("tl", input.targetLang);
  url.searchParams.set("dt", "t");
  url.searchParams.set("q", input.text);

  const res = await fetch(url.toString());
  if (!res.ok) return null;
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data) || !Array.isArray(data[0])) return null;
  const chunks = data[0] as Array<unknown>;
  const text = chunks
    .map((chunk) => (Array.isArray(chunk) && typeof chunk[0] === "string" ? chunk[0] : ""))
    .join("")
    .trim();
  if (!text) return null;
  const detected = typeof data[2] === "string" ? data[2] : undefined;
  return { text, detected };
}

export const translateImage = createServerFn({ method: "POST" })
  .validator(sanitizeImageInput)
  .handler(async ({ data }): Promise<TranslateResult> => {
    try {
      const text = await extractTextFromImage(data);
      if (!text) return { ok: false, error: "متنی از تصویر صفحه خوانده نشد" };
      const translated = await translateWithGoogle({
        text,
        sourceLang: data.sourceLang,
        targetLang: data.targetLang,
      });
      if (translated) return { ok: true, text: translated.text, detected: translated.detected };
      const grok = await translateWithGrok({
        text,
        sourceLang: data.sourceLang,
        targetLang: data.targetLang,
      });
      if (grok) return { ok: true, text: grok };
      return { ok: false, error: "ترجمه در حال حاضر در دسترس نیست" };
    } catch {
      return { ok: false, error: "خطا در خواندن یا ترجمه تصویر صفحه" };
    }
  });

export const translateText = createServerFn({ method: "POST" })
  .validator(sanitizeInput)
  .handler(async ({ data }): Promise<TranslateResult> => {
    try {
      const grok = await translateWithGrok(data);
      if (grok) return { ok: true, text: grok };

      const google = await translateWithGoogle(data);
      if (google) return { ok: true, text: google.text, detected: google.detected };

      return { ok: false, error: "ترجمه در حال حاضر در دسترس نیست" };
    } catch {
      return { ok: false, error: "خطا در ترجمه. دوباره تلاش کنید." };
    }
  });
