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
  const systemPrompt = "You are a concise prompt-crafting assistant. Rewrite the input into a single, clear, actionable prompt without extra commentary.";
  const chromeAI = useChromeAI(systemPrompt);

  // Auto-run proofreader whenever the text changes (debounced)
  useEffect(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const timer = setTimeout(() => {
      void analyzeText();
    }, 350);
    return () => clearTimeout(timer);
  }, [text, analyzeText]);

  function buildPrompt(t: string, instruction?: string) {
    if (!t.trim()) return "";
    const refineBlock = instruction?.trim()
      ? `\n\nRefinement:\n${instruction.trim()}`
      : "";
    return `Goal: Generate a dynamic prompt.\n\nInstructions:\n- Analyze the text and craft a clear, actionable prompt.\n- Keep it concise and specific.${refineBlock}\n\nInput:\n${t}\n\nOutput:\nProvide a single improved prompt.`;
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
        <h1 className="text-2xl font-semibold mb-4">Generate dynamic prompts</h1>
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
