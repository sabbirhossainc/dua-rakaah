import test from "node:test";
import assert from "node:assert/strict";
import { START_TIMEOUT_MS, createPlayer } from "./player.js";

/** The parts of an audio element the player uses. `emit` fires an event; each `play()` can be rejected later. */
function fakeElement() {
  const listeners = new Map();
  return {
    src: "",
    paused: true,
    ended: false,
    position: 0,
    log: [],
    plays: [],
    addEventListener(type, fn) {
      listeners.set(type, [...(listeners.get(type) ?? []), fn]);
    },
    removeEventListener(type, fn) {
      listeners.set(type, (listeners.get(type) ?? []).filter((f) => f !== fn));
    },
    handlers: (type) => [...(listeners.get(type) ?? [])],
    emit(type) {
      for (const fn of listeners.get(type) ?? []) fn();
    },
    play() {
      this.paused = false;
      this.log.push(`play ${this.src}`);
      return new Promise((resolve, reject) => this.plays.push({ resolve, reject }));
    },
    pause() {
      this.paused = true;
      this.log.push("pause");
    },
    removeAttribute(name) {
      if (name === "src") {
        this.src = "";
        this.position = 0;
      }
    },
    load() {},
  };
}

function setup() {
  const element = fakeElement();
  const timers = new Map();
  let nextTimer = 0;
  let now = 0;
  const net = { online: true };
  let created = 0;
  const player = createPlayer({
    createElement: () => (created++, element),
    isOnline: () => net.online,
    setTimer: (fn, ms) => (timers.set(++nextTimer, { fn, at: now + ms }), nextTimer),
    clearTimer: (id) => timers.delete(id),
  });
  const advance = (ms) => {
    now += ms;
    for (const [id, t] of [...timers]) {
      if (t.at <= now && timers.has(id)) {
        timers.delete(id);
        t.fn();
      }
    }
  };
  const sound = () => element.emit("playing");
  const connection = (online) => {
    net.online = online;
    player.connectionChanged(online);
  };
  /** Rejects the latest `play()` the way a browser does, and lets the handler run. */
  const refuse = async (name, index = element.plays.length - 1) => {
    element.plays[index].reject(Object.assign(new Error(name), { name }));
    await new Promise((r) => setImmediate(r));
  };
  return { element, player, timers, advance, sound, connection, refuse, net, created: () => created };
}

const A = ["https://x/a1.mp3", "https://x/a2.mp3"];
const B = ["https://x/b1.mp3"];

test("nothing is created or requested before play", () => {
  const s = setup();
  assert.equal(s.player.getState("a"), "idle");
  assert.equal(s.created(), 0);
});

test("play, loading, playing, pause and resume from the same position", () => {
  const s = setup();
  s.player.toggle("a", A);
  assert.equal(s.player.getState("a"), "loading");
  assert.equal(s.element.src, A[0]);
  s.sound();
  assert.equal(s.player.getState("a"), "playing");
  s.element.position = 12;
  s.player.toggle("a", A);
  assert.equal(s.player.getState("a"), "paused");
  assert.equal(s.element.paused, true);
  s.player.toggle("a", A);
  s.sound();
  assert.equal(s.player.getState("a"), "playing");
  assert.equal(s.element.position, 12, "the file was not reloaded");
});

test("a recording that ends returns to play, and starts from the beginning", () => {
  const s = setup();
  s.player.toggle("a", A);
  s.sound();
  s.element.position = 30;
  s.element.ended = true;
  s.element.paused = true;
  s.element.emit("pause");
  s.element.emit("ended");
  assert.equal(s.player.getState("a"), "idle");
  s.element.ended = false;
  s.player.toggle("a", A);
  assert.equal(s.element.position, 0);
  assert.equal(s.element.src, A[0]);
});

test("pressing again while loading cancels, and it is not a failure", () => {
  const s = setup();
  s.player.toggle("a", A);
  s.player.toggle("a", A);
  assert.equal(s.player.getState("a"), "idle");
  assert.equal(s.element.src, "");
  assert.equal(s.timers.size, 0);
  s.advance(START_TIMEOUT_MS * 2);
  s.player.toggle("a", A);
  assert.equal(s.element.src, A[0]);
});

test("buffering after the start shows loading, and pressing then pauses and keeps the position", () => {
  const s = setup();
  s.player.toggle("a", A);
  s.sound();
  s.element.position = 8;
  s.element.emit("waiting");
  assert.equal(s.player.getState("a"), "loading");
  s.player.toggle("a", A);
  assert.equal(s.player.getState("a"), "paused");
  assert.equal(s.element.position, 8);
});

test("a pause from outside the page shows as paused", () => {
  const s = setup();
  s.player.toggle("a", A);
  s.sound();
  s.element.paused = true;
  s.element.emit("pause");
  assert.equal(s.player.getState("a"), "paused");
  s.element.paused = false;
  s.sound();
  assert.equal(s.player.getState("a"), "playing");
});

test("starting a second recording stops the first", () => {
  const s = setup();
  s.player.toggle("a", A);
  s.sound();
  s.player.toggle("b", B);
  assert.equal(s.player.getState("a"), "idle");
  assert.equal(s.player.getState("b"), "loading");
  assert.equal(s.element.src, B[0]);
  assert.equal(s.created(), 1);
  assert.equal(s.element.handlers("playing").length, 1, "the first attempt's listeners are gone");
});

test("stop ends only the active part", () => {
  const s = setup();
  s.player.toggle("a", A);
  s.sound();
  s.player.stop("b");
  assert.equal(s.player.getState("a"), "playing");
  s.player.stop("a");
  assert.equal(s.player.getState("a"), "idle");
  assert.equal(s.element.paused, true);
});

