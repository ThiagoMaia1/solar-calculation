import { useRef, useState, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { saveAllData } from '../utils/api';
import { QUERY_KEY } from './useAppData';
import type { AppData, MonthData } from '../types';

type MonthsSnapshot = Record<string, MonthData>;

const MAX_HISTORY = 50;

/**
 * Undo / Redo for the months table.
 *
 * Call `pushState()` **before** every edit to capture the "before" snapshot.
 * Ctrl+Z / Ctrl+Shift+Z (or ⌘) trigger undo / redo automatically.
 */
export function useUndoRedo() {
  const qc = useQueryClient();

  // Use refs so callbacks never go stale; derive canUndo/canRedo via a counter.
  const undoRef = useRef<MonthsSnapshot[]>([]);
  const redoRef = useRef<MonthsSnapshot[]>([]);
  const [sizes, setSizes] = useState({ undo: 0, redo: 0 });

  const syncSizes = useCallback(() => {
    setSizes({ undo: undoRef.current.length, redo: redoRef.current.length });
  }, []);

  /** Snapshot current months before an edit */
  const pushState = useCallback(
    (months: MonthsSnapshot) => {
      undoRef.current = [...undoRef.current.slice(-MAX_HISTORY + 1), structuredClone(months)];
      redoRef.current = [];
      syncSizes();
    },
    [syncSizes],
  );

  /** Apply a months snapshot: optimistic cache update + background save */
  const applyMonths = useCallback(
    (months: MonthsSnapshot) => {
      const current = qc.getQueryData<AppData>(QUERY_KEY);
      if (!current) return;
      const next: AppData = { ...current, months };
      qc.setQueryData(QUERY_KEY, next);
      // Fire-and-forget save; on error the next invalidation will correct
      saveAllData(next).catch(() => qc.invalidateQueries({ queryKey: QUERY_KEY }));
    },
    [qc],
  );

  const undo = useCallback(() => {
    const stack = undoRef.current;
    if (stack.length === 0) return;

    const current = qc.getQueryData<AppData>(QUERY_KEY);
    if (!current) return;

    const prev = stack[stack.length - 1]!;
    undoRef.current = stack.slice(0, -1);
    redoRef.current = [...redoRef.current, structuredClone(current.months)];
    syncSizes();
    applyMonths(prev);
  }, [qc, applyMonths, syncSizes]);

  const redo = useCallback(() => {
    const stack = redoRef.current;
    if (stack.length === 0) return;

    const current = qc.getQueryData<AppData>(QUERY_KEY);
    if (!current) return;

    const next = stack[stack.length - 1]!;
    redoRef.current = stack.slice(0, -1);
    undoRef.current = [...undoRef.current, structuredClone(current.months)];
    syncSizes();
    applyMonths(next);
  }, [qc, applyMonths, syncSizes]);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod || e.key.toLowerCase() !== 'z') return;

      // Don't intercept when user is typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      e.preventDefault();
      if (e.shiftKey) {
        redo();
      } else {
        undo();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  return {
    pushState,
    undo,
    redo,
    canUndo: sizes.undo > 0,
    canRedo: sizes.redo > 0,
  };
}
