"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Header from "@/components/Header";
import EditorPane from "@/components/EditorPane";
import SuggestionsHistoryTabs from "@/components/SuggestionsHistoryTabs";
import type { Suggestion } from "@/components/types";
import { useTextHistory } from "@/features/editor/useTextHistory";
import { useChromeAI } from "@/features/ai/useChromeAI";

export default function ProofreaderPage() {
  const history = useTextHistory("");
  const text = history.present;

  const [dismissed, setDismissed] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'suggestions' | 'history'>('suggestions');

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [statusNote, setStatusNote] = useState<string | null>('Enter text and click Generate to analyze.');

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
            type: 'grammar',
            title: `Change "${ow}" to "${cw}"`,
            apply: (t: string) => t.slice(0, start) + cw + t.slice(end),
          });
        }
      }
    }

    // If token counts differ or no token-level differences were found, offer a single apply-all suggestion
    if (items.length === 0 && original !== corrected) {
      items.push({
        id: 'apply-all',
        type: 'rewrite',
        title: 'Apply all corrections',
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
        // Replace existing text
        title = `Change “${originalSegment}” to “${replacement}”`;
        apply = (t) => t.slice(0, start) + replacement + t.slice(end);
      } else if (originalSegment && !replacement) {
        // Remove text
        title = `Remove “${originalSegment}”`;
        apply = (t) => t.slice(0, start) + t.slice(end);
      } else if (!originalSegment && replacement) {
        // Add new text
        title = `Add “${replacement}”`;
        apply = (t) => t.slice(0, start) + replacement + t.slice(start);
      } else {
        // Fallback (e.g., same text)
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

  const words = useMemo(() => (text.trim() ? text.trim().split(/\s+/).length : 0), [text]);
  const chars = text.length;

  const chromeAI = useChromeAI(
    "You are a professional proofreader. Fix grammar, spelling, and punctuation. Return only the corrected text without any commentary and preserve original formatting when possible."
  );

  // Prefer the dedicated Proofreader API when present; fall back to Prompt API
  // Align correction shape with chrome-ai.d.ts ProofreadCorrection
  type ChromeCorrection = {
    startIndex?: number;
    endIndex?: number;
    replacement?: string;
    type?: string;
    explanation?: string;
  };

  type ProofreaderSession =
    | { proofreadText: (input: string) => Promise<{ corrected?: string; corrections: ChromeCorrection[] | null }>; ready?: Promise<void> }
    | { proofread: (input: string) => Promise<{ corrected: string; corrections: ChromeCorrection[] | null }>; ready?: Promise<void> };

  type ProofreaderProvider = {
    availability: (options?: { includeCorrectionTypes?: boolean; expectedInputLanguages?: string[] }) => Promise<string>;
    create: (options?: {
      includeCorrectionTypes?: boolean;
      includeCorrectionExplanation?: boolean;
      expectedInputLanguages?: string[];
      monitor?: (m: EventTarget) => void;
      signal?: AbortSignal;
    }) => Promise<ProofreaderSession>;
  };

  function hasProofreadText(session: ProofreaderSession | null): session is { proofreadText: (input: string) => Promise<{ corrected?: string; corrections: ChromeCorrection[] | null }>; ready?: Promise<void> } {
    return !!session && 'proofreadText' in session;
  }

  function hasProofread(session: ProofreaderSession | null): session is { proofread: (input: string) => Promise<{ corrected: string; corrections: ChromeCorrection[] | null }>; ready?: Promise<void> } {
    return !!session && 'proofread' in session;
  }

  // Debug helper to log proofreader results in the browser console
  function debugLogProofread(
    context: string,
    payload: { corrected?: string; corrections?: ChromeCorrection[] | null; suggestions?: Suggestion[] }
  ) {
    if (typeof window === 'undefined') return;
    try {
      // Group logs for readability
      console.group(`Proofreader: ${context}`);
      if (payload.corrected !== undefined) {
        console.log('corrected:', payload.corrected);
      }
      if (payload.corrections) {
        const rows = (payload.corrections ?? []).map((c, i) => ({
          i,
          startIndex: c.startIndex,
          endIndex: c.endIndex,
          replacement: c.replacement,
          type: c.type ?? '',
          explanation: c.explanation ?? '',
        }));
        console.table(rows);
      }
      if (payload.suggestions) {
        const sugRows = payload.suggestions.map((s, i) => ({ i, id: s.id, type: s.type, title: s.title }));
        console.table(sugRows);
      }
      console.groupEnd();
    } catch (e) {
      console.log('debugLogProofread error', e);
    }
  }

  function getProofreaderProvider(): ProofreaderProvider | null {
    const g = globalThis as { Proofreader?: ProofreaderProvider };
    if (g.Proofreader?.create) return g.Proofreader;
    if (typeof window !== 'undefined') {
      const w = window as unknown as { ai?: { proofreader?: ProofreaderProvider } };
      if (w.ai?.proofreader?.create) return w.ai.proofreader!;
    }
    return null;
  }

  function normalizeAvailability(s: string | null): 'readily' | 'after-download' | 'no' | null {
    if (!s) return null;
    if (s === 'available' || s === 'readily') return 'readily';
    if (s === 'unavailable' || s === 'no') return 'no';
    if (s === 'after-download' || s === 'downloadable') return 'after-download';
    return null;
  }

  const aiAvailableFlag = !!getProofreaderProvider() || chromeAI.available;

  // Manage proofreader lifecycle and progress
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
      setStatusNote('Please enter some text to analyze.');
      setIsAnalyzing(false);
      return;
    }

    // Try dedicated Proofreader first
    if (provider) {
      try {
        const statusRaw = await provider.availability({ includeCorrectionTypes: true, expectedInputLanguages: ["en"] });
        const status = normalizeAvailability(statusRaw);
        setStatusNote(status === 'after-download' ? 'Downloading Proofreader model…' : 'Using Proofreader AI.');

        // Reuse proofreader instance when available; otherwise create with monitoring and abort support
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

        // If a download is required, await readiness if available
        if (status === 'after-download' && proofreaderRef.current && 'ready' in proofreaderRef.current && proofreaderRef.current.ready) {
          await proofreaderRef.current.ready;
        }

        // Call proofreadText when available, else fall back to proofread
        let result: { corrected?: string; corrections: ChromeCorrection[] | null };
        if (hasProofreadText(proofreaderRef.current)) {
          result = await proofreaderRef.current.proofreadText(originalText);
        } else if (hasProofread(proofreaderRef.current)) {
          result = await proofreaderRef.current.proofread(originalText);
        } else {
          throw new Error('Proofreader session missing methods');
        }

        const corrections = result.corrections ?? [];
        if (corrections.length > 0) {
          const items = suggestionsFromCorrections(originalText, corrections);
          debugLogProofread('analyzeText: structured corrections', { corrections, suggestions: items });
          setSuggestions(items);
          setDismissed({});
          setStatusNote(`Generated ${items.length} suggestion${items.length > 1 ? 's' : ''}.`);
        } else {
          const corrected = (result.corrected ?? originalText).trim();
          const items = computeSuggestions(originalText, corrected);
          debugLogProofread('analyzeText: corrected string', { corrected, suggestions: items });
          setSuggestions(items);
          setDismissed({});
          setStatusNote(items.length > 0 ? `Generated ${items.length} suggestion${items.length > 1 ? 's' : ''}.` : 'No changes found.');
        }
        setIsAnalyzing(false);
        return;
      } catch (err) {
        console.warn('Proofreader failed, falling back to Prompt API', err);
        // fallback below
      }
    }

    // Fallback: Prompt API
    if (chromeAI.available && trimmed) {
      setStatusNote('Using Prompt API (AI).');
      const prompt = buildProofreadPrompt(trimmed);
      const result = await chromeAI.generate(prompt);
      if (result.ok) {
        const corrected = result.text.trim();
        const items = computeSuggestions(originalText, corrected);
        setSuggestions(items);
        setDismissed({});
        setStatusNote(items.length > 0 ? `Generated ${items.length} suggestion${items.length > 1 ? 's' : ''}.` : 'No changes found.');
      } else {
        setSuggestions([]);
        setDismissed({});
        setStatusNote('Prompt API failed to generate corrections.');
      }
    } else {
      setSuggestions([]);
      setDismissed({});
      setStatusNote('AI unavailable on this device.');
    }

    setIsAnalyzing(false);
  }

  // Clear suggestions when text is empty
  useEffect(() => {
    const trimmed = text.trim();
    if (!trimmed) {
      setSuggestions([]);
      setDismissed({});
      setStatusNote('Enter text and click Generate to analyze.');
    }
  }, [text]);

  function buildProofreadPrompt(t: string) {
    const trimmed = t.trim();
    if (!trimmed) return "";
    return `Task: Proofread and correct the text.\n\nInstructions:\n- Correct grammar, spelling, and punctuation.\n- Keep the meaning and formatting.\n- Return only the corrected text without explanations.\n\nText:\n${trimmed}`;
  }

  function applyAllCorrections(original: string, corrections: ChromeCorrection[]): string {
    // Apply in order of startIndex to maintain positions
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

  async function fixAll() {
    const provider = getProofreaderProvider();
    const trimmed = text.trim();
    const originalText = text;

    // Prefer the dedicated Proofreader API when available
    if (provider && trimmed) {
      try {
        const statusRaw = await provider.availability({ includeCorrectionTypes: true, expectedInputLanguages: ["en"] });
        const status = normalizeAvailability(statusRaw);

        // Reuse proofreader session when available; otherwise create with monitoring and abort support
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

        // Use proofreadText when available, else fall back to proofread
        let result: { corrected?: string; corrections: ChromeCorrection[] | null };
        if (hasProofreadText(proofreaderRef.current)) {
          result = await proofreaderRef.current.proofreadText(originalText);
        } else if (hasProofread(proofreaderRef.current)) {
          result = await proofreaderRef.current.proofread(originalText);
        } else {
          throw new Error('Proofreader session missing methods');
        }

        const corrections = result.corrections ?? [];
        if (corrections.length > 0) {
          const correctedAll = applyAllCorrections(originalText, corrections);
          debugLogProofread('fixAll: applied structured corrections', { corrections, corrected: correctedAll });
          if (correctedAll && correctedAll !== text) {
            history.set(correctedAll);
          }
        } else {
          const corrected = result.corrected?.trim();
          debugLogProofread('fixAll: corrected string', { corrected });
          if (corrected && corrected !== text) {
            history.set(corrected);
          }
        }
        // Dismiss all suggestions since global correction has been applied
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

    // Fallback: Prompt API (LanguageModel)
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
      // If AI fails, fall through to local deterministic fixes
    }

    // Fallback: apply all remaining deterministic suggestions
    let newText = text;
    const stillActive = suggestions.filter((s) => !dismissed[s.id]);
    for (const s of stillActive) {
      newText = s.apply(newText);
    }
    if (newText !== text) {
      history.set(newText);
    }
    // Mark all applied suggestions as dismissed
    setDismissed((d) => {
      const next = { ...d };
      for (const s of stillActive) next[s.id] = true;
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Header />

      <main className="px-8 pb-16">
        <h1 className="text-2xl font-semibold mb-4">Correct grammar &amp; writing</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <EditorPane
            text={text}
            onChange={history.set}
            words={words}
            chars={chars}
            suggestions={suggestions}
            dismissed={dismissed}
            onFix={handleFix}
            onDismiss={handleDismiss}
            onUndo={history.undo}
            onRedo={history.redo}
            canUndo={history.canUndo}
            canRedo={history.canRedo}
            historyPast={history.past}
            onRestore={(i) => history.restorePast(i)}
            showTabs={false}
            paneHeight={720}
            placeholder="Paste your text here or upload a document"
          />

          <div className="flex flex-col min-h-[720px]">
            <SuggestionsHistoryTabs
              suggestions={suggestions}
              dismissed={dismissed}
              onFix={handleFix}
              onDismiss={handleDismiss}
              historyPast={history.past}
              onRestore={(i) => history.restorePast(i)}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />

            {activeTab === 'suggestions' && (
              <div className="px-5 py-4 mt-auto space-y-2">
                <button
                  onClick={analyzeText}
                  disabled={isAnalyzing}
                  className="w-full h-10 rounded font-medium text-black cursor-pointer disabled:opacity-60"
                  style={{
                    background:
                      "linear-gradient(101.63deg, #15C90E -182.17%, #EBFFEA 113.13%)",
                  }}
                >
                  {isAnalyzing ? 'Generating…' : `Generate Suggestions ${aiAvailableFlag ? '(AI)' : ''}`}
                </button>
                {statusNote ? (
                  <div className="text-xs text-black/70 dark:text-white/70">
                    {statusNote}
                  </div>
                ) : null}
                <button
                  onClick={fixAll}
                  className="w-full h-10 rounded font-medium text-black cursor-pointer"
                  style={{
                    background:
                      "linear-gradient(101.63deg, #15C90E -182.17%, #EBFFEA 113.13%)",
                  }}
                >
                  Fix All Errors {aiAvailableFlag ? '(AI)' : ''}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 text-xs text-right text-black/70 dark:text-white/70">English (US)</div>
      </main>
    </div>
  );
}