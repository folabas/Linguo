"use client";

import { useMemo, useRef, useState } from "react";
import Header from "@/components/Header";
import EditorPane from "@/components/EditorPane";
import OutputPane from "@/components/OutputPane";
import { useChromeAI } from "@/features/ai/useChromeAI";
import { useTextHistory } from "@/features/editor/useTextHistory";

function buildWriterPrompt(topic: string) {
  const trimmed = topic.trim();
  if (!trimmed) return "";
  return `You are a creative writing assistant. Write original, engaging text based on the user's idea or brief.\n\nRequirements:\n- Be clear, vivid, and compelling.\n- Maintain a cohesive structure (intro, development, conclusion).\n- Aim for 3–5 short paragraphs unless the brief specifies otherwise.\n- Use accessible language without clichés.\n\nUser brief:\n${trimmed}`;
}

// Detect Writer provider on current or legacy surfaces
function getWriterProvider(): WriterProvider | null {
  const g = globalThis as unknown as { Writer?: WriterProvider; ai?: { writer?: WriterProvider } };
  return g.Writer ?? g.ai?.writer ?? null;
}

export default function WriterPage() {
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
      // Simple local template for empty input
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

    // Preferred: dedicated Writer API
    if (provider) {
      try {
        // Abort any previous operation
        controllerRef.current?.abort();
        controllerRef.current = new AbortController();

        if (!writerRef.current) {
          // Create with defaults; allow model download monitoring if surface supports it
          writerRef.current = await provider.create({
            tone: "neutral",
            format: "markdown",
            length: "medium",
            sharedContext: "Assist with clear, engaging drafts suitable for general audiences.",
            signal: controllerRef.current.signal,
            monitor: (m: EventTarget) => {
              try {
                m.addEventListener("downloadprogress", () => {
                  // no-op
                });
              } catch {
                // noop
              }
            },
          });
        }

        // Prefer streaming for progressive UX; fall back to non-streaming when necessary
        try {
          const stream = writerRef.current.writeStreaming(trimmed, { signal: controllerRef.current.signal });
          const reader = stream.getReader();
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            setOutput((prev) => prev + value);
          }
        } catch {
          // Fall back to non-streaming write on error
          const result = await writerRef.current.write(trimmed, { signal: controllerRef.current.signal });
          setOutput(result.trim());
        }

        setGenerating(false);
        return;
      } catch (err) {
        // Fall through to Prompt API fallback
        console.warn("Writer API failed; falling back to Prompt API", err);
      }
    }

    // Fallback: Prompt API (LanguageModel)
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

    // Final local fallback
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
    } catch {
      // noop
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Header />

      <main className="px-8 pb-16">
        <h1 className="text-2xl font-semibold mb-4">Create original &amp; engaging text</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: editor */}
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
            placeholder="Describe your idea, brief, or theme..."
          />

          {/* Right: output */}
          <OutputPane
            output={output}
            copied={copied}
            onCopy={copyOutput}
            generating={generating}
            onGenerate={write}
            aiAvailable={aiAvailableFlag}
            title="Draft"
            ctaLabel="Write"
            placeholder="Draft will appear here..."
          />
        </div>

        <div className="mt-4 text-xs text-right text-black/70 dark:text-white/70">English (US)</div>
      </main>
    </div>
  );
}