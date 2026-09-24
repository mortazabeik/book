import { n as TSS_SERVER_FUNCTION, t as createServerFn } from "./ssr.mjs";
import { r as languageLabel } from "./languages-DUb46b8-.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/translate-6OidlTI2.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
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
async function translateWithGrok(input) {
	const apiKey = process.env.XAI_API_KEY;
	if (!apiKey) return null;
	const source = input.sourceLang === "auto" ? "the detected source language" : languageLabel(input.sourceLang);
	const target = languageLabel(input.targetLang);
	const res = await fetch("https://api.x.ai/v1/chat/completions", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`
		},
		body: JSON.stringify({
			model: "grok-4.5",
			temperature: .15,
			max_tokens: Math.min(1800, Math.max(256, input.text.length * 2)),
			messages: [{
				role: "system",
				content: "You are a precise literary translator. Return only the translation. Preserve paragraph breaks and punctuation. Do not add quotes, labels, or commentary. If the text is already in the target language, return it unchanged."
			}, {
				role: "user",
				content: `Translate from ${source} to ${target}:\n\n${input.text}`
			}]
		})
	});
	if (!res.ok) return null;
	return (await res.json()).choices?.[0]?.message?.content?.trim() || null;
}
async function translateWithGoogle(input) {
	const url = new URL("https://translate.googleapis.com/translate_a/single");
	url.searchParams.set("client", "gtx");
	url.searchParams.set("sl", input.sourceLang === "auto" ? "auto" : input.sourceLang);
	url.searchParams.set("tl", input.targetLang);
	url.searchParams.set("dt", "t");
	url.searchParams.set("q", input.text);
	const res = await fetch(url.toString());
	if (!res.ok) return null;
	const data = await res.json();
	if (!Array.isArray(data) || !Array.isArray(data[0])) return null;
	const text = data[0].map((chunk) => Array.isArray(chunk) && typeof chunk[0] === "string" ? chunk[0] : "").join("").trim();
	if (!text) return null;
	return {
		text,
		detected: typeof data[2] === "string" ? data[2] : void 0
	};
}
var translateText_createServerFn_handler = createServerRpc({
	id: "5a82a487ec2f76fe951e4717718e8de908e24c3c78e7fc11294310fd9edc4635",
	name: "translateText",
	filename: "src/lib/translate.ts"
}, (opts) => translateText.__executeServer(opts));
var translateText = createServerFn({ method: "POST" }).validator(sanitizeInput).handler(translateText_createServerFn_handler, async ({ data }) => {
	try {
		const grok = await translateWithGrok(data);
		if (grok) return {
			ok: true,
			text: grok
		};
		const google = await translateWithGoogle(data);
		if (google) return {
			ok: true,
			text: google.text,
			detected: google.detected
		};
		return {
			ok: false,
			error: "ترجمه در حال حاضر در دسترس نیست"
		};
	} catch {
		return {
			ok: false,
			error: "خطا در ترجمه. دوباره تلاش کنید."
		};
	}
});
//#endregion
export { translateText_createServerFn_handler };
