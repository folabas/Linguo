"use client";

import { useMemo, useState } from "react";
import Header from "@/components/Header";
import EditorPane from "@/components/EditorPane";
import OutputPane from "@/components/OutputPane";
import { useTextHistory } from "@/features/editor/useTextHistory";
import { useChromeAI } from "@/features/ai/useChromeAI";

export default function SummarizePage() {
  const history = useTextHistory("");
  const text = history.present;
  const words = useMemo(() => (text.trim() ? text.trim().split(/\s+/).length : 0), [text]);
  const chars = text.length;

  const [output, setOutput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const chromeAI = useChromeAI(
    "You are a precise summarization assistant. Provide a concise, clear summary capturing key points and structure. Return only the summary without commentary."
  );

  // Prefer the dedicated Summarizer API when present; fall back to Prompt API
  type SummarizerProvider = {
    availability?: () => Promise<'unavailable' | 'available' | 'downloadable'>;
    create: (options?: { sharedContext?: string; type?: string; format?: string; length?: string }) => Promise<SummarizerSession>;
  };

  function getSummarizer(): SummarizerProvider | null {
    const g = globalThis as { Summarizer?: SummarizerProvider };
    if (g.Summarizer?.create) return g.Summarizer;
    if (typeof window !== 'undefined' && (window as unknown as { ai?: { summarizer?: SummarizerProvider } }).ai?.summarizer?.create) {
      return (window as unknown as { ai?: { summarizer?: SummarizerProvider } }).ai!.summarizer!;
    }
    return null;
  }

  function buildSummarizePrompt(t: string) {
    if (!t.trim()) return "";
    return `Task: Summarize the following text.

Instructions:
- Capture main ideas and key details.
- Be concise and clear.
- Do not include commentary.
- Return only the summary.

Input:\n${t}`;
  }

  async function summarize() {
    setGenerating(true);

    const summarizerProvider = getSummarizer();
    if (summarizerProvider && text.trim()) {
      try {
        const status = (await summarizerProvider.availability?.()) ?? 'available';
        const options = {
          sharedContext: 'This is a scientific article',
          type: 'key-points',
          format: 'markdown',
          length: 'medium',
        };
        const summarizer = await summarizerProvider.create(options);
        if (status === 'downloadable') {
          // Wait until the model download is complete
          await summarizer.ready;
        }
        const result = await summarizer.summarize(text, {
          context: 'This article is intended for a tech-savvy audience.',
        });
        setOutput(result.trim());
        summarizer.destroy?.();
        setGenerating(false);
        return;
      } catch {
        // Fall through to Prompt API fallback
      }
    }

    const prompt = buildSummarizePrompt(text);
    if (chromeAI.available) {
      const result = await chromeAI.generate(prompt);
      if (result.ok) {
        setOutput(result.text.trim());
      } else {
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
      // noop
    }
  }

  const aiAvailableFlag = !!getSummarizer() || chromeAI.available;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Header />

      <main className="px-8 pb-16">
        <h1 className="text-2xl font-semibold mb-4">Summarize your text &amp; writing</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: editor */}
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
            placeholder="Paste your text here or upload a document"
          />

          {/* Right: output */}
          <OutputPane
            output={output}
            copied={copied}
            onCopy={copyOutput}
            generating={generating}
            onGenerate={summarize}
            aiAvailable={aiAvailableFlag}
            title="Summary..."
            ctaLabel="Resummarize"
            placeholder="Summary..."
          />
        </div>

        <div className="mt-4 text-xs text-right text-black/70 dark:text-white/70">English (US)</div>
      </main>
    </div>
  );
}