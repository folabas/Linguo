import { useEffect, useMemo, useRef, useState } from "react";
import type { Suggestion } from "@/components/types";
import { useTextHistory } from "@/features/editor/useTextHistory";
import { useChromeAI } from "@/features/ai/useChromeAI";

// Align correction shape with chrome-ai.d.ts ProofreadCorrection
export type ChromeCorrection = {
  startIndex?: number;
  endIndex?: number;
  replacement?: string;
  type?: string;
  explanation?: string;
};

export type ProofreaderSession =
  | { proofreadText: (input: string) => Promise<{ corrected?: string; corrections: ChromeCorrection[] | null }>; ready?: Promise<void> }
  | { proofread: (input: string) => Promise<{ corrected: string; corrections: ChromeCorrection[] | null }>; ready?: Promise<void> };

export type ProofreaderProvider = {
  availability: (options?: { includeCorrectionTypes?: boolean; expectedInputLanguages?: string[] }) => Promise<string>;
  create: (options?: {
    includeCorrectionTypes?: boolean;
    includeCorrectionExplanation?: boolean;
    expectedInputLanguages?: string[];
    monitor?: (m: EventTarget) => void;
    signal?: AbortSignal;
  }) => Promise<ProofreaderSession>;
};

function hasProofreadText(session: ProofreaderSession | null): session is {
  proofreadText: (input: string) => Promise<{ corrected?: string; corrections: ChromeCorrection[] | null }>;
  ready?: Promise<void>;
} {
  return !!session && "proofreadText" in session;
}

function hasProofread(session: ProofreaderSession | null): session is {
  proofread: (input: string) => Promise<{ corrected: string; corrections: ChromeCorrection[] | null }>;
  ready?: Promise<void>;
} {
  return !!session && "proofread" in session;
}

function getProofreaderProvider(): ProofreaderProvider | null {
  const g = globalThis as { Proofreader?: ProofreaderProvider };
  if (g.Proofreader?.create) return g.Proofreader;
  if (typeof window !== "undefined") {
    const w = window as unknown as { ai?: { proofreader?: ProofreaderProvider } };
    if (w.ai?.proofreader?.create) return w.ai.proofreader!;
  }
  return null;
}

function normalizeAvailability(s: string | null): "readily" | "after-download" | "no" | null {
  if (!s) return null;
  if (s === "available" || s === "readily") return "readily";
  if (s === "unavailable" || s === "no") return "no";
  if (s === "after-download" || s === "downloadable") return "after-download";
  return null;
}

function buildProofreadPrompt(t: string) {
  const trimmed = t.trim();
  if (!trimmed) return "";
  return `Task: Proofread and correct the text.\n\nInstructions:\n- Correct grammar, spelling, and punctuation.\n- Keep the meaning and formatting.\n- Return only the corrected text without explanations.\n\nText:\n${trimmed}`;
}

function computeSuggestions(original: string, corrected: string): Suggestion[] {
  if (!original.trim() || original === corrected) return [];

  const wordRegex = /\b\w+\b/g;
  const origMatches = Array.from(original.matchAll(wordRegex));
  const corrMatches = Array.from(corrected.matchAll(wordRegex));

  const items: Suggestion[] = [];

  if (origMatches.length === corrMatches.length && origMatches.length > 0) {
    for (let i = 0; i < origMatches.length; i++) {
      const o = origMatches[i];
      const c = corrMatches[i];
      const ow = o[0];
      const cw = c[0];
      if (ow !== cw) {
        const start = o.index ?? 0;
        const end = start + ow.length;
        items.push({
          id: `replace-${start}-${ow}-${cw}`,
          type: "grammar",
          title: `Change "${ow}" to "${cw}"`,
          apply: (t: string) => t.slice(0, start) + cw + t.slice(end),
        });
      }
    }
  }

  if (items.length === 0 && original !== corrected) {
    items.push({
      id: "apply-all",
      type: "rewrite",
      title: "Apply all corrections",
      detail: corrected,
      apply: () => corrected,
    });
  }

  return items;
}

function suggestionsFromCorrections(original: string, corrections: ChromeCorrection[]): Suggestion[] {
  const items: Suggestion[] = [];

  for (let i = 0; i < corrections.length; i++) {
    const c = corrections[i];
    const start = c.startIndex ?? 0;
    const end = c.endIndex ?? start;
    const originalSegment = original.slice(start, end).trim();
    const replacement = c.replacement?.trim() ?? "";
    const issueType = (c.type ?? "grammar").toLowerCase();
    const explanation = c.explanation?.trim();

    let title = "";
    let detail: string | undefined;
    let apply: (t: string) => string;

    if (originalSegment && replacement && originalSegment !== replacement) {
      title = `Change “${originalSegment}” to “${replacement}”`;
      apply = (t) => t.slice(0, start) + replacement + t.slice(end);
    } else if (originalSegment && !replacement) {
      title = `Remove “${originalSegment}”`;
      apply = (t) => t.slice(0, start) + t.slice(end);
    } else if (!originalSegment && replacement) {
      title = `Add “${replacement}”`;
      apply = (t) => t.slice(0, start) + replacement + t.slice(start);
    } else {
      title = `Review “${originalSegment || replacement}”`;
      apply = (t) => t;
    }

    if (explanation) detail = explanation;

    items.push({
      id: `corr-${start}-${end}-${i}`,
      type: issueType === "rewrite" ? "rewrite" : "grammar",
      title,
      detail,
      apply,
    });
  }

  return items;
}

