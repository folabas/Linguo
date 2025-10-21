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
  const [statusNote, setStatusNote] = useState<string | null>(null);

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

  const words = useMemo(() => (text.trim() ? text.trim().split(/\s+/).length : 0), [text]);
  const chars = text.length;

  const chromeAI = useChromeAI(
    "You are a professional proofreader. Fix grammar, spelling, and punctuation. Return only the corrected text without any commentary and preserve original formatting when possible."
  );

  // Prefer the dedicated Proofreader API when present; fall back to Prompt API
  type ProofreaderProvider = {
    availability: (options?: { includeCorrectionTypes?: boolean; expectedInputLanguages?: string[] }) => Promise<string>;
    create: (options?: {
      includeCorrectionTypes?: boolean;
      includeCorrectionExplanation?: boolean;
      expectedInputLanguages?: string[];
      monitor?: (m: EventTarget) => void;
      signal?: AbortSignal;
    }) => Promise<{ proofread: (input: string) => Promise<{ corrected: string; corrections: unknown[] | null }>; ready?: Promise<void> }>;
  };

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
  const proofreaderRef = useRef<null | { proofread: (input: string) => Promise<{ corrected: string; corrections: unknown[] | null }>; ready?: Promise<void> }>(null);
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
    if (!trimmed) {
      setSuggestions([]);
      setDismissed({});
      setStatusNote('Enter text to analyze.');
      setIsAnalyzing(false);
      return;
    }

    // Try dedicated Proofreader first
    if (provider) {
      try {
        const statusRaw = await provider.availability({ includeCorrectionTypes: false, expectedInputLanguages: ["en"] });
        const status = normalizeAvailability(statusRaw);
        setStatusNote(status === 'after-download' ? 'Downloading Proofreader model…' : 'Using Proofreader AI.');

        // Reuse proofreader instance when available; otherwise create with monitoring and abort support
        if (!proofreaderRef.current) {
          controllerRef.current?.abort();
          controllerRef.current = new AbortController();
          lastProgressRef.current = 0;

          const proofreader = await provider.create({
            includeCorrectionTypes: false,
            expectedInputLanguages: ["en"],
            signal: controllerRef.current.signal,
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

          proofreaderRef.current = proofreader;
        }

        // If a download is required, wait for readiness with a timeout protection
        if (status === 'after-download' && proofreaderRef.current?.ready) {
          const timeoutMs = 25000;
          const readyOrTimeout = await Promise.race([
            proofreaderRef.current.ready,
            new Promise((resolve) => setTimeout(resolve, timeoutMs)),
          ]);
          if (readyOrTimeout === undefined && lastProgressRef.current === 0) {
            // Timed out and still 0% — abort and fall back
            controllerRef.current?.abort();
            throw new Error('Proofreader download timed out at 0%');
          }
        }

        const result = await proofreaderRef.current!.proofread(trimmed);
        const corrected = result.corrected?.trim() ?? trimmed;
        const items = computeSuggestions(trimmed, corrected);
        setSuggestions(items);
        setDismissed({});
        setStatusNote(items.length > 0 ? `Generated ${items.length} suggestion${items.length > 1 ? 's' : ''}.` : 'No changes found.');
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
        const items = computeSuggestions(trimmed, corrected);
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

  // Auto-generate suggestions with debounce on text changes
  useEffect(() => {
    const trimmed = text.trim();
    if (!trimmed) {
      setSuggestions([]);
      setDismissed({});
      setStatusNote('Enter text to analyze.');
      return;
    }

    const t = setTimeout(() => {
      if (!isAnalyzing) {
        analyzeText();
      }
    }, 600);

    return () => clearTimeout(t);
  }, [text, isAnalyzing]);

  function buildProofreadPrompt(t: string) {
    const trimmed = t.trim();
    if (!trimmed) return "";
    return `Task: Proofread and correct the text.\n\nInstructions:\n- Correct grammar, spelling, and punctuation.\n- Keep the meaning and formatting.\n- Return only the corrected text without explanations.\n\nText:\n${trimmed}`;
  }

  async function fixAll() {
    const provider = getProofreaderProvider();
    const trimmed = text.trim();

    // Prefer the dedicated Proofreader API when available
    if (provider && trimmed) {
      try {
        const statusRaw = await provider.availability({ includeCorrectionTypes: false, expectedInputLanguages: ["en"] });
        const status = normalizeAvailability(statusRaw);

        const proofreader = await provider.create({
          includeCorrectionTypes: false,
          expectedInputLanguages: ["en"],
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

        if (status === "after-download" && proofreader.ready) {
          await proofreader.ready;
        }

        const result = await proofreader.proofread(trimmed);
        const corrected = result.corrected?.trim();
        if (corrected && corrected !== text) {
          history.set(corrected);
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
          {/* Left: editor */}
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

          {/* Right: suggestions/history and Fix All button */}
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