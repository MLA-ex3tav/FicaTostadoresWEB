import { useSyncExternalStore } from "react";

export const GUEST_NAME_STORAGE_KEY = "fica-guest-name";

const MAX_GUEST_NAME_LENGTH = 120;

let listeners: Array<() => void> = [];

function emitChange(): void {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void): () => void {
  listeners = [...listeners, listener];

  return () => {
    listeners = listeners.filter((entry) => entry !== listener);
  };
}

export function readGuestName(): string {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    return window.localStorage.getItem(GUEST_NAME_STORAGE_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

export function saveGuestName(name: string): void {
  if (typeof window === "undefined") {
    return;
  }

  const value = name.trim().slice(0, MAX_GUEST_NAME_LENGTH);

  try {
    if (value) {
      window.localStorage.setItem(GUEST_NAME_STORAGE_KEY, value);
    } else {
      window.localStorage.removeItem(GUEST_NAME_STORAGE_KEY);
    }
  } catch {
    return;
  }

  emitChange();
}

export function clearGuestName(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(GUEST_NAME_STORAGE_KEY);
  } catch {
    return;
  }

  emitChange();
}

export function useGuestName(): string {
  return useSyncExternalStore(subscribe, readGuestName, () => "");
}
