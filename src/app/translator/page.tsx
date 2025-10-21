"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Header from "@/components/Header";
import EditorPane from "@/components/EditorPane";
import OutputPane from "@/components/OutputPane";
import { useTextHistory } from "@/features/editor/useTextHistory";
import { useChromeAI } from "@/features/ai/useChromeAI";

export default function TranslatorPage() {
  const history = useTextHistory("");
  const text = history.present;
  const words = useMemo(() => (text.trim() ? text.trim().split(/\s+/).length : 0), [text]);
  const chars = text.length;

  const [output, setOutput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const [sourceLang, setSourceLang] = useState("English (US)");
  const [targetLang, setTargetLang] = useState("Spanish");

  // Keep a general translation system prompt; language details go in the user prompt.
  const chromeAI = useChromeAI(
    "You are a professional translation assistant. Translate text precisely and return only the translated output without any commentary."
  );

  // Translation / LanguageDetector providers (support both current and explainer surfaces)
  type DetectorSurface = {
    // explainer surface
    canDetect?: () => Promise<string>;
    createDetector?: (options?: { monitor?: (m: EventTarget) => void }) => Promise<LanguageDetector>;
    // current implementation surface
    availability?: () => Promise<string>;
    create?: (options?: { monitor?: (m: EventTarget) => void }) => Promise<LanguageDetector>;
  };

  function getLanguageDetectorProvider(): DetectorSurface | null {
    const g = globalThis as { Translation?: DetectorSurface; LanguageDetector?: DetectorSurface };
    if (g.Translation?.canDetect && g.Translation.createDetector) return g.Translation;
    if (g.LanguageDetector?.availability && g.LanguageDetector.create) return g.LanguageDetector;
    if (typeof window !== 'undefined') {
      const w = window as unknown as { ai?: { translation?: DetectorSurface; languageDetector?: DetectorSurface } };
      if (w.ai?.translation?.canDetect && w.ai.translation.createDetector) return w.ai.translation;
      if (w.ai?.languageDetector?.availability && w.ai.languageDetector.create) return w.ai.languageDetector;
    }
    return null;
  }

  async function detectLanguage(input: string): Promise<string | null> {
    const provider = getLanguageDetectorProvider();
    if (!provider) return null;

    function normalizeAvailability(s: string | null): 'readily' | 'after-download' | 'no' | null {
      if (!s) return null;
      if (s === 'available' || s === 'readily') return 'readily';
      if (s === 'unavailable' || s === 'no') return 'no';
      if (s === 'after-download') return 'after-download';
      return null;
    }

    try {
      let status: string | null = null;
      if (provider.canDetect) status = await provider.canDetect();
      else if (provider.availability) status = await provider.availability();
      const statusNorm = normalizeAvailability(status);

      let detector: LanguageDetector | null = null;
      const options = {
        monitor: (m: EventTarget) => {
          // Optionally, listen for download progress
          m.addEventListener?.('downloadprogress', (e: Event & { loaded?: number }) => {
            if (typeof e.loaded === 'number') {
              const pct = Math.round(e.loaded * 100);
              // Match sample code behavior
              console.log(`Downloaded ${pct}%`);
            }
          });
        },
      };

      if (!statusNorm || statusNorm === 'readily') {
        // ready to use immediately
        if (provider.createDetector) detector = await provider.createDetector(options);
        else if (provider.create) detector = await provider.create(options);
      } else if (statusNorm === 'after-download') {
        // require model download, then ready
        if (provider.createDetector) detector = await provider.createDetector(options);
        else if (provider.create) detector = await provider.create(options);
        await detector!.ready;
      } else {
        return null; // 'no'
      }

      const results = await detector!.detect(input);
      // pick top result by confidence
      const top = Array.isArray(results) && results.length ? results[0] : null;
      return top?.detectedLanguage ?? null;
    } catch {
      return null;
    }
  }

  function buildTranslatePrompt(t: string, source: string, target: string, detectedCode?: string | null) {
    if (!t.trim()) return "";
    const detectedLine = detectedCode ? `\nDetected source (BCP 47): ${detectedCode}` : "";
    return `Task: Translate the following text from ${source} to ${target}.${detectedLine}

Instructions:
- Preserve meaning, tone, and style.
- Do not add explanations or notes.
- Return only translated text.

Input:
${t}`;
  }

  async function translate() {
    setGenerating(true);

    // Optional detection step to improve prompt clarity
    const detected = text.trim() ? await detectLanguage(text) : null;
    const prompt = buildTranslatePrompt(text, sourceLang, targetLang, detected);

    if (chromeAI.available) {
      const result = await chromeAI.generate(prompt);
      if (result.ok) {
        setOutput(result.text.trim());
      } else {
        // Fallback: echo input when on-device AI not available or errors
        setOutput(text);
      }
      setGenerating(false);
    } else {
      setOutput(text);
      setGenerating(false);
    }
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

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Header />

      <main className="px-8 pb-16">
        <h1 className="text-2xl font-semibold mb-4">Translate text &amp; writing</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
          <div className="flex flex-col gap-2">
            <div className="flex justify-start">
              <select
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value)}
                className="text-[12px] font-[500] px-3 py-1 rounded-[14px] border border-black/[.08] dark:border-white/[.145] bg-white text-black"
              >
                {languageOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <EditorPane
              text={text}
              onChange={history.set}
              words={words}
              chars={chars}
              suggestions={[]}
              dismissed={{}}
              onFix={() => {}}
              onDismiss={() => {}}
              onUndo={history.undo}
              onRedo={history.redo}
              canUndo={history.canUndo}
              canRedo={history.canRedo}
              historyPast={history.past}
              onRestore={(i) => history.restorePast(i)}
              showTabs={false}
             paneHeight={720}
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-end">
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="text-[12px] font-[500] px-3 py-1 rounded-[14px] border border-black/[.08] dark:border-white/[.145] bg-white text-black"
              >
                {languageOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <OutputPane
              output={output}
              copied={copied}
              onCopy={copyOutput}
              generating={generating}
              onGenerate={translate}
              aiAvailable={aiAvailableFlag}
              title="Translation"
              ctaLabel="Translate"
              placeholder="Translation will appear here..."
            />
          </div>

          <button
            onClick={swapLanguages}
            title="Swap languages"
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white text-black rounded-full border border-black/[.08] dark:border-white/[.145] w-9 h-9 grid place-items-center shadow"
          >
            <Image src="/translate.svg" alt="Swap" width={16} height={16} />
          </button>
        </div>

        <div className="mt-4 text-xs text-right text-black/70 dark:text-white/70">{sourceLang}</div>
      </main>
    </div>
  );
}