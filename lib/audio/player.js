// The state of every recitation control on a page, and the one audio element behind them (design D5 of 4a, D7 of 4b).
// The element, the clock and the connection are passed in, so this runs under `node --test`.
//
// A part has an ordered list of sources, tried one after another. A source is a playlist: one recording, or the verses
// of a Quran.com recitation, whose addresses are asked for at the first press:
//   { id, provider, urls }
//   { id, provider, resolve: () => Promise<{ urls, reciter: { id, name } }> }
// `id` names what failed or was answered: the address, or the part and reciter.
//
// A part is "idle", "loading", "playing", "paused" or "unavailable". At most one part is "active" (has the element).
// Each file is loaded under its own "attempt" number, so that anything arriving late from an earlier one is ignored.

export const START_TIMEOUT_MS = 15_000;
/** How long an answer is reused, so that pressing again starts at once. The server's own copy lasts a day. */
export const KEEP_ANSWER_MS = 60 * 60 * 1000;

/**
 * @param {object} deps
 * @param {() => HTMLAudioElement} deps.createElement  Called once, at the first play.
 * @param {() => boolean} deps.isOnline
 * @param {() => number} [deps.now]
 * @param {(fn: () => void, ms: number) => unknown} [deps.setTimer]
 * @param {(id: unknown) => void} [deps.clearTimer]
 */
