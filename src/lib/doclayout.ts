import * as ort from "onnxruntime-web";

export type LayoutRegion = {
  label: string;
  score: number;
  left: number;
  top: number;
  right: number;
  bottom: number;
};

const labels = [
  "paragraph_title", "image", "text", "number", "abstract", "content", "figure_title", "formula",
  "table", "table_title", "reference", "doc_title", "footnote", "header", "algorithm", "footer",
  "seal", "chart_title", "chart", "formula_number", "header_image", "footer_image", "aside_text",
];

let sessionPromise: Promise<ort.InferenceSession> | null = null;

async function getSession() {
  sessionPromise ??= ort.InferenceSession.create("/models/doclayout/PP-DocLayout-M.onnx", {
    executionProviders: ["wasm"],
    graphOptimizationLevel: "all",
  });
  return sessionPromise;
}

export async function detectDocumentRegions(blob: Blob): Promise<LayoutRegion[]> {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 640;
  const context = canvas.getContext("2d");
  if (!context) return [];
  context.drawImage(bitmap, 0, 0, 640, 640);
  bitmap.close();
  const pixels = context.getImageData(0, 0, 640, 640).data;
  const input = new Float32Array(3 * 640 * 640);
  for (let i = 0; i < 640 * 640; i += 1) {
    input[i] = (pixels[i * 4] / 255 - 0.485) / 0.229;
    input[640 * 640 + i] = (pixels[i * 4 + 1] / 255 - 0.456) / 0.224;
    input[2 * 640 * 640 + i] = (pixels[i * 4 + 2] / 255 - 0.406) / 0.225;
  }
  const session = await getSession();
  const inputName = session.inputNames[0];
  const output = await session.run({ [inputName]: new ort.Tensor("float32", input, [1, 3, 640, 640]) });
  const tensor = output[session.outputNames[0]] as ort.Tensor;
  const values = Array.from(tensor.data as Iterable<number>);
  const stride = values.length % 6 === 0 ? 6 : 7;
  const regions: LayoutRegion[] = [];
  for (let i = 0; i + stride <= values.length; i += stride) {
    const offset = stride === 7 ? 1 : 0;
    const labelIndex = Math.round(values[i + offset]);
    const score = values[i + offset + 1];
    if (score < 0.35) continue;
    const [left, top, right, bottom] = values.slice(i + offset + 2, i + offset + 6);
    if (right <= left || bottom <= top) continue;
    regions.push({ label: labels[labelIndex] ?? "text", score, left, top, right, bottom });
  }
  return regions;
}
