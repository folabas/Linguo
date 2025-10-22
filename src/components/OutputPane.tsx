"use client";
import Image from "next/image";

type Props = {
  output: string;
  copied: boolean;
  onCopy: () => void;
  generating: boolean;
  aiAvailable?: boolean;
  onGenerate: () => void;
  title?: string;
  ctaLabel?: string;
  placeholder?: string;
  // Refinement input (optional, shown when handler provided)
  refinementValue?: string;
  onRefinementChange?: (v: string) => void;
  refinementPlaceholder?: string;
  // Control when refinement area shows
  showRefinement?: boolean;
  // Regeneration progress and limiting
  regenCount?: number; // counts only regenerations
  regenLimit?: number; // total allowed regenerations
  disabled?: boolean; // disable action button
  // Edit in Editor action (optional)
  onEditInEditor?: () => void;
  editLabel?: string;
};

export default function OutputPane({
  output,
  copied,
  onCopy,
  generating,
  aiAvailable,
  onGenerate,
  title,
  ctaLabel,
  placeholder,
  refinementValue,
  onRefinementChange,
  refinementPlaceholder,
  showRefinement,
  regenCount,
  regenLimit,
  disabled,
  onEditInEditor,
  editLabel,
}: Props) {
  const displayTitle = title ?? "Generated prompt";
  const buttonLabel = generating ? "Generating..." : (ctaLabel ?? "Regenerate");
  const shouldShowRefinement = showRefinement && typeof onRefinementChange === "function";
  const showProgress = typeof regenCount === "number" && typeof regenLimit === "number" && regenCount! > 0;
  const progressDanger = showProgress && regenLimit != null && regenCount != null && regenCount >= (regenLimit - 1);
  const isDisabled = !!disabled || generating;
  const showEditButton = !!onEditInEditor && !!output?.trim();

  return (
    <section className="flex flex-col h-[720px] rounded-2xl overflow-hidden bg-[#031802] text-emerald-100 border border-[#A5A5A5]/20">
      <div className="flex items-center justify-between px-5 py-3">
        <div className="text-[18px] font-[500] font-sans not-italic flex items-center gap-2">
          <span>{displayTitle}</span>
          <span className="text-xs text-emerald-200/80">{aiAvailable ? "Using Chrome AI" : "Local builder"}</span>
        </div>
        <div className="inline-flex items-center gap-2">
          {showEditButton && (
            <button
              onClick={onEditInEditor}
              className={`text-[14px] px-3 py-1 rounded bg-white text-black border border-transparent inline-flex items-center gap-2 cursor-pointer`}
            >
              <span>{editLabel ?? "Edit in Editor"}</span>
              <Image src="/pencil.svg" alt="Edit icon" width={13} height={13} />
            </button>
          )}
          <button
            onClick={onCopy}
            className={`text-[14px] px-3 py-1 rounded bg-white text-black border border-transparent inline-flex items-center gap-2 cursor-pointer ${copied ? "opacity-70" : ""}`}
          >
            <span>{copied ? "Copied" : "Copy"}</span>
            <Image src="/copy.svg" alt="Copy icon" width={13} height={13} />
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-5 font-sans whitespace-pre-wrap relative">
        {output || placeholder || ""}
        {showProgress && (
          <div className={`absolute bottom-2 right-2 text-xs ${progressDanger ? "text-red-400" : "text-emerald-200/80"} bg-black/20 px-2 py-1 rounded`}>
            {regenCount}/{regenLimit}
          </div>
        )}
      </div>
      <div className="px-5 py-4 space-y-3">
        {shouldShowRefinement && (
          <div className="space-y-1">
            <label className="text-xs text-emerald-200/80">Additional instruction</label>
            <textarea
              value={refinementValue ?? ""}
              onChange={(e) => onRefinementChange?.(e.target.value)}
              placeholder={refinementPlaceholder ?? "e.g., make it shorter, add examples, formal tone"}
              className="w-full h-16 p-3 rounded bg-white/95 text-black outline-none resize-none"
            />
          </div>
        )}
        <button
          onClick={onGenerate}
          disabled={isDisabled}
          className={`w-full h-10 rounded font-medium text-black ${isDisabled ? "opacity-70 cursor-not-allowed" : "cursor-pointer"}`}
          style={{
            background:
              "linear-gradient(101.63deg, #15C90E -182.17%, #EBFFEA 113.13%)",
          }}
        >
          {buttonLabel}
        </button>
      </div>
    </section>
  );
}