'use client';

import { useCallback, useRef, useState } from 'react';

export type TextHistory = {
  present: string;
  canUndo: boolean;
  canRedo: boolean;
  past: string[];
  future: string[];
  set: (next: string) => void;
  undo: () => void;
  redo: () => void;
  clear: (initial?: string) => void;
  restorePast: (index: number) => void;
};

export function useTextHistory(initial: string = ''): TextHistory {
  const [present, setPresent] = useState<string>(initial);
  const pastRef = useRef<string[]>([]);
  const futureRef = useRef<string[]>([]);

  const set = useCallback((next: string) => {
    if (next === present) return;
    pastRef.current.push(present);
    setPresent(next);
    futureRef.current = [];
  }, [present]);

  const undo = useCallback(() => {
    const past = pastRef.current;
    if (past.length === 0) return;
    const prev = past[past.length - 1];
    pastRef.current = past.slice(0, past.length - 1);
    futureRef.current.unshift(present);
    setPresent(prev);
  }, [present]);

  const redo = useCallback(() => {
    const future = futureRef.current;
    if (future.length === 0) return;
    const next = future[0];
    futureRef.current = future.slice(1);
    pastRef.current.push(present);
    setPresent(next);
  }, [present]);

  const clear = useCallback((initialValue: string = '') => {
    pastRef.current = [];
    futureRef.current = [];
    setPresent(initialValue);
  }, []);

  const restorePast = useCallback((index: number) => {
    const past = pastRef.current;
    if (index < 0 || index >= past.length) return;
    const currentPresent = present;
    const selected = past[index];
    // Past becomes everything before the selected entry
    pastRef.current = past.slice(0, index);
    // Future becomes the entries after selected, then the old present, then existing future
    futureRef.current = [
      ...past.slice(index + 1),
      currentPresent,
      ...futureRef.current,
    ];
    setPresent(selected);
  }, [present]);

  const canUndo = pastRef.current.length > 0;
  const canRedo = futureRef.current.length > 0;

  return {
    present,
    canUndo,
    canRedo,
    past: pastRef.current,
    future: futureRef.current,
    set,
    undo,
    redo,
    clear,
    restorePast,
  };
}