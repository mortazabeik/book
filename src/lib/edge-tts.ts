import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const requestSchema = z.object({
  text: z.string().trim().min(1).max(12000),
  language: z.string().trim().min(2).max(16),
});

const voices: Record<string, string> = {
  fa: "fa-IR-FaridNeural",
  en: "en-US-AriaNeural",
  de: "de-DE-KatjaNeural",
  fr: "fr-FR-DeniseNeural",
  es: "es-ES-ElviraNeural",
  it: "it-IT-ElsaNeural",
  pt: "pt-BR-FranciscaNeural",
  ru: "ru-RU-SvetlanaNeural",
  ar: "ar-SA-ZariyahNeural",
  zh: "zh-CN-XiaoxiaoNeural",
  ja: "ja-JP-NanamiNeural",
  ko: "ko-KR-SunHiNeural",
};

function getVoice(language: string) {
  const key = language.toLowerCase().split(/[-_]/)[0];
  return voices[key];
}

export const detectSpeechLanguage = createServerFn({ method: "POST" })
  .inputValidator(z.object({ text: z.string().trim().min(1).max(12000) }))
  .handler(async ({ data }) => {
    const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&dt=ld&q=${encodeURIComponent(data.text)}`);
    if (!response.ok) return { ok: false as const, error: "تشخیص زبان انجام نشد." };
    const payload = await response.json() as unknown[];
    const detected = typeof payload[2] === "string" ? payload[2] : null;
    return detected ? { ok: true as const, language: detected } : { ok: false as const, error: "زبان متن تشخیص داده نشد." };
  });

export const synthesizeSpeech = createServerFn({ method: "POST" })
  .inputValidator(requestSchema)
  .handler(async ({ data }) => {
    const voice = getVoice(data.language);
    if (!voice) return { ok: false as const, error: `زبان ${data.language} برای خواندن صوتی پشتیبانی نمی‌شود.` };

    const { EdgeTTS } = await import("edge-tts-universal");
    const result = await new EdgeTTS(data.text, voice).synthesize();
    const audio = Buffer.from(await result.audio.arrayBuffer()).toString("base64");
    return { ok: true as const, audio: `data:audio/mpeg;base64,${audio}` };
  });
