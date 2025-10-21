/**
 * Minimal ambient types for Chrome's Built-in AI APIs.
 * Provides typing for LanguageModel (Prompt API), Summarizer, and Translation/LanguageDetector.
 */
export {};

declare global {
  // Prompt API (LanguageModel)
  type LanguageModelSession = {
    prompt: (input: string, options?: { maxOutputTokens?: number }) => Promise<string>;
  };

  type LanguageModel = {
    create: (options?: { systemPrompt?: string }) => Promise<LanguageModelSession>;
  };

  // New global API: LanguageModel (Chrome M130+)
  const LanguageModel: LanguageModel & {
    availability: () => Promise<'no' | 'readily' | 'downloadable'>;
  };

  // Legacy API: window.ai.languageModel
  interface Window {
    ai?: {
      languageModel?: LanguageModel;
      summarizer?: Summarizer; // potential legacy surface for Summarizer
      translation?: Translation; // potential legacy surface for Translation
      languageDetector?: LanguageDetector; // potential legacy surface for LanguageDetector
    };
  }

  // Summarizer API
  type DownloadProgressEvent = Event & { readonly loaded: number };

  type SummarizerSession = {
    summarize: (input: string, options?: { context?: string }) => Promise<string>;
    ready: Promise<void>;
    destroy: () => void;
    addEventListener: (type: 'downloadprogress', listener: (e: DownloadProgressEvent) => void) => void;
    removeEventListener: (type: 'downloadprogress', listener: (e: DownloadProgressEvent) => void) => void;
  };

  type Summarizer = {
    availability: () => Promise<'unavailable' | 'available' | 'downloadable'>;
    create: (options?: { sharedContext?: string; type?: string; format?: string; length?: string }) => Promise<SummarizerSession>;
  };

  const Summarizer: Summarizer;

  // Translation / LanguageDetector API (current implementation surface)
  type TranslationAvailability = 'readily' | 'after-download' | 'no';

  type LanguageDetectionResult = {
    detectedLanguage: string | null;
    confidence: number;
  };

  type LanguageDetector = EventTarget & {
    ready: Promise<void>;
    detect: (input: string) => Promise<LanguageDetectionResult[]>;
  };

  type LanguageDetectorCreateOptions = {
    monitor?: (m: EventTarget) => void;
  };

  type Translation = {
    canDetect: () => Promise<TranslationAvailability>;
    createDetector: (options?: LanguageDetectorCreateOptions) => Promise<LanguageDetector>;
  };

  const Translation: Translation;

  // Alternate surface used by early builds (mirroring sample code):
  type LanguageDetectorProvider = {
    availability: () => Promise<TranslationAvailability>;
    create: (options?: LanguageDetectorCreateOptions) => Promise<LanguageDetector>;
  };

  const LanguageDetector: LanguageDetectorProvider;

  // Proofreader API
  type ProofreadCorrection = {
    startIndex?: number;
    endIndex?: number;
    replacement?: string;
    type?: string;
    explanation?: string;
  };

  type ProofreadResult = {
    corrected: string;
    corrections: ProofreadCorrection[] | null;
  };

  type Proofreader = {
    proofread: (input: string) => Promise<ProofreadResult>;
    ready?: Promise<void>;
  };

  type ProofreaderCreateOptions = {
    includeCorrectionTypes?: boolean;
    includeCorrectionExplanation?: boolean;
    expectedInputLanguages?: string[];
    monitor?: (m: EventTarget) => void;
    signal?: AbortSignal;
  };

  type ProofreaderProvider = {
    availability: (options?: { includeCorrectionTypes?: boolean; expectedInputLanguages?: string[] }) => Promise<string>;
    create: (options?: ProofreaderCreateOptions) => Promise<Proofreader>;
  };

  const Proofreader: ProofreaderProvider;

  interface Window {
    ai?: Window['ai'] & {
      proofreader?: ProofreaderProvider;
    };
  }

  // Writer API
  type WriterTone = "formal" | "neutral" | "casual";
  type WriterFormat = "plain-text" | "markdown";
  type WriterLength = "short" | "medium" | "long";

  type WriterCreateCoreOptions = {
    tone?: WriterTone;
    format?: WriterFormat;
    length?: WriterLength;
    expectedInputLanguages?: string[];
    expectedContextLanguages?: string[];
    outputLanguage?: string;
  };

  type WriterCreateOptions = WriterCreateCoreOptions & {
    signal?: AbortSignal;
    monitor?: (m: EventTarget) => void;
    sharedContext?: string;
  };

  type WriterWriteOptions = {
    context?: string;
    signal?: AbortSignal;
  };

  type WriterSession = {
    write: (input: string, options?: WriterWriteOptions) => Promise<string>;
    writeStreaming: (input: string, options?: WriterWriteOptions) => ReadableStream<string>;
    destroy: () => void;
    ready?: Promise<void>;
    sharedContext?: string;
    tone?: WriterTone;
    format?: WriterFormat;
    length?: WriterLength;
    expectedInputLanguages?: ReadonlyArray<string> | null;
    expectedContextLanguages?: ReadonlyArray<string> | null;
    outputLanguage?: string | null;
  };

  type WriterProvider = {
    availability: (options?: WriterCreateCoreOptions) => Promise<'no' | 'readily' | 'downloadable' | 'available' | 'after-download'> | Promise<string>;
    create: (options?: WriterCreateOptions) => Promise<WriterSession>;
  };

  const Writer: WriterProvider;

  interface Window {
    ai?: Window['ai'] & {
      writer?: WriterProvider;
    };
  }

  // Rewriter API
  type RewriterTone = "formal" | "neutral" | "casual";
  type RewriterFormat = "plain-text" | "markdown";
  type RewriterLength = "short" | "medium" | "long";

  type RewriterCreateOptions = {
    signal?: AbortSignal;
    monitor?: (m: EventTarget) => void;
    sharedContext?: string;
    tone?: RewriterTone;
    format?: RewriterFormat;
    length?: RewriterLength;
  };

  type RewriterWriteOptions = {
    context?: string;
    signal?: AbortSignal;
  };

  type RewriterSession = {
    rewrite: (input: string, options?: RewriterWriteOptions) => Promise<string>;
    rewriteStreaming: (input: string, options?: RewriterWriteOptions) => ReadableStream<string>;
    destroy: () => void;
    ready?: Promise<void>;
    sharedContext?: string;
    tone?: RewriterTone;
    format?: RewriterFormat;
    length?: RewriterLength;
  };

  type RewriterProvider = {
    availability: () => Promise<'no' | 'readily' | 'downloadable' | 'available' | 'after-download'> | Promise<string>;
    create: (options?: RewriterCreateOptions) => Promise<RewriterSession>;
  };

  const Rewriter: RewriterProvider;

  interface Window {
    ai?: Window['ai'] & {
      rewriter?: RewriterProvider;
    };
  }
}