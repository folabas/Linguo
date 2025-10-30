"use client";

import Image from "next/image";
import Header from "@/components/Header";
import EditorPane from "@/components/EditorPane";
import OutputPane from "@/components/OutputPane";
import { useTranslator } from "@/features/translator/useTranslator";

export default function TranslatorPage() {
  const {
    text,
    words,
    chars,
    history,
    output,
    generating,
    copied,
    sourceLang,
    targetLang,
    setSourceLang,
    setTargetLang,
    languageOptions,
    swapLanguages,
    translate,
    copyOutput,
    aiAvailableFlag,
  } = useTranslator();

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Header />

      <main className="px-8 pb-16">
        <h1 className="text-2xl font-semibold mb-4">Translate text &amp; writing</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
          <div className="flex flex-col gap-2">
            <div className="flex justify-start">
              <label htmlFor="source-lang" className="sr-only">Source language</label>
              <select
                id="source-lang"
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value)}
                className="text-[12px] font-[500] px-3 py-1 rounded-[14px] border border-black/[.08] dark:border-white/[.145] bg-white text-black"
              >
                {languageOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

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
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-end">
              <label htmlFor="target-lang" className="sr-only">Target language</label>
              <select
                id="target-lang"
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="text-[12px] font-[500] px-3 py-1 rounded-[14px] border border-black/[.08] dark:border-white/[.145] bg-white text-black"
              >
                {languageOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <OutputPane
              output={output}
              copied={copied}
              onCopy={copyOutput}
              generating={generating}
              onGenerate={translate}
              aiAvailable={aiAvailableFlag}
              title="Translation"
              ctaLabel="Translate"
              placeholder="Translation will appear here..."
            />
          </div>

          <button
            onClick={swapLanguages}
            title="Swap languages"
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white text-black rounded-full border border-black/[.08] dark:border-white/[.145] w-9 h-9 grid place-items-center shadow"
          >
            <Image src="/translate.svg" alt="Swap" width={16} height={16} />
          </button>
        </div>

        <div className="mt-4 text-xs text-right text-black/70 dark:text-white/70">{sourceLang}</div>
      </main>
    </div>
  );
}