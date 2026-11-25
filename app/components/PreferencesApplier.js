"use client";
// Applies the reader's settings to the page and keeps the first-paint copy in step (design D5).
// It acts only once the local store has been read: before that the values are defaults, and applying them would undo
// what the inline script in <head> already set from the saved copy.
import { useEffect } from "react";
import { usePreferences } from "@/lib/local/preferences-store";
import { PREFS_COPY_KEY, applyPreferences, prefsCopyText } from "@/lib/preferences";

export default function PreferencesApplier() {
  const { ready, values } = usePreferences();
  useEffect(() => {
    if (!ready) return;
    applyPreferences(values, document.documentElement);
    try {
      localStorage.setItem(PREFS_COPY_KEY, prefsCopyText(values));
    } catch {
      // Blocked or full storage: the copy is only a cache.
    }
  }, [ready, values]);
  return null;
}
