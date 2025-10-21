"use client";

// (useState removed)
// (Image removed)
import type { Suggestion } from "@/components/types";
import { HelixLoader } from "@/components/Loader";
import { useAttach } from "@/features/attach/useAttach";
import SuggestionsHistoryTabs from "@/components/SuggestionsHistoryTabs";
import EditorToolbar from "@/components/EditorToolbar";

type Props = {
  text: string;
  onChange: (t: string) => void;
  words: number;
  chars: number;
  suggestions: Suggestion[];
  dismissed: Record<string, boolean>;
  onFix: (id: string) => void;
  onDismiss: (id: string) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  historyPast?: string[];
  onRestore?: (index: number) => void;
  showTabs?: boolean;
  paneHeight?: number;
  placeholder?: string;
};

export default function EditorPane({
  text,
  onChange,
  words,
  chars,
  suggestions,
  dismissed,
  onFix,
  onDismiss,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  historyPast = [],
  onRestore,
  showTabs = true,
  paneHeight = 420,
  placeholder = "Start writing here...",
}: Props) {
  const { openPicker, loading, error } = useAttach((extracted) => {
    const prefix = text ? "\n\n" : "";
    onChange(text + prefix + extracted);
  });
  return (
    <section className="flex flex-col" style={{ height: paneHeight }}>
      <div className="relative rounded-2xl border border-[#A5A5A5]/20 overflow-hidden flex-1 min-h-0">
        {loading && (
          <div className="absolute top-2 right-2">
            <HelixLoader size={20} speed={2.5} color="black" />
          </div>
        )}
        <textarea
          value={text}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full h-full p-5 bg-transparent outline-none resize-none font-sans"
        />
        {/* moved toolbar outside */}
      </div>

      {/* Toolbar */}
      <EditorToolbar
        words={words}
        chars={chars}
        error={error ?? undefined}
        onUndo={onUndo}
        onRedo={onRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        onAttach={openPicker}
      />

      {showTabs && (
        <SuggestionsHistoryTabs
          suggestions={suggestions}
          dismissed={dismissed}
          onFix={onFix}
          onDismiss={onDismiss}
          historyPast={historyPast}
          onRestore={onRestore}
        />
      )}
    </section>
  );
}