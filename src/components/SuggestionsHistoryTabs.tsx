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
}: Props) {
  const [internalTab, setInternalTab] = useState<'suggestions' | 'history'>('suggestions');
  const currentTab = activeTab ?? internalTab;
  const setTab = onTabChange ?? setInternalTab;

  return (
    <section>
      {/* Tabs header */}
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

      {/* History content */}
      {currentTab === 'history' && (
        <div className="mt-2 rounded-xl border border-black/[.08] dark:border-white/[.145] p-2">
          {historyPast.length === 0 ? (
            <div className="text-xs text-[#A5A5A5]">No history yet</div>
          ) : (
            <div className="space-y-1">
              {historyPast.map((entry, i) => (
                <div key={i} className="flex items-center justify-between gap-3 py-1">
                  <div className="text-xs text-[#333] dark:text-[#CCC] truncate max-w-[60%]">
                    {entry ? entry.slice(0, 80) : "(empty)"}
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

      {/* Suggestions content */}
      {currentTab === 'suggestions' && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 auto-rows-fr">
          {suggestions.map((s) =>
            dismissed[s.id] ? null : (
              <div
                key={s.id}
                className="rounded-xl border border-black/[.08] dark:border-white/[.145] p-3 h-full flex flex-col"
              >
                <div className="text-[15px] font-bold">
                  {s.type === "grammar" ? "Grammar" : "Rewrite for clarity"}
                </div>
                <div className="text-[15px] font-[450] mt-1">
                  {s.title}
                  {s.detail ? (
                    <div className="mt-2 rounded-lg bg-emerald-100 text-foreground px-3 py-2 text-[15px] font-medium">{s.detail}</div>
                  ) : null}
                </div>
                <div className="mt-auto pt-3 flex gap-2">
                  <button
                    onClick={() => onFix(s.id)}
                    className="px-3 py-1 text-[15px] font-medium rounded-lg bg-[#EBFFEA] text-black hover:opacity-90 cursor-pointer"
                  >
                    Fix
                  </button>
                  <button
                    onClick={() => onDismiss(s.id)}
                    className="px-3 py-1 text-[15px] font-medium rounded-lg bg-[#FFEAF2] text-black hover:opacity-90 cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </section>
  );
}