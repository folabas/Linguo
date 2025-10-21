"use client";

import { useMemo, useRef, useState } from "react";
import Header from "@/components/Header";
import EditorPane from "@/components/EditorPane";
import OutputPane from "@/components/OutputPane";
import { useChromeAI } from "@/features/ai/useChromeAI";
import { useTextHistory } from "@/features/editor/useTextHistory";

function buildRewritePrompt(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return "";
  return `You are a high-quality rewriting assistant. Improve the user's text while preserving meaning. Produce three alternative rewrites with clear improvements.\n\nGuidelines:\n- Improve clarity, flow, and tone.\n- Remove redundancy and awkward phrasing.\n- Keep key facts intact.\n- Offer varied style across options (e.g., concise, conversational, professional).\n\nFormat:\nOption 1:\n<rewrite>\n\nOption 2:\n<rewrite>\n\nOption 3:\n<rewrite>\n\nOriginal:\n${trimmed}`;
}

// Detect Rewriter provider on current or legacy surfaces
function getRewriterProvider(): RewriterProvider | null {
  const g = globalThis as unknown as { Rewriter?: RewriterProvider; ai?: { rewriter?: RewriterProvider } };
  return g.Rewriter ?? g.ai?.rewriter ?? null;
}

export default function RewriterPage() {
  const history = useTextHistory("");
  const text = history.present;
  const words = useMemo(() => (text.trim() ? text.trim().split(/\s+/).length : 0), [text]);
  const chars = text.length;

  const [output, setOutput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const ai = useChromeAI(
    "You help users improve their writing with clear, trustworthy rewrites and varied stylistic options."
  );

  const rewriterRef = useRef<RewriterSession | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const aiAvailableFlag = !!getRewriterProvider() || ai.available;

  async function rewrite() {
    setGenerating(true);
    setOutput("");

    const trimmed = text.trim();
    if (!trimmed) {
      const base = text || "Your text here.";
      setOutput(
        `Option 1:\n${base}\n\n` +
          `Option 2:\n${base.replace(/\bvery\b/gi, "quite")}\n\n` +
          `Option 3:\n${base.replace(/\breally\b/gi, "truly")}`
      );
      setGenerating(false);
      return;
    }

    const provider = getRewriterProvider();

    // Preferred: dedicated Rewriter API
    if (provider) {
      try {
        // Abort any previous operation
        controllerRef.current?.abort();
        controllerRef.current = new AbortController();

        if (!rewriterRef.current) {
          rewriterRef.current = await provider.create({
            sharedContext: "Rewrite user drafts for clarity and impact while preserving meaning.",
            signal: controllerRef.current.signal,
            monitor: (m: EventTarget) => {
              try {
                m.addEventListener("downloadprogress", () => {
                });
              } catch {
              }
            },
          });
        }

        // Prefer streaming for progressive UX; fall back to non-streaming when necessary
        try {
          const stream = rewriterRef.current.rewriteStreaming(trimmed, { signal: controllerRef.current.signal });
          const reader = stream.getReader();
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            setOutput((prev) => prev + value);
          }
        } catch {
          // Fall back to non-streaming rewrite on error
          const result = await rewriterRef.current.rewrite(trimmed, { signal: controllerRef.current.signal });
          setOutput(result.trim());
        }
        setGenerating(false);
        return;
      } catch (err) {
        console.warn("Rewriter API failed; falling back to Prompt API", err);
      }
    }

    // Fallback: Prompt API
    const prompt = buildRewritePrompt(trimmed);
    if (ai.available) {
      const result = await ai.generate(prompt);
      if (result.ok) {
        setOutput(result.text.trim());
      } else {
        const base = text || "Your text here.";
        setOutput(
          `Option 1:\n${base}\n\n` +
            `Option 2:\n${base.replace(/\bvery\b/gi, "quite")}\n\n` +
            `Option 3:\n${base.replace(/\breally\b/gi, "truly")}`
        );
      }
      setGenerating(false);
      return;
    }

    // Final local fallback
    const base = text || "Your text here.";
    setOutput(
      `Option 1:\n${base}\n\n` +
        `Option 2:\n${base.replace(/\bvery\b/gi, "quite")}\n\n` +
        `Option 3:\n${base.replace(/\breally\b/gi, "truly")}`
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
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Header />

      <main className="px-8 pb-16">
        <h1 className="text-2xl font-semibold mb-4">Improve content with alternative options</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
            placeholder="Paste text to rewrite..."
          />

          <OutputPane
            output={output}
            copied={copied}
            onCopy={copyOutput}
            generating={generating}
            onGenerate={rewrite}
            aiAvailable={aiAvailableFlag}
            title="Rewrite Options"
            ctaLabel="Rewrite"
            placeholder="Rewrites will appear here..."
          />
        </div>

        <div className="mt-4 text-xs text-right text-black/70 dark:text-white/70">English (US)</div>
      </main>
    </div>
  );
}