export function createPlayer({ createElement, isOnline, now = Date.now, setTimer = setTimeout, clearTimer = clearTimeout }) {
  const states = new Map(); // key -> "loading" | "playing" | "paused"; absent means "idle"
  const failed = new Set(); // source ids that failed during this visit
  const answers = new Map(); // source id -> { answer, until }
  const views = new Map(); // key -> the last view given out, reused while nothing changes
  const listeners = new Set();
  let element = null;
  /**
   * The part that has the element, or null:
   * `{ key, sources, source, answer, urls, index, id, started, heard, timer, handlers }`.
   * `started`: some sound of this source was heard. `heard`: the current file was.
   */
  let active = null;
  let attempts = 0;

  const emit = () => listeners.forEach((listener) => listener());

  function setState(key, state) {
    if ((states.get(key) ?? "idle") === state) return;
    if (state === "idle") states.delete(key);
    else states.set(key, state);
    emit();
  }

  /** Unavailable is not stored: another reciter, or the connection coming back, gives a part something to try again. */
  function getState(key, sources) {
    if (active?.key !== key && sources?.length && sources.every((s) => failed.has(s.id))) return "unavailable";
    return states.get(key) ?? "idle";
  }

  const isCurrent = (id) => active !== null && active.id === id;

  function stopStartTimer() {
    if (active?.timer === undefined) return;
    clearTimer(active.timer);
    active.timer = undefined;
  }

  function startStartTimer() {
    stopStartTimer();
    const { id } = active;
    active.timer = setTimer(() => fail(id), START_TIMEOUT_MS);
  }

  function detach() {
    for (const [type, handler] of Object.entries(active.handlers)) element.removeEventListener(type, handler);
    active.handlers = {};
  }

  /** Takes the element away from the active part and stops any download. Does not change the part's state. */
  function release() {
    if (!active) return;
    stopStartTimer();
    detach();
    active = null;
    element.pause();
    element.removeAttribute("src");
    element.load();
  }

  /** Releases the active part and leaves it idle. */
  function finish() {
    if (!active) return;
    const { key } = active;
    release();
    setState(key, "idle");
  }

  /** Calls `play()` on the element and deals with a refusal. `fallback` is the state to show if the browser says no. */
  function callPlay(id, fallback) {
    element.play()?.catch((error) => {
      if (!isCurrent(id)) return;
      if (error?.name === "NotSupportedError") fail(id);
      else if (error?.name === "NotAllowedError") {
        // The browser wants another action by the reader. Nothing is wrong with the recording.
        if (fallback === "idle") finish();
        else {
          stopStartTimer();
          setState(active.key, fallback);
        }
      }
      // "AbortError" follows our own pause or stop. Anything else is left to the error event or the start timer.
    });
  }

  function fail(id) {
    if (!isCurrent(id)) return;
    const { key, sources, source } = active;
    // A dropped connection says nothing about the recording.
    if (!isOnline()) return finish();
    failed.add(source.id);
    answers.delete(source.id);
    // A recording that breaks while paused is not a reason to start playing another.
    const wasPaused = states.get(key) === "paused";
    release();
    if (wasPaused) {
      setState(key, "idle");
      emit(); // the source on offer changed even if the state did not
    } else start(key, sources);
  }

  /** Loads file `index` of the active source and plays it. `fallback` as for `callPlay`. */
  function loadFile(index, fallback) {
    const { key, urls, id } = active;
    active.index = index;
    active.heard = false;
    const handlers = {
      playing: () => {
        if (!isCurrent(id)) return;
        active.started = true;
        active.heard = true;
        stopStartTimer();
        setState(key, "playing");
      },
      waiting: () => {
        if (isCurrent(id) && states.get(key) === "playing") setState(key, "loading");
      },
      // A pause from outside the page, such as a media key. At the end of a file "ended" follows instead.
      pause: () => {
        if (isCurrent(id) && states.get(key) === "playing" && element.paused && !element.ended) setState(key, "paused");
      },
      ended: () => {
        if (!isCurrent(id)) return;
        if (index + 1 < urls.length) next();
        else finish();
      },
      error: () => fail(id),
    };
    element.src = urls[index];
    active.handlers = handlers;
    for (const [type, handler] of Object.entries(handlers)) element.addEventListener(type, handler);
    callPlay(id, fallback);
  }

  /** The next verse of the same recitation, under a new attempt number and a new start time limit. */
  function next() {
    detach();
    active.id = ++attempts;
    setState(active.key, "loading");
    startStartTimer();
    loadFile(active.index + 1, "paused");
  }

  function play(answer) {
    active.answer = answer;
    active.urls = answer.urls;
    loadFile(0, "idle");
  }

  /** Plays the first source that has not failed, or leaves the part with nothing to offer. */
  function start(key, sources) {
    const source = sources.find((s) => !failed.has(s.id));
    if (!source) {
      setState(key, "idle");
      return emit(); // it now reads as unavailable
    }
    element ??= createElement();
    const id = ++attempts;
    active = { key, sources, source, answer: null, urls: null, index: 0, id, started: false, heard: false, timer: undefined, handlers: {} };
    startStartTimer(); // it covers asking for the addresses and the start of the first file
    setState(key, "loading");
    emit(); // the source on offer may have changed while the state stayed "loading"
    if (!isCurrent(id)) return;
    if (source.urls) return play({ urls: source.urls });
    const held = answers.get(source.id);
    // Without waiting, so the browser sees the reader's action behind `play()`.
    if (held && now() < held.until) return play(held.answer);
    source.resolve().then(
      (answer) => {
        if (!Array.isArray(answer?.urls) || answer.urls.length === 0) return fail(id);
        answers.set(source.id, { answer, until: now() + KEEP_ANSWER_MS });
        if (!isCurrent(id)) return; // cancelled, or another part was started
        active.answer = answer;
        emit(); // the reciter's name shows before any sound
        play(answer);
      },
      () => fail(id)
    );
  }

  return {
    getState,

    /**
     * What a part's control shows: `{ state, provider, reciterName }`, for the source it is playing, or else the one a
     * press would try. The same object is returned while nothing changes.
     */
    getView(key, sources) {
      const offered = active?.key === key ? active.source : sources.find((s) => !failed.has(s.id)) ?? sources.at(-1);
      const answer = active?.key === key ? active.answer : answers.get(offered?.id)?.answer;
      const view = { state: getState(key, sources), provider: offered?.provider ?? null, reciterName: answer?.reciter?.name ?? null };
      const last = views.get(key);
      if (last && last.state === view.state && last.provider === view.provider && last.reciterName === view.reciterName) return last;
      views.set(key, view);
      return view;
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    /** What the part's control does when pressed. */
    toggle(key, sources) {
      if (!isOnline()) return;
      if (active?.key !== key) {
        if (sources.every((s) => failed.has(s.id))) return;
        finish(); // one at a time
        return start(key, sources);
      }
      // The part keeps its source until it ends, whatever `sources` says now.
      if (states.get(key) === "paused") {
        setState(key, "loading");
        if (!active.heard) startStartTimer();
        return callPlay(active.id, "paused");
      }
      // Still waiting for the first sound: cancel. After that: pause and keep the position.
      if (!active.started) return finish();
      stopStartTimer();
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
      emit();
    },
  };
}
