"use client";

import { useState } from "react";
import type { Suggestion } from "@/components/types";

type Props = {
  suggestions: Suggestion[];
  dismissed: Record<string, boolean>;
  onFix: (id: string) => void;
  onDismiss: (id: string) => void;
  historyPast?: string[];
  onRestore?: (index: number) => void;
  activeTab?: 'suggestions' | 'history';
  onTabChange?: (tab: 'suggestions' | 'history') => void;
  emptySuggestionsMessage?: string;
};

export default function SuggestionsHistoryTabs({
  suggestions,
  dismissed,
  onFix,
  onDismiss,
  historyPast = [],
  onRestore,
  activeTab,
  onTabChange,
  emptySuggestionsMessage,
}: Props) {
  const [internalTab, setInternalTab] = useState<'suggestions' | 'history'>('suggestions');
  const currentTab = activeTab ?? internalTab;
  const setTab = onTabChange ?? setInternalTab;

  return (
    <section>
      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={() => setTab('suggestions')}
          aria-pressed={currentTab === 'suggestions'}
          className={`text-[15px] font-[700] font-sans not-italic px-3 py-4 rounded-[14px] ${currentTab === 'suggestions' ? 'bg-emerald-100 text-emerald-800' : 'border border-black/[.08] dark:border-white/[.145] text-foreground'}`}
        >
          Suggestions
        </button>
        <button
          onClick={() => setTab('history')}
          aria-pressed={currentTab === 'history'}
          className={`text-[15px] font-[700] font-sans not-italic px-3 py-4 rounded-[14px] ${currentTab === 'history' ? 'bg-emerald-100 text-emerald-800' : 'border border-black/[.08] dark:border-white/[.145] text-foreground'}`}
        >
          History
        </button>
      </div>

      {currentTab === 'history' && (
        <div className="mt-2 rounded-xl border border-black/[.08] dark:border-white/[.145] p-2 max-h-56 overflow-y-auto">
          {historyPast.length === 0 ? (
            <div className="text-xs text-[#A5A5A5]">No history yet</div>
          ) : (
            <div className="space-y-1">
              {historyPast.map((entry, i) => (
                <div key={i} className="flex items-center justify-between gap-3 py-1">
                  <div className="text-xs text-[#333] dark:text-[#CCC] truncate max-w-[60%]" title={entry ?? "(empty)"}>
                    {entry ? (entry.length > 80 ? entry.slice(0, 80) + "…" : entry) : "(empty)"}
                  </div>
                  <button
                    onClick={() => onRestore?.(i)}
                    className="px-2 py-1 text-xs rounded bg-[#EBFFEA] text-black hover:opacity-90 cursor-pointer"
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {currentTab === 'suggestions' && (
        <div className="mt-3 space-y-3 max-h-64 overflow-y-auto pr-1">
          {suggestions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-lg font-medium mb-2">No suggestions yet</div>
              <div className="text-sm">{emptySuggestionsMessage ?? 'Click "Generate Suggestions" to analyze your text'}</div>
            </div>
          ) : (
            suggestions.map((s) =>
              dismissed[s.id] ? null : (
                <div
                  key={s.id}
                  className="rounded-xl border border-black/[.08] dark:border-white/[.145] p-4 bg-white dark:bg-gray-800"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      s.type === "grammar" 
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" 
                        : "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                    }`}>
                      {s.type === "grammar" ? "Grammar" : "Rewrite"}
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <div className="text-[15px] font-medium text-gray-900 dark:text-gray-100 mb-2">
                      {s.title}
                    </div>
                    {s.type === "grammar" && /Change\s+"(.+?)"\s+to\s+"(.+?)"/.test(s.title) && (
                      (() => {
                        const match = s.title.match(/Change\s+"(.+?)"\s+to\s+"(.+?)"/);
                        const wrong = match?.[1] ?? "";
                        const corrected = match?.[2] ?? "";
                        return (
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                              {wrong}
                            </span>
                            <span className="text-[#A5A5A5]">→</span>
                            <span className="px-2 py-1 rounded text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                              {corrected}
                            </span>
                          </div>
                        );
                      })()
                    )}
                    {s.detail && (
                      <div className="mt-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 max-h-32 overflow-y-auto">
                        <div className="text-sm font-medium text-emerald-800 dark:text-emerald-200 mb-1">
                          Suggested correction:
                        </div>
                        <div className="text-[15px] text-emerald-900 dark:text-emerald-100 font-medium">
                          {s.detail}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => onFix(s.id)}
                      className="px-4 py-2 text-[15px] font-medium rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 transition-colors cursor-pointer"
                    >
                      Apply Fix
                    </button>
                    <button
                      onClick={() => onDismiss(s.id)}
                      className="px-4 py-2 text-[15px] font-medium rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )
            )
          )}
        </div>
      )}
    </section>
  );
}