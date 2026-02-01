import { useState, useCallback, useRef } from 'react';

interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

export function useHistory<T>(initialPresent: T) {
  const [history, setHistory] = useState<HistoryState<T>>({
    past: [],
    present: initialPresent,
    future: [],
  });

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  const undo = useCallback(() => {
    setHistory((curr) => {
      if (curr.past.length === 0) return curr;

      const previous = curr.past[curr.past.length - 1];
      const newPast = curr.past.slice(0, curr.past.length - 1);

      return {
        past: newPast,
        present: previous,
        future: [curr.present, ...curr.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((curr) => {
      if (curr.future.length === 0) return curr;

      const next = curr.future[0];
      const newFuture = curr.future.slice(1);

      return {
        past: [...curr.past, curr.present],
        present: next,
        future: newFuture,
      };
    });
  }, []);

  const set = useCallback((valueOrFn: T | ((prev: T) => T), addToHistory: boolean = true) => {
    setHistory((curr) => {
      // Resolve value if it's a function update
      const newPresent = valueOrFn instanceof Function ? (valueOrFn as (prev: T) => T)(curr.present) : valueOrFn;
      
      if (curr.present === newPresent) return curr;

      if (!addToHistory) {
          // Just update present, don't touch history queues
          return {
              ...curr,
              present: newPresent
          };
      }

      return {
        past: [...curr.past, curr.present],
        present: newPresent,
        future: [], // Clear future on new change
      };
    });
  }, []);
  
  // Clear history (e.g. on new load)
  const clearHistory = useCallback((newPresent: T) => {
      setHistory({
          past: [],
          present: newPresent,
          future: []
      });
  }, []);

  return {
    state: history.present,
    set,
    undo,
    redo,
    canUndo,
    canRedo,
    history, 
    clearHistory
  };
}
