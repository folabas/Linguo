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
    <div className="flex items-center justify-between px-4 py-3 text-sm">
      <div className="text-xs text-[#A5A5A5]">
        Word count: {words} | Character count: {chars}
        {error && <span className="ml-3 text-[#DF1212]">{error}</span>}
      </div>

      <div className="flex items-center gap-2 rounded-[8px] border border-[#A5A5A5]/20 px-2 py-1">
        <button
          title="Attach"
          onClick={() => {
            setActiveTool((prev) => (prev === "attach" ? null : "attach"));
            onAttach();
          }}
          aria-pressed={activeTool === "attach"}
          className={`px-2 py-1 rounded cursor-pointer ${activeTool === "attach" ? "bg-black/[.05]" : "hover:bg-black/[.05]"}`}
        >
          <Image src="/clip.svg" alt="Attach icon" width={12} height={10} />
        </button>
        <span aria-hidden="true" className="px-2 text-[#A5A5A5]">|</span>
        <button
          title="Undo"
          onClick={onUndo}
          disabled={!canUndo}
          className={`px-2 py-1 rounded ${canUndo ? "cursor-pointer hover:bg-black/[.05] active:bg-black/[.05]" : "opacity-50 cursor-not-allowed"}`}
        >
          <Image src="/undo.svg" alt="Undo icon" width={13} height={13} />
        </button>
        <button
          title="Redo"
          onClick={onRedo}
          disabled={!canRedo}
          className={`px-2 py-1 rounded ${canRedo ? "cursor-pointer hover:bg-black/[.05] active:bg-black/[.05]" : "opacity-50 cursor-not-allowed"}`}
        >
          <Image src="/redo.svg" alt="Redo icon" width={14} height={14} />
        </button>
      </div>
    </div>
  );
}