export type Language = {
  code: string;
  label: string;
};

export const SOURCE_LANGUAGES: Language[] = [
  { code: "auto", label: "تشخیص خودکار" },
  { code: "en", label: "انگلیسی" },
  { code: "fa", label: "فارسی" },
  { code: "ar", label: "عربی" },
  { code: "tr", label: "ترکی" },
  { code: "fr", label: "فرانسوی" },
  { code: "de", label: "آلمانی" },
  { code: "es", label: "اسپانیایی" },
  { code: "ru", label: "روسی" },
  { code: "zh", label: "چینی" },
  { code: "ja", label: "ژاپنی" },
  { code: "ko", label: "کره‌ای" },
  { code: "it", label: "ایتالیایی" },
  { code: "pt", label: "پرتغالی" },
  { code: "hi", label: "هندی" },
  { code: "ur", label: "اردو" },
  { code: "ku", label: "کردی" },
  { code: "az", label: "آذربایجانی" },
  { code: "nl", label: "هلندی" },
  { code: "pl", label: "لهستانی" },
];

export const TARGET_LANGUAGES: Language[] = SOURCE_LANGUAGES.filter(
  (lang) => lang.code !== "auto",
);

export function languageLabel(code: string): string {
  return SOURCE_LANGUAGES.find((lang) => lang.code === code)?.label ?? code;
}
