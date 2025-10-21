'use client';

import { useRef } from 'react';

export type GenerateResult = { ok: true; text: string } | { ok: false; error: string };

// Unified provider type for both global LanguageModel and legacy window.ai.languageModel
// availability() is present on new builds and absent on legacy ones
type ChromeAIProvider = {
  create: (options?: { systemPrompt?: string }) => Promise<LanguageModelSession>;
  availability?: () => Promise<'no' | 'readily' | 'downloadable'>;
};

export function useChromeAI(defaultSystemPrompt?: string) {
  const sessionPromiseRef = useRef<Promise<LanguageModelSession> | null>(null);

  // Prefer new global LanguageModel API; fallback to window.ai.languageModel for older builds
  const available =
    typeof window !== 'undefined' && (
      'LanguageModel' in globalThis || !!window.ai?.languageModel
    );

  function getProvider(): ChromeAIProvider | null {
    const g = globalThis as { LanguageModel?: ChromeAIProvider };
    if (g.LanguageModel?.create) return g.LanguageModel;
    if (typeof window !== 'undefined' && window.ai?.languageModel?.create) return window.ai.languageModel!;
    return null;
  }

  async function getSession(systemPrompt?: string): Promise<LanguageModelSession> {
    if (!sessionPromiseRef.current) {
      const provider = getProvider();
      if (!provider) throw new Error('Chrome on-device AI not available');

      // Optional: pre-check availability on new builds
      if (provider.availability) {
        try {
          const availability = await provider.availability();
          console.log('Model availability:', availability);
        } catch {
          // ignore availability errors
        }
      }

      // Create and cache a single session lazily on first use.
      sessionPromiseRef.current = provider.create({
        systemPrompt: systemPrompt ?? defaultSystemPrompt,
      });
    }
    return sessionPromiseRef.current;
  }

  async function generate(input: string, options?: { systemPrompt?: string }): Promise<GenerateResult> {
    if (!available) {
      return { ok: false, error: 'Chrome on-device AI not available' } as const;
    }
    try {
      const session = await getSession(options?.systemPrompt);
      const text = await session.prompt(input);
      return { ok: true, text } as const;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate with Chrome AI';
      return { ok: false, error: message } as const;
    }
  }

  return { available, generate };
}