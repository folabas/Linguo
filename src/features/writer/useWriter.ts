import { useMemo, useRef, useState } from "react";
import { useTextHistory } from "@/features/editor/useTextHistory";
import { useChromeAI } from "@/features/ai/useChromeAI";

export type WriterSession = {
  write: (input: string, options?: { signal?: AbortSignal }) => Promise<string>;
  writeStreaming: (input: string, options?: { signal?: AbortSignal }) => ReadableStream<string>;
};

export type WriterProvider = {
  create: (options?: { tone?: string; format?: string; length?: string; sharedContext?: string; signal?: AbortSignal; monitor?: (m: EventTarget) => void }) => Promise<WriterSession>;
};

function getWriterProvider(): WriterProvider | null {
  const g = globalThis as unknown as { Writer?: WriterProvider; ai?: { writer?: WriterProvider } };
  return g.Writer ?? g.ai?.writer ?? null;
}

function buildWriterPrompt(topic: string) {
  const trimmed = topic.trim();
  if (!trimmed) return "";
  return `You are a creative writing assistant. Write original, engaging text based on the user's idea or brief.\n\nRequirements:\n- Be clear, vivid, and compelling.\n- Maintain a cohesive structure (intro, development, conclusion).\n- Aim for 3–5 short paragraphs unless the brief specifies otherwise.\n- Use accessible language without clichés.\n\nUser brief:\n${trimmed}`;
}

export function useWriter() {
  const history = useTextHistory("");
  const text = history.present;
  const words = useMemo(() => (text.trim() ? text.trim().split(/\s+/).length : 0), [text]);
  const chars = text.length;

  const [output, setOutput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const ai = useChromeAI(
    "You help users craft original, engaging prose, staying faithful to their brief while improving clarity and impact."
  );

  const writerRef = useRef<WriterSession | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const aiAvailableFlag = !!getWriterProvider() || ai.available;

  async function write() {
    setGenerating(true);
    setOutput("");

    const trimmed = text.trim();
    if (!trimmed) {
      setOutput(
        `Title: ${text.slice(0, 60) || "Untitled"}\n\n` +
          `Here’s a concise, engaging draft based on your brief.\n\n` +
          `Intro: Set the scene and hook the reader.\n` +
          `Body: Develop the idea with concrete details.\n` +
          `Conclusion: Leave a memorable takeaway or call-to-action.`
      );
      setGenerating(false);
      return;
    }

    const provider = getWriterProvider();
    if (provider) {
      try {
        controllerRef.current?.abort();
        controllerRef.current = new AbortController();

        if (!writerRef.current) {
          writerRef.current = await provider.create({
            tone: "neutral",
            format: "markdown",
            length: "medium",
            sharedContext: "Assist with clear, engaging drafts suitable for general audiences.",
            signal: controllerRef.current.signal,
            monitor: (m: EventTarget) => {
              try { m.addEventListener("downloadprogress", () => {}); } catch {}
            },
          });
        }

        try {
          const stream = writerRef.current.writeStreaming(trimmed, { signal: controllerRef.current.signal });
          const reader = stream.getReader();
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            setOutput((prev) => prev + value);
          }
        } catch {
          const result = await writerRef.current.write(trimmed, { signal: controllerRef.current.signal });
          setOutput(result.trim());
        }
        setGenerating(false);
        return;
      } catch (err) {
        console.warn("Writer API failed; falling back to Prompt API", err);
      }
    }

    const prompt = buildWriterPrompt(trimmed);
    if (ai.available) {
      const result = await ai.generate(prompt);
      if (result.ok) {
        setOutput(result.text.trim());
      } else {
        setOutput(
          `Title: ${text.slice(0, 60) || "Untitled"}\n\n` +
            `Here’s a concise, engaging draft based on your brief.\n\n` +
            `Intro: Set the scene and hook the reader.\n` +
            `Body: Develop the idea with concrete details.\n` +
            `Conclusion: Leave a memorable takeaway or call-to-action.`
        );
      }
      setGenerating(false);
      return;
    }

    setOutput(
      `Title: ${text.slice(0, 60) || "Untitled"}\n\n` +
        `Here’s a concise, engaging draft based on your brief.\n\n` +
        `Intro: Set the scene and hook the reader.\n` +
        `Body: Develop the idea with concrete details.\n` +
        `Conclusion: Leave a memorable takeaway or call-to-action.`
    );
    setGenerating(false);
  }

  async function copyOutput() {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  }

  return {
    text,
    words,
    chars,
    history,
    output,
    generating,
    copied,
    write,
    copyOutput,
    aiAvailableFlag,
  } as const;
}