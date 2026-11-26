"use client";
// The page's one player, and React views of it (design D5, D7). The audio element is created at the first play, and
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

const SERVER_VIEW = Object.freeze({ state: "idle", provider: null, reciterName: null });

/** `{ state, provider, reciterName }` for the part `key`, whose `sources` are in the order they are tried. */
export function usePartAudio(key, sources) {
  const subscribe = useCallback((listener) => getPlayer().subscribe(listener), []);
  return useSyncExternalStore(subscribe, () => getPlayer().getView(key, sources), () => SERVER_VIEW);
}

export const toggleAudio = (key, sources) => getPlayer().toggle(key, sources);
export const stopAudio = (key) => player?.stop(key);
