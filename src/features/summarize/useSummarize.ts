import { useMemo, useState } from "react";
import { useTextHistory } from "@/features/editor/useTextHistory";
import { useChromeAI } from "@/features/ai/useChromeAI";

// Types inferred from page usage
export type SummarizerSession = {
  ready?: Promise<void>;
  summarize: (input: string, options?: { context?: string }) => Promise<string>;
  destroy?: () => void;
};

export type SummarizerProvider = {
  availability?: () => Promise<'unavailable' | 'available' | 'downloadable'>;
  create: (options?: { sharedContext?: string; type?: string; format?: string; length?: string }) => Promise<SummarizerSession>;
};

function getSummarizer(): SummarizerProvider | null {
  const g = globalThis as { Summarizer?: SummarizerProvider };
  if (g.Summarizer?.create) return g.Summarizer;
  if (typeof window !== 'undefined' && (window as unknown as { ai?: { summarizer?: SummarizerProvider } }).ai?.summarizer?.create) {
    return (window as unknown as { ai?: { summarizer?: SummarizerProvider } }).ai!.summarizer!;
  }
  return null;
}

function buildSummarizePrompt(t: string, instruction?: string) {
  if (!t.trim()) return "";
  const refineBlock = instruction?.trim() ? `\n\nRefinement:\n${instruction.trim()}` : "";
  return `Task: Summarize the following text.\n\nInstructions:\n- Capture main ideas and key details.\n- Be concise and clear.\n- Do not include commentary.${refineBlock}\n\nInput:\n${t}`;
}

export function useSummarize() {
  const history = useTextHistory("");
  const text = history.present;
  const words = useMemo(() => (text.trim() ? text.trim().split(/\s+/).length : 0), [text]);
  const chars = text.length;

  const [output, setOutput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const chromeAI = useChromeAI(
    "You are a precise summarization assistant. Provide a concise, clear summary capturing key points and structure. Return only the summary without commentary."
  );

  async function summarize(instruction?: string) {
    setGenerating(true);

    const summarizerProvider = getSummarizer();
    if (summarizerProvider && text.trim()) {
      try {
        const status = (await summarizerProvider.availability?.()) ?? 'available';
        const options = {
          sharedContext: 'This is a scientific article',
          type: 'key-points',
          format: 'markdown',
          length: 'medium',
        };
        const summarizer = await summarizerProvider.create(options);
        if (status === 'downloadable' && summarizer.ready) {
          await summarizer.ready;
        }
        const result = await summarizer.summarize(text, {
          context: instruction?.trim() ? instruction.trim() : 'This article is intended for a tech-savvy audience.',
        });
        setOutput(result.trim());
        summarizer.destroy?.();
        setGenerating(false);
        return;
      } catch {
        // Fall through to Prompt API fallback
      }
    }

    const prompt = buildSummarizePrompt(text, instruction);
    if (chromeAI.available) {
      const result = await chromeAI.generate(prompt);
      if (result.ok) {
        setOutput(result.text.trim());
      } else {
        setOutput(text);
      }
      setGenerating(false);
    } else {
      setOutput(text);
      setGenerating(false);
    }
  }

  async function copyOutput() {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  }

  const aiAvailableFlag = !!getSummarizer() || chromeAI.available;

  return {
    text,
    words,
    chars,
    history,
    output,
    generating,
    copied,
    summarize,
    copyOutput,
    aiAvailableFlag,
  } as const;
}