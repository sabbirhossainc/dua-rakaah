"use client";
// The page's one player, and React views of it (design D5). The audio element is created at the first play, and
// nothing is requested before that.
import { useCallback, useSyncExternalStore } from "react";
import { createPlayer } from "./player.js";

let player = null;

// Made in the browser only, the first time a control subscribes. It listens for the connection for the whole visit.
function getPlayer() {
  if (!player) {
    player = createPlayer({ createElement: () => new Audio(), isOnline: () => navigator.onLine });
    window.addEventListener("online", () => player.connectionChanged(true));
    window.addEventListener("offline", () => player.connectionChanged(false));
  }
  return player;
}

function subscribeOnline(listener) {
  window.addEventListener("online", listener);
  window.addEventListener("offline", listener);
  return () => {
    window.removeEventListener("online", listener);
    window.removeEventListener("offline", listener);
  };
}

/** False on the server, so server HTML (and so every saved page) has no audio control. */
export const useOnline = () => useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => false);

/** "idle", "loading", "playing", "paused" or "unavailable" for the part `key`. */
export function usePartAudio(key) {
  const subscribe = useCallback((listener) => getPlayer().subscribe(listener), []);
  return useSyncExternalStore(subscribe, () => getPlayer().getState(key), () => "idle");
}

export const toggleAudio = (key, urls) => getPlayer().toggle(key, urls);
export const stopAudio = (key) => player?.stop(key);
