"use client";


import { useMemo, useState } from "react";
import Header from "@/components/Header";
import EditorPane from "@/components/EditorPane";
import OutputPane from "@/components/OutputPane";
import type { Suggestion } from "@/components/types";
import { useChromeAI } from "@/features/ai/useChromeAI";
import { useTextHistory } from "@/features/editor/useTextHistory";

export default function Home() {
  const history = useTextHistory("");
  const text = history.present;
  const [output, setOutput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const systemPrompt = "You are a concise prompt-crafting assistant. Rewrite the input into a single, clear, actionable prompt without extra commentary.";
  const chromeAI = useChromeAI(systemPrompt);

  const suggestions: Suggestion[] = [
    {
      id: "grammar1",
      type: "grammar",
      title: "Change 'their' to 'there'",
      apply: (t) => t.replace(/\btheir\b/gi, "there"),
    },
    {
      id: "rewrite1",
      type: "rewrite",
      title: "Rewrite for clarity",
      detail: "\“The report was read by me\” → \“I read the report\”",
      apply: (t) => t.replace(/The report was read by me/gi, "I read the report"),
    },
  ];

  const [dismissed, setDismissed] = useState<Record<string, boolean>>({});

  const words = useMemo(() => {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  }, [text]);
  const chars = text.length;

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

  function buildPrompt(t: string) {
    if (!t.trim()) return "";
    return `Goal: Generate a dynamic prompt.\n\nInstructions:\n- Analyze the text and craft a clear, actionable prompt.\n- Keep it concise and specific.\n\nInput:\n${t}\n\nOutput:\nProvide a single improved prompt.`;
  }

  function generate() {
    setGenerating(true);
    const userPrompt = buildPrompt(text);

    if (chromeAI.available) {
      void (async () => {
        const result = await chromeAI.generate(userPrompt);
        if (result.ok) {
          setOutput(result.text.trim());
        } else {
          // Fallback to local builder if Chrome AI errors
          setOutput(userPrompt);
        }
        setGenerating(false);
      })();
    } else {
      // Fallback for non-Chrome or when the on-device model isn't available
      setOutput(userPrompt);
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
          />

          <OutputPane
            output={output}
            copied={copied}
            onCopy={copyOutput}
            generating={generating}
            onGenerate={generate}
            aiAvailable={chromeAI.available}
          />
        </div>
        <div className="mt-4 text-xs text-right text-black/70 dark:text-white/70">English (US)</div>
      </main>
    </div>
  );
}