function applyAllCorrections(original: string, corrections: ChromeCorrection[]): string {
  const sorted = [...corrections].sort((a, b) => (a.startIndex ?? 0) - (b.startIndex ?? 0));
  let result = "";
  let cursor = 0;
  for (const c of sorted) {
    const start = c.startIndex ?? cursor;
    const end = c.endIndex ?? start;
    const originalSegment = original.slice(start, end);
    const replacement = c.replacement ?? originalSegment;
    result += original.slice(cursor, start) + replacement;
    cursor = end;
  }
  result += original.slice(cursor);
  return result;
}

export function useProofreader() {
  const history = useTextHistory("");
  const text = history.present;

  const [dismissed, setDismissed] = useState<Record<string, boolean>>({});
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [statusNote, setStatusNote] = useState<string | null>("Enter text and click Generate to analyze.");

  const words = useMemo(() => (text.trim() ? text.trim().split(/\s+/).length : 0), [text]);
  const chars = text.length;

  const chromeAI = useChromeAI(
    "You are a professional proofreader. Fix grammar, spelling, and punctuation. Return only the corrected text without any commentary and preserve original formatting when possible."
  );

  const aiAvailableFlag = !!getProofreaderProvider() || chromeAI.available;

  const proofreaderRef = useRef<ProofreaderSession | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const lastProgressRef = useRef<number>(0);

  function handleFix(id: string) {
    const sug = suggestions.find((s) => s.id === id);
    if (!sug) return;
    const newText = sug.apply(text);
    history.set(newText);
    setDismissed((d) => ({ ...d, [id]: true }));
  }

  function handleDismiss(id: string) {
    setDismissed((d) => ({ ...d, [id]: true }));
  }

  async function analyzeText() {
    setIsAnalyzing(true);
    setStatusNote(null);

    const provider = getProofreaderProvider();
    const trimmed = text.trim();
    const originalText = text;
    if (!trimmed) {
      setSuggestions([]);
      setDismissed({});
      setStatusNote("Please enter some text to analyze.");
      setIsAnalyzing(false);
      return;
    }

    if (provider) {
      try {
        const statusRaw = await provider.availability({ includeCorrectionTypes: true, expectedInputLanguages: ["en"] });
        const status = normalizeAvailability(statusRaw);
        setStatusNote(status === "after-download" ? "Downloading Proofreader model…" : "Using Proofreader AI.");

        if (!proofreaderRef.current) {
          controllerRef.current?.abort();
          controllerRef.current = new AbortController();
          lastProgressRef.current = 0;

          const proofreader = await provider.create({
            includeCorrectionTypes: true,
            includeCorrectionExplanation: true,
            expectedInputLanguages: ["en"],
            signal: controllerRef.current?.signal as AbortSignal,
            monitor(m) {
              m.addEventListener?.("downloadprogress", (e: Event & { loaded?: number }) => {
                const loaded = (e as unknown as { loaded?: number }).loaded;
                if (typeof loaded === "number") {
                  const pct = Math.round(loaded * 100);
                  lastProgressRef.current = pct;
                  setStatusNote(`Downloading Proofreader (${pct}%)`);
                  console.log(`Downloaded ${pct}%`);
                }
              });
            },
          });

          proofreaderRef.current = proofreader as ProofreaderSession;
        }

        if (status === "after-download" && proofreaderRef.current && "ready" in proofreaderRef.current && proofreaderRef.current.ready) {
          await proofreaderRef.current.ready;
        }

        let result: { corrected?: string; corrections: ChromeCorrection[] | null };
        if (hasProofreadText(proofreaderRef.current)) {
          result = await proofreaderRef.current.proofreadText(originalText);
        } else if (hasProofread(proofreaderRef.current)) {
          result = await proofreaderRef.current.proofread(originalText);
        } else {
          throw new Error("Proofreader session missing methods");
        }

        const corrections = result.corrections ?? [];
        if (corrections.length > 0) {
          const items = suggestionsFromCorrections(originalText, corrections);
          setSuggestions(items);
          setDismissed({});
          setStatusNote(`Generated ${items.length} suggestion${items.length > 1 ? "s" : ""}.`);
        } else {
          const corrected = (result.corrected ?? originalText).trim();
          const items = computeSuggestions(originalText, corrected);
          setSuggestions(items);
          setDismissed({});
          setStatusNote(items.length > 0 ? `Generated ${items.length} suggestion${items.length > 1 ? "s" : ""}.` : "No changes found.");
        }
        setIsAnalyzing(false);
        return;
      } catch {
        // fallback below
      }
    }

    if (chromeAI.available && trimmed) {
      setStatusNote("Using Prompt API (AI).");
      const prompt = buildProofreadPrompt(trimmed);
      const result = await chromeAI.generate(prompt);
      if (result.ok) {
        const corrected = result.text.trim();
        const items = computeSuggestions(originalText, corrected);
        setSuggestions(items);
        setDismissed({});
        setStatusNote(items.length > 0 ? `Generated ${items.length} suggestion${items.length > 1 ? "s" : ""}.` : "No changes found.");
      } else {
        setSuggestions([]);
        setDismissed({});
        setStatusNote("Prompt API failed to generate corrections.");
      }
    } else {
      setSuggestions([]);
      setDismissed({});
      setStatusNote("AI unavailable on this device.");
    }

    setIsAnalyzing(false);
  }

  useEffect(() => {
    const trimmed = text.trim();
    if (!trimmed) {
      setSuggestions([]);
      setDismissed({});
      setStatusNote("Enter text and click Generate to analyze.");
    }
  }, [text]);

  async function fixAll() {
    const provider = getProofreaderProvider();
    const trimmed = text.trim();
    const originalText = text;

    if (provider && trimmed) {
      try {
        const statusRaw = await provider.availability({ includeCorrectionTypes: true, expectedInputLanguages: ["en"] });
        const status = normalizeAvailability(statusRaw);

        if (!proofreaderRef.current) {
          controllerRef.current?.abort();
          controllerRef.current = new AbortController();

          const proofreader = await provider.create({
            includeCorrectionTypes: true,
            includeCorrectionExplanation: true,
            expectedInputLanguages: ["en"],
            signal: controllerRef.current?.signal as AbortSignal,
            monitor(m) {
              m.addEventListener?.("downloadprogress", (e: Event & { loaded?: number }) => {
                const loaded = (e as unknown as { loaded?: number }).loaded;
                if (typeof loaded === "number") {
                  const pct = Math.round(loaded * 100);
                  console.log(`Downloaded ${pct}%`);
                }
              });
            },
          });

          proofreaderRef.current = proofreader as ProofreaderSession;
        }

        if (status === "after-download" && proofreaderRef.current && "ready" in proofreaderRef.current && proofreaderRef.current.ready) {
          await proofreaderRef.current.ready;
        }

        let result: { corrected?: string; corrections: ChromeCorrection[] | null };
        if (hasProofreadText(proofreaderRef.current)) {
          result = await proofreaderRef.current.proofreadText(originalText);
        } else if (hasProofread(proofreaderRef.current)) {
          result = await proofreaderRef.current.proofread(originalText);
        } else {
          throw new Error("Proofreader session missing methods");
        }

        const corrections = result.corrections ?? [];
        if (corrections.length > 0) {
          const correctedAll = applyAllCorrections(originalText, corrections);
          if (correctedAll && correctedAll !== text) {
            history.set(correctedAll);
          }
        } else {
          const corrected = result.corrected?.trim();
          if (corrected && corrected !== text) {
            history.set(corrected);
          }
        }
        setDismissed((d) => {
          const next = { ...d };
          for (const s of suggestions) next[s.id] = true;
          return next;
        });
        return;
      } catch {
        // Fall through to Prompt API fallback
      }
    }

    if (chromeAI.available && trimmed) {
      const prompt = buildProofreadPrompt(trimmed);
      const result = await chromeAI.generate(prompt);
      if (result.ok) {
        const corrected = result.text.trim();
        if (corrected && corrected !== text) {
          history.set(corrected);
        }
        setDismissed((d) => {
          const next = { ...d };
          for (const s of suggestions) next[s.id] = true;
          return next;
        });
        return;
      }
    }

    let newText = text;
    const stillActive = suggestions.filter((s) => !dismissed[s.id]);
    for (const s of stillActive) {
      newText = s.apply(newText);
    }
    if (newText !== text) {
      history.set(newText);
    }
    setDismissed((d) => {
      const next = { ...d };
      for (const s of stillActive) next[s.id] = true;
      return next;
    });
  }

  return {
    text,
    words,
    chars,
    history,
    suggestions,
    dismissed,
    handleFix,
    handleDismiss,
    analyzeText,
    fixAll,
    isAnalyzing,
    statusNote,
    aiAvailableFlag,
  } as const;
}