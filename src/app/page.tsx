"use client";


import Header from "@/components/Header";
import EditorPane from "@/components/EditorPane";
import OutputPane from "@/components/OutputPane";
import { useChromeAI } from "@/features/ai/useChromeAI";
import { useProofreader } from "@/features/proofreader/useProofreader";
import { useEffect, useState } from "react";

export default function Home() {
  const {
    text,
    history,
    words,
    chars,
    suggestions,
    dismissed,
    handleFix,
    handleDismiss,
    analyzeText,
  } = useProofreader();

  const [output, setOutput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [refinement, setRefinement] = useState("");
  const [hasGeneratedOnce, setHasGeneratedOnce] = useState(false);
  const [regenCount, setRegenCount] = useState(0); // counts only regenerations
  const regenLimit = 5;
  const systemPrompt = "You are a concise prompt-crafting assistant. Rewrite the input into clear, actionable prompts. If the input contains multiple questions or tasks, produce a numbered list of individually improved prompts, one per item, with no extra commentary.";
  const chromeAI = useChromeAI(systemPrompt);

  // Auto-run proofreader whenever the text changes (debounced)
  const [autoAnalyze, setAutoAnalyze] = useState(true);
  useEffect(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (!autoAnalyze) return;
    const len = trimmed.length;
    const delay = len > 5000 ? 1000 : len > 2000 ? 700 : 350;
    const timer = setTimeout(() => {
      void analyzeText();
    }, delay);
    return () => clearTimeout(timer);
  }, [text, analyzeText, autoAnalyze]);

  function buildPrompt(t: string, instruction?: string) {
    if (!t.trim()) return "";
    const refineBlock = instruction?.trim()
      ? `\n\nRefinement:\n${instruction.trim()}`
      : "";
    return `Goal: Generate improved prompts.\n\nInstructions:\n- Identify distinct questions or tasks in the input.\n- For multiple items, return a numbered list with one improved prompt per item.\n- Keep each prompt concise, specific, and actionable.\n- Do not add explanations or extra commentary.${refineBlock}\n\nInput:\n${t}\n\nOutput:\nReturn the improved prompt(s) as a numbered list when applicable.`;
  }

  async function handleGenerateOrRegenerate() {
    if (hasGeneratedOnce && regenCount >= regenLimit) {
      return; // exhausted
    }

    // Increment regen counter only for regenerations
    if (hasGeneratedOnce) {
      setRegenCount((c) => Math.min(c + 1, regenLimit));
    }

    setGenerating(true);
    const userPrompt = buildPrompt(text, hasGeneratedOnce ? refinement : undefined);

    if (chromeAI.available) {
      const result = await chromeAI.generate(userPrompt);
      if (result.ok) {
        setOutput(result.text.trim());
      } else {
        setOutput(userPrompt);
      }
      setGenerating(false);
    } else {
      setOutput(userPrompt);
      setGenerating(false);
    }

    if (!hasGeneratedOnce) {
      setHasGeneratedOnce(true);
    }
  }

  async function copyOutput() {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  }

  const ctaLabel = hasGeneratedOnce ? "Regenerate" : "Generate";
  const disabled = generating || (hasGeneratedOnce && regenCount >= regenLimit);
  const showRefinement = hasGeneratedOnce && regenCount < regenLimit;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Header />

      <main className="px-8 pb-16">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">Generate dynamic prompts</h1>
          <label className="flex items-center gap-2 text-sm" htmlFor="auto-analyze">
            <input
              id="auto-analyze"
              type="checkbox"
              checked={autoAnalyze}
              onChange={(e) => setAutoAnalyze(e.target.checked)}
              aria-label="Auto analyze while typing"
              className="cursor-pointer"
            />
            Auto analyze while typing
          </label>
        </div>
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
            paneHeight={720}
            emptySuggestionsMessage="Suggestions will pop up while typing"
          />

          <OutputPane
            output={output}
            copied={copied}
            onCopy={copyOutput}
            generating={generating}
            onGenerate={handleGenerateOrRegenerate}
            aiAvailable={chromeAI.available}
            ctaLabel={ctaLabel}
            refinementValue={refinement}
            onRefinementChange={setRefinement}
            refinementPlaceholder="Add an instruction for refinement..."
            showRefinement={showRefinement}
            regenCount={regenCount}
            regenLimit={regenLimit}
            disabled={disabled}
            onEditInEditor={() => history.set(output)}
            editLabel="Edit in Editor"
          />
        </div>
        <div className="mt-4 text-xs text-right text-black/70 dark:text-white/70">English (US)</div>
      </main>
    </div>
  );
}