test("an error moves to the next recording, and the failed one is skipped from then on", () => {
  const s = setup();
  s.player.toggle("a", A);
  s.element.emit("error");
  assert.equal(s.element.src, A[1]);
  assert.equal(s.player.getState("a"), "loading");
  s.sound();
  s.element.emit("ended");
  s.player.toggle("a", A);
  assert.equal(s.element.src, A[1]);
});

test("an unsupported file counts as failed", async () => {
  const s = setup();
  s.player.toggle("a", A);
  await s.refuse("NotSupportedError");
  assert.equal(s.element.src, A[1]);
});

test("a recording that has not started after 15 seconds counts as failed", () => {
  const s = setup();
  s.player.toggle("a", A);
  s.advance(START_TIMEOUT_MS - 1);
  assert.equal(s.element.src, A[0]);
  s.advance(1);
  assert.equal(s.element.src, A[1]);
  s.advance(START_TIMEOUT_MS);
  assert.equal(s.player.getState("a"), "unavailable");
});

test("no start timer remains once the sound has started", () => {
  const s = setup();
  s.player.toggle("a", A);
  s.sound();
  s.advance(START_TIMEOUT_MS * 3);
  assert.equal(s.player.getState("a"), "playing");
});

test("an error during playback moves to the next recording", () => {
  const s = setup();
  s.player.toggle("a", A);
  s.sound();
  s.element.emit("error");
  assert.equal(s.element.src, A[1]);
});

test("an error while paused starts nothing, and the next press skips that recording", () => {
  const s = setup();
  s.player.toggle("a", A);
  s.sound();
  s.player.toggle("a", A);
  s.element.emit("error");
  assert.equal(s.player.getState("a"), "idle");
  assert.equal(s.element.src, "");
  s.player.toggle("a", A);
  assert.equal(s.element.src, A[1]);
});

test("a browser refusal is not a failure", async () => {
  const s = setup();
  s.player.toggle("a", A);
  await s.refuse("NotAllowedError");
  assert.equal(s.player.getState("a"), "idle");
  s.player.toggle("a", A);
  assert.equal(s.element.src, A[0]);
});

test("a refusal on resume stays paused", async () => {
  const s = setup();
  s.player.toggle("a", A);
  s.sound();
  s.player.toggle("a", A);
  s.player.toggle("a", A);
  await s.refuse("NotAllowedError");
  assert.equal(s.player.getState("a"), "paused");
});

test("an aborted play changes nothing", async () => {
  const s = setup();
  s.player.toggle("a", A);
  await s.refuse("AbortError");
  assert.equal(s.player.getState("a"), "loading");
  assert.equal(s.element.src, A[0]);
});

test("late events and rejections from an earlier attempt are ignored", async () => {
  const s = setup();
  s.player.toggle("a", A);
  const old = ["playing", "error", "ended", "waiting", "pause"].flatMap((type) => s.element.handlers(type));
  const oldTimer = [...s.timers.values()][0].fn;
  s.player.toggle("b", B);
  for (const fn of old) fn();
  oldTimer();
  await s.refuse("NotSupportedError", 0);
  assert.equal(s.player.getState("a"), "idle");
  assert.equal(s.player.getState("b"), "loading");
  assert.equal(s.element.src, B[0]);
  s.player.stop("b");
  s.player.toggle("a", A);
  assert.equal(s.element.src, A[0], "nothing was marked as failed");
});

test("when every recording fails the part is unavailable, and other parts are not", () => {
  const s = setup();
  s.player.toggle("a", A);
  s.element.emit("error");
  s.element.emit("error");
  assert.equal(s.player.getState("a"), "unavailable");
  assert.equal(s.player.getState("b"), "idle");
  s.element.log.length = 0;
  s.player.toggle("a", A);
  assert.deepEqual(s.element.log, [], "pressing an unavailable control does nothing");
  s.player.toggle("b", B);
  assert.equal(s.element.src, B[0]);
});

test("going offline stops playback; coming back clears unavailable parts and failures", () => {
  const s = setup();
  s.player.toggle("a", ["https://x/gone.mp3"]);
  s.element.emit("error");
  assert.equal(s.player.getState("a"), "unavailable");
  s.player.toggle("b", B);
  s.sound();
  s.connection(false);
  assert.equal(s.player.getState("b"), "idle");
  assert.equal(s.element.paused, true);
  s.player.toggle("b", B);
  assert.equal(s.player.getState("b"), "idle", "nothing starts offline");
  s.connection(true);
  assert.equal(s.player.getState("a"), "idle");
  s.player.toggle("a", ["https://x/gone.mp3"]);
  assert.equal(s.element.src, "https://x/gone.mp3");
});

test("a failure while the device is offline marks nothing, whichever event comes first", () => {
  for (const fire of [(s) => s.element.emit("error"), (s) => s.advance(START_TIMEOUT_MS)]) {
    const s = setup();
    s.player.toggle("a", B);
    s.net.online = false; // the offline event has not arrived yet
    fire(s);
    assert.equal(s.player.getState("a"), "idle");
    s.connection(true);
    s.player.toggle("a", B);
    assert.equal(s.element.src, B[0]);
  }
});

test("subscribers hear every change of state", () => {
  const s = setup();
  let calls = 0;
  const unsubscribe = s.player.subscribe(() => calls++);
  s.player.toggle("a", A);
  s.sound();
  assert.equal(calls, 2);
  unsubscribe();
  s.player.stop("a");
  assert.equal(calls, 2);
});
