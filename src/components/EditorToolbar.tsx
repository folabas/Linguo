"use client";

import { useState } from "react";
import Image from "next/image";

type Props = {
  words: number;
  chars: number;
  error?: string;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onAttach: () => void;
};

export default function EditorToolbar({
  words,
  chars,
  error,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  onAttach,
}: Props) {
  const [activeTool, setActiveTool] = useState<string | null>(null);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm">
      <div className="text-[11px] sm:text-xs text-[#A5A5A5] break-words">
        Word count: {words} | Character count: {chars}
        {error && <span className="ml-2 sm:ml-3 text-[#DF1212]">{error}</span>}
      </div>

      <div
        role="toolbar"
        aria-label="Editor actions"
        className="flex flex-wrap items-center gap-1.5 sm:gap-2 rounded-[8px] border border-[#A5A5A5]/20 px-2 py-1"
      >
        <button
          title="Attach"
          onClick={() => {
            setActiveTool((prev) => (prev === "attach" ? null : "attach"));
            onAttach();
          }}
          aria-pressed={activeTool === "attach"}
          className={`px-2.5 py-2 rounded cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-black/20 ${
            activeTool === "attach" ? "bg-black/[.05]" : "hover:bg-black/[.05]"
          }`}
        >
          <Image src="/clip.svg" alt="Attach icon" width={12} height={10} />
        </button>
        <span aria-hidden="true" className="hidden sm:inline px-2 text-[#A5A5A5]">|</span>
        <button
          title="Undo"
          onClick={onUndo}
          disabled={!canUndo}
          className={`px-2.5 py-2 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-black/20 ${
            canUndo ? "cursor-pointer hover:bg-black/[.05] active:bg-black/[.05]" : "opacity-50 cursor-not-allowed"
          }`}
        >
          <Image src="/undo.svg" alt="Undo icon" width={13} height={13} />
        </button>
        <button
          title="Redo"
          onClick={onRedo}
          disabled={!canRedo}
          className={`px-2.5 py-2 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-black/20 ${
            canRedo ? "cursor-pointer hover:bg-black/[.05] active:bg-black/[.05]" : "opacity-50 cursor-not-allowed"
          }`}
        >
          <Image src="/redo.svg" alt="Redo icon" width={14} height={14} />
        </button>
      </div>
    </div>
  );
}