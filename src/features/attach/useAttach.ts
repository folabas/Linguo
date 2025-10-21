"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { parseFile } from "./parse";

export function useAttach(onAppend: (text: string) => void) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  function scheduleAutoClear() {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => setError(null), 2500);
  }

  const openPicker = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".txt,.pdf,.docx";
    input.style.display = "none";
    document.body.appendChild(input);

    input.onchange = async () => {
      const file = input.files?.[0];
      input.remove();
      if (!file) return;

      setError(null);
      const maxSizeBytes = 50 * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        setError("File too large. Please choose a file under 10MB.");
        scheduleAutoClear();
        return;
      }

      setLoading(true);
      try {
        const text = await parseFile(file);
        onAppend(text);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Failed to parse file.";
        setError(message);
        scheduleAutoClear();
      } finally {
        setLoading(false);
      }
    };

    input.click();
  }, [onAppend]);

  const clearError = useCallback(() => setError(null), []);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  return { openPicker, loading, error, clearError };
}