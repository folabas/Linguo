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
}: Props) {
  const displayTitle = title ?? "Generated prompt";
  const buttonLabel = generating ? "Generating..." : (ctaLabel ?? "Regenerate");
  return (
    <section className="flex flex-col h-[720px] rounded-2xl overflow-hidden bg-[#031802] text-emerald-100 border border-[#A5A5A5]/20">
      <div className="flex items-center justify-between px-5 py-3">
        <div className="text-[18px] font-[500] font-sans not-italic flex items-center gap-2">
          <span>{displayTitle}</span>
          <span className="text-xs text-emerald-200/80">{aiAvailable ? "Using Chrome AI" : "Local builder"}</span>
        </div>
        <button
          onClick={onCopy}
          className={`text-[14px] px-3 py-1 rounded bg-white text-black border border-transparent inline-flex items-center gap-2 cursor-pointer ${copied ? "opacity-70" : ""}`}
        >
          <span>{copied ? "Copied" : "Copy"}</span>
          <Image src="/copy.svg" alt="Copy icon" width={13} height={13} />
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-5 font-sans whitespace-pre-wrap">
        {output || placeholder || ""}
      </div>
      <div className="px-5 py-4">
        <button
          onClick={onGenerate}
          className="w-full h-10 rounded font-medium text-black cursor-pointer"
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