import { useMemo, useState } from "react";
import { useTextHistory } from "@/features/editor/useTextHistory";
import { useChromeAI } from "@/features/ai/useChromeAI";

// Detector types matching page usage
type LanguageDetector = {
  detect: (input: string) => Promise<Array<{ detectedLanguage: string; confidence: number }>>;
  ready?: Promise<void>;
};

type DetectorSurface = {
  canDetect?: () => Promise<string>;
  createDetector?: (options?: { monitor?: (m: EventTarget) => void }) => Promise<LanguageDetector>;
  availability?: () => Promise<string>;
  create?: (options?: { monitor?: (m: EventTarget) => void }) => Promise<LanguageDetector>;
};

function getLanguageDetectorProvider(): DetectorSurface | null {
  const g = globalThis as { Translation?: DetectorSurface; LanguageDetector?: DetectorSurface };
  if (g.Translation?.canDetect && g.Translation.createDetector) return g.Translation;
  if (g.LanguageDetector?.availability && g.LanguageDetector.create) return g.LanguageDetector;
  if (typeof window !== "undefined") {
    const w = window as unknown as { ai?: { translation?: DetectorSurface; languageDetector?: DetectorSurface } };
    if (w.ai?.translation?.canDetect && w.ai.translation.createDetector) return w.ai.translation;
    if (w.ai?.languageDetector?.availability && w.ai.languageDetector.create) return w.ai.languageDetector;
  }
  return null;
}

function normalizeAvailability(s: string | null): "readily" | "after-download" | "no" | null {
  if (!s) return null;
  if (s === "available" || s === "readily") return "readily";
  if (s === "unavailable" || s === "no") return "no";
  if (s === "after-download") return "after-download";
  return null;
}

async function detectLanguageViaProvider(input: string): Promise<string | null> {
  const provider = getLanguageDetectorProvider();
  if (!provider) return null;

  try {
    let status: string | null = null;
    if (provider.canDetect) status = await provider.canDetect();
    else if (provider.availability) status = await provider.availability();
    const statusNorm = normalizeAvailability(status);

    let detector: LanguageDetector | null = null;
    const options = {
      monitor: (m: EventTarget) => {
        m.addEventListener?.("downloadprogress", (e: Event & { loaded?: number }) => {
          if (typeof e.loaded === "number") {
            const pct = Math.round(e.loaded * 100);
            console.log(`Downloaded ${pct}%`);
          }
        });
      },
    };

    if (!statusNorm || statusNorm === "readily") {
      if (provider.createDetector) detector = await provider.createDetector(options);
      else if (provider.create) detector = await provider.create(options);
    } else if (statusNorm === "after-download") {
      if (provider.createDetector) detector = await provider.createDetector(options);
      else if (provider.create) detector = await provider.create(options);
      await detector!.ready;
    } else {
      return null;
    }

    const results = await detector!.detect(input);
    const top = Array.isArray(results) && results.length ? results[0] : null;
    return top?.detectedLanguage ?? null;
  } catch {
    return null;
  }
}

function buildTranslatePrompt(t: string, source: string, target: string, detectedCode?: string | null) {
  if (!t.trim()) return "";
  const detectedLine = detectedCode ? `\nDetected source (BCP 47): ${detectedCode}` : "";
  return `Task: Translate the following text from ${source} to ${target}.${detectedLine}\n\nInstructions:\n- Preserve meaning, tone, and style.\n- Do not add explanations or notes.\n- Return only translated text.\n\nInput:\n${t}`;
}

export function useTranslator() {
  const history = useTextHistory("");
  const text = history.present;
  const words = useMemo(() => (text.trim() ? text.trim().split(/\s+/).length : 0), [text]);
  const chars = text.length;

  const [output, setOutput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const [sourceLang, setSourceLang] = useState("English (US)");
  const [targetLang, setTargetLang] = useState("Spanish");

  const chromeAI = useChromeAI(
    "You are a professional translation assistant. Translate text precisely and return only the translated output without any commentary."
  );

  const languageOptions = [
    "English (US)",
    "Spanish",
    "French",
    "German",
    "Italian",
    "Portuguese",
    "Chinese (Simplified)",
    "Japanese",
    "Korean",
  ];

  function swapLanguages() {
    setSourceLang((prev) => {
      const newSource = targetLang;
      setTargetLang(prev);
      return newSource;
    });
  }

  const aiAvailableFlag = !!getLanguageDetectorProvider() || chromeAI.available;

  async function translate() {
    setGenerating(true);
    const detected = text.trim() ? await detectLanguageViaProvider(text) : null;
    const prompt = buildTranslatePrompt(text, sourceLang, targetLang, detected);

    if (chromeAI.available) {
      const result = await chromeAI.generate(prompt);
      if (result.ok) {
        setOutput(result.text.trim());
      } else {
        setOutput(text);
      }
    } else {
      setOutput(text);
    }
    setGenerating(false);
  }

  async function copyOutput() {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
    }
  }

  return {
    text,
    words,
    chars,
    history,
    output,
    generating,
    copied,
    sourceLang,
    targetLang,
    setSourceLang,
    setTargetLang,
    languageOptions,
    swapLanguages,
    translate,
    copyOutput,
    aiAvailableFlag,
  } as const;
}