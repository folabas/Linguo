"use client";

import Header from "@/components/Header";
import EditorPane from "@/components/EditorPane";
import OutputPane from "@/components/OutputPane";
import { useSummarize } from "@/features/summarize/useSummarize";
import { useState } from "react";

export default function SummarizePage() {
  const {
    text,
    words,
    chars,
    history,
    output,
    generating,
    copied,
    summarize,
    copyOutput,
    aiAvailableFlag,
  } = useSummarize();

  const [refinement, setRefinement] = useState("");
  const [hasGeneratedOnce, setHasGeneratedOnce] = useState(false);
  const [regenCount, setRegenCount] = useState(0);
  const regenLimit = 5;

  async function handleGenerateOrRegenerate() {
    if (hasGeneratedOnce && regenCount >= regenLimit) {
      return;
    }

    if (hasGeneratedOnce) {
      setRegenCount((c) => Math.min(c + 1, regenLimit));
    }

    await summarize(hasGeneratedOnce ? refinement : undefined);

    if (!hasGeneratedOnce) {
      setHasGeneratedOnce(true);
    }
  }

  const ctaLabel = hasGeneratedOnce ? "Regenerate Summary" : "Generate Summary";
  const disabled = generating || (hasGeneratedOnce && regenCount >= regenLimit);
  const showRefinement = hasGeneratedOnce && regenCount < regenLimit;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Header />

      <main className="px-8 pb-16">
        <h1 className="text-2xl font-semibold mb-4">Summarize text</h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

          <OutputPane
            output={output}
            copied={copied}
            onCopy={copyOutput}
            generating={generating}
            onGenerate={handleGenerateOrRegenerate}
            aiAvailable={aiAvailableFlag}
            ctaLabel={ctaLabel}
            refinementValue={refinement}
            onRefinementChange={setRefinement}
            refinementPlaceholder="Add an instruction to refine the summary..."
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