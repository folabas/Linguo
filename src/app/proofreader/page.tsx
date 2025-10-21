"use client";

import { useState } from "react";
import Header from "@/components/Header";
import EditorPane from "@/components/EditorPane";
import SuggestionsHistoryTabs from "@/components/SuggestionsHistoryTabs";
import { useProofreader } from "@/features/proofreader/useProofreader";

export default function ProofreaderPage() {
  const {
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
  } = useProofreader();

  const [activeTab, setActiveTab] = useState<'suggestions' | 'history'>('suggestions');

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