"use client";

import Header from "@/components/Header";
import EditorPane from "@/components/EditorPane";
import OutputPane from "@/components/OutputPane";
import { useWriter } from "@/features/writer/useWriter";

export default function WriterPage() {
  const {
    text,
    words,
    chars,
    history,
    output,
    generating,
    copied,
    write,
    copyOutput,
    aiAvailableFlag,
  } = useWriter();

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Header />

      <main className="px-8 pb-16">
        <h1 className="text-2xl font-semibold mb-4">Create original &amp; engaging text</h1>

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
            placeholder="Describe your idea, brief, or theme..."
          />

          <OutputPane
            output={output}
            copied={copied}
            onCopy={copyOutput}
            generating={generating}
            onGenerate={write}
            aiAvailable={aiAvailableFlag}
            title="Draft"
            ctaLabel="Write"
            placeholder="Draft will appear here..."
          />
        </div>

        <div className="mt-4 text-xs text-right text-black/70 dark:text-white/70">English (US)</div>
      </main>
    </div>
  );
}