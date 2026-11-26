// The state of every recitation control on a page, and the one audio element behind them (design D5).
// The element, the clock and the connection are passed in, so this runs under `node --test`.
//
// A part is "idle", "loading", "playing", "paused" or "unavailable". At most one part is "active" (has the element).
// Each try of one address is an "attempt" with its own number, so that anything arriving late from an earlier one
// is ignored.

export const START_TIMEOUT_MS = 15_000;

/**
 * @param {object} deps
 * @param {() => HTMLAudioElement} deps.createElement  Called once, at the first play.
 * @param {() => boolean} deps.isOnline
 * @param {(fn: () => void, ms: number) => unknown} [deps.setTimer]
 * @param {(id: unknown) => void} [deps.clearTimer]
 */
export function createPlayer({ createElement, isOnline, setTimer = setTimeout, clearTimer = clearTimeout }) {
  const states = new Map(); // key -> state; absent means "idle"
  const failed = new Set(); // addresses that failed during this visit
  const listeners = new Set();
  let element = null;
  /** `{ key, urls, url, id, started, timer, handlers }` for the part that has the element, or null. */
  let active = null;
  let attempts = 0;

  const getState = (key) => states.get(key) ?? "idle";

  function setState(key, state) {
    if (getState(key) === state) return;
    if (state === "idle") states.delete(key);
    else states.set(key, state);
    for (const listener of listeners) listener();
  }

  const isCurrent = (id) => active !== null && active.id === id;

  function clearStartTimer() {
    if (active?.timer === undefined) return;
    clearTimer(active.timer);
    active.timer = undefined;
  }

  /** Takes the element away from the active part and stops any download. Does not change the part's state. */
  function release() {
    if (!active) return;
    clearStartTimer();
    for (const [type, handler] of Object.entries(active.handlers)) element.removeEventListener(type, handler);
    active = null;
    element.pause();
    element.removeAttribute("src");
    element.load();
  }

  /** Releases the active part and leaves it in `state`. */
  function finish(state = "idle") {
    if (!active) return;
    const { key } = active;
    release();
    setState(key, state);
  }

  /** Calls `play()` on the element and deals with a refusal. `fallback` is the state to show if the browser says no. */
  function callPlay(id, fallback) {
    element.play()?.catch((error) => {
      if (!isCurrent(id)) return;
      if (error?.name === "NotSupportedError") fail(id);
      else if (error?.name === "NotAllowedError") {
        // The browser wants another action by the reader. Nothing is wrong with the recording.
        if (fallback === "idle") finish();
        else setState(active.key, fallback);
      }
      // "AbortError" follows our own pause or stop. Anything else is left to the error event or the start timer.
    });
  }

  function fail(id) {
    if (!isCurrent(id)) return;
    const { key, urls, url } = active;
    // A dropped connection says nothing about the recording.
    if (!isOnline()) return finish();
    failed.add(url);
    // A recording that breaks while paused is not a reason to start playing another.
    const wasPaused = getState(key) === "paused";
    release();
    if (wasPaused) setState(key, "idle");
    else start(key, urls);
  }

  /** Plays the first address of `urls` that has not failed, or marks the part unavailable. */
  function start(key, urls) {
    const url = urls.find((u) => !failed.has(u));
    if (!url) return setState(key, "unavailable");
    element ??= createElement();
    const id = ++attempts;
    const handlers = {
      playing: () => {
        if (!isCurrent(id)) return;
        active.started = true;
        clearStartTimer();
        setState(key, "playing");
      },
      waiting: () => {
        if (isCurrent(id) && getState(key) === "playing") setState(key, "loading");
      },
      // A pause from outside the page, such as a media key. At the end of a file "ended" follows instead.
      pause: () => {
        if (isCurrent(id) && getState(key) === "playing" && element.paused && !element.ended) setState(key, "paused");
      },
      ended: () => {
        if (isCurrent(id)) finish();
      },
      error: () => fail(id),
    };
    active = { key, urls, url, id, started: false, timer: undefined, handlers };
    element.src = url;
    for (const [type, handler] of Object.entries(handlers)) element.addEventListener(type, handler);
    setState(key, "loading");
    active.timer = setTimer(() => fail(id), START_TIMEOUT_MS);
    callPlay(id, "idle");
  }

  return {
    getState,

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    /** What the part's control does when pressed. */
    toggle(key, urls) {
      const state = getState(key);
      if (state === "unavailable" || !isOnline()) return;
      if (active?.key !== key) {
        finish(); // one at a time
        return start(key, urls);
      }
      if (state === "paused") {
        setState(key, "loading");
        return callPlay(active.id, "paused");
      }
      // Still waiting for the first sound: cancel. After that: pause and keep the position.
      if (!active.started) return finish();
      setState(key, "paused");
      element.pause();
    },

    /** Stops the part if it has the element. For a control that leaves the page. */
    stop(key) {
      if (active?.key === key) finish();
    },

    connectionChanged(online) {
      if (!online) return finish();
      // Failures on a poor connection are not held against a recording once the connection is back.
      failed.clear();
      for (const [key, state] of [...states]) if (state === "unavailable") setState(key, "idle");
    },
  };
}
