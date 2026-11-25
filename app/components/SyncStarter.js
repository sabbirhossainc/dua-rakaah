"use client";

import { useEffect } from "react";
import { getRunner } from "@/lib/local/client";

// Starts the background sync once the page is in the browser. Renders nothing.
export default function SyncStarter() {
  useEffect(() => {
    if (typeof indexedDB === "undefined") return undefined;
    try {
      return getRunner().start();
    } catch (error) {
      console.error("Sync could not start:", error);
      return undefined;
    }
  }, []);
  return null;
}
