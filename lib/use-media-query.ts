"use client";

import { useSyncExternalStore } from "react";

interface MediaQueryStore {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => boolean;
}

function createStore(query: string): MediaQueryStore {
  let mql: MediaQueryList | null = null;
  const listeners = new Set<() => void>();

  function getMql(): MediaQueryList | null {
    if (!mql && typeof window !== "undefined") {
      mql = window.matchMedia(query);
    }
    return mql;
  }

  function handleChange(): void {
    for (const listener of listeners) {
      listener();
    }
  }

  return {
    subscribe(listener) {
      const media = getMql();
      listeners.add(listener);
      media?.addEventListener("change", handleChange);

      return () => {
        listeners.delete(listener);
        media?.removeEventListener("change", handleChange);
      };
    },
    getSnapshot() {
      return getMql()?.matches ?? false;
    },
  };
}

const stores = new Map<string, MediaQueryStore>();

function getStore(query: string): MediaQueryStore {
  let store = stores.get(query);
  if (!store) {
    store = createStore(query);
    stores.set(query, store);
  }
  return store;
}

export function useMediaQuery(query: string): boolean {
  const store = getStore(query);
  return useSyncExternalStore(store.subscribe, store.getSnapshot, () => false);
}

export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 767px)");
}
