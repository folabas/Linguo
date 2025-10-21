/**
 * Minimal ambient module declaration for 'mammoth/mammoth.browser' to satisfy TypeScript.
 * The actual library provides more APIs; we declare only what's used.
 */
declare module 'mammoth/mammoth.browser' {
  type ExtractOptions = { arrayBuffer: ArrayBuffer };
  type ExtractResult = { value: string };

  export function extractRawText(options: ExtractOptions): Promise<ExtractResult>;

  const mammoth: {
    extractRawText: (options: ExtractOptions) => Promise<ExtractResult>;
    [key: string]: unknown;
  };

  export default mammoth;
}