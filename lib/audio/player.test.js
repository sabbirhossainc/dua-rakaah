import test from "node:test";
import assert from "node:assert/strict";
import { KEEP_ANSWER_MS, START_TIMEOUT_MS, createPlayer } from "./player.js";

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
    now: () => now,
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
  /** The state as the control of a part with these sources would read it. */
  const state = (key, sources) => player.getState(key, sources);
  const view = (key, sources) => player.getView(key, sources);
  /** The end of the current file. */
  const end = () => {
    element.ended = true;
    element.paused = true;
    element.emit("pause");
    element.emit("ended");
    element.ended = false;
  };
  return { element, player, timers, advance, sound, connection, refuse, state, view, end, net, created: () => created };
}

/** One source per address, as a part's recordings are given to the player. */
const recordings = (...urls) => urls.map((url) => ({ id: url, provider: "hisnmuslim", urls: [url] }));
const URL_A = ["https://x/a1.mp3", "https://x/a2.mp3"];
const A = recordings(...URL_A);
const URL_B = "https://x/b1.mp3";
const B = recordings(URL_B);

test("nothing is created or requested before play", () => {
  const s = setup();
  assert.equal(s.player.getState("a"), "idle");
  assert.equal(s.created(), 0);
});

test("play, loading, playing, pause and resume from the same position", () => {
  const s = setup();
  s.player.toggle("a", A);
  assert.equal(s.player.getState("a"), "loading");
  assert.equal(s.element.src, URL_A[0]);
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
  assert.equal(s.element.src, URL_A[0]);
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
  assert.equal(s.element.src, URL_A[0]);
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
  assert.equal(s.element.src, URL_B);
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
  assert.equal(s.element.src, URL_A[1]);
  assert.equal(s.player.getState("a"), "loading");
  s.sound();
  s.element.emit("ended");
  s.player.toggle("a", A);
  assert.equal(s.element.src, URL_A[1]);
});

test("an unsupported file counts as failed", async () => {
  const s = setup();
  s.player.toggle("a", A);
  await s.refuse("NotSupportedError");
  assert.equal(s.element.src, URL_A[1]);
});

test("a recording that has not started after 15 seconds counts as failed", () => {
  const s = setup();
  s.player.toggle("a", A);
  s.advance(START_TIMEOUT_MS - 1);
  assert.equal(s.element.src, URL_A[0]);
  s.advance(1);
  assert.equal(s.element.src, URL_A[1]);
  s.advance(START_TIMEOUT_MS);
  assert.equal(s.state("a", A), "unavailable");
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
  assert.equal(s.element.src, URL_A[1]);
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
  assert.equal(s.element.src, URL_A[1]);
});

test("a browser refusal is not a failure", async () => {
  const s = setup();
  s.player.toggle("a", A);
  await s.refuse("NotAllowedError");
  assert.equal(s.player.getState("a"), "idle");
  s.player.toggle("a", A);
  assert.equal(s.element.src, URL_A[0]);
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
  assert.equal(s.element.src, URL_A[0]);
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
  assert.equal(s.element.src, URL_B);
  s.player.stop("b");
  s.player.toggle("a", A);
  assert.equal(s.element.src, URL_A[0], "nothing was marked as failed");
});

test("when every recording fails the part is unavailable, and other parts are not", () => {
  const s = setup();
  s.player.toggle("a", A);
  s.element.emit("error");
  s.element.emit("error");
  assert.equal(s.state("a", A), "unavailable");
  assert.equal(s.state("b", B), "idle");
  s.element.log.length = 0;
  s.player.toggle("a", A);
  assert.deepEqual(s.element.log, [], "pressing an unavailable control does nothing");
  s.player.toggle("b", B);
  assert.equal(s.element.src, URL_B);
});

test("going offline stops playback; coming back clears unavailable parts and failures", () => {
  const s = setup();
  const gone = recordings("https://x/gone.mp3");
  s.player.toggle("a", gone);
  s.element.emit("error");
  assert.equal(s.state("a", gone), "unavailable");
  s.player.toggle("b", B);
  s.sound();
  s.connection(false);
  assert.equal(s.player.getState("b"), "idle");
  assert.equal(s.element.paused, true);
  s.player.toggle("b", B);
  assert.equal(s.player.getState("b"), "idle", "nothing starts offline");
  s.connection(true);
  assert.equal(s.state("a", gone), "idle");
  s.player.toggle("a", gone);
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
    assert.equal(s.element.src, URL_B);
  }
});

test("subscribers hear every change of state", () => {
  const s = setup();
  let calls = 0;
  const unsubscribe = s.player.subscribe(() => calls++);
  s.player.toggle("a", A);
  const loading = s.view("a", A);
  assert.ok(calls > 0);
  const before = calls;
  s.sound();
  assert.equal(calls, before + 1);
  assert.notEqual(s.view("a", A), loading);
  assert.equal(s.view("a", A), s.view("a", A.slice()), "the same object while nothing changes");
  unsubscribe();
  s.player.stop("a");
  assert.equal(calls, before + 1);
});

// ---- Quran.com recitations: sources whose addresses are asked for, played verse by verse ----

const VERSES = ["https://q/285.mp3", "https://q/286.mp3", "https://q/287.mp3"];
const flush = () => new Promise((r) => setImmediate(r));

/** A Quran source whose answers the test releases itself. */
function quranSource(reciterId = 7) {
  const asked = [];
  const source = {
    id: `quran:202:1:${reciterId}`,
    provider: "quran",
    resolve: () => new Promise((resolve, reject) => asked.push({ resolve, reject })),
  };
  const answer = async (urls = VERSES, name = `Reciter ${reciterId}`) => {
    asked.at(-1).resolve({ urls, reciter: { id: reciterId, name } });
    await flush();
  };
  const refuse = async () => {
    asked.at(-1).reject(new Error("503"));
    await flush();
  };
  return { source, asked, answer, refuse };
}

const HISN = recordings("https://h/1.mp3")[0];

test("nothing is asked for before play", () => {
  const s = setup();
  const q = quranSource();
  s.view("a", [q.source, HISN]);
  assert.equal(q.asked.length, 0);
});

test("the Quran recitation comes first, and the reciter is named before any sound", async () => {
  const s = setup();
  const q = quranSource();
  const sources = [q.source, HISN];
  assert.deepEqual(s.view("a", sources), { state: "idle", provider: "quran", reciterName: null });
  s.player.toggle("a", sources);
  assert.equal(s.element.src, "");
  assert.equal(s.state("a", sources), "loading");
  const seen = [];
  s.player.subscribe(() => seen.push([s.view("a", sources).reciterName, s.element.log.length]));
  await q.answer();
  assert.equal(seen[0][0], "Reciter 7");
  assert.equal(seen[0][1], 0, "named before play() was called");
  assert.equal(s.element.src, VERSES[0]);
  s.sound();
  assert.deepEqual(s.view("a", sources), { state: "playing", provider: "quran", reciterName: "Reciter 7" });
});

test("when the server has no recitation, the other recording plays without another press", async () => {
  const s = setup();
  const q = quranSource();
  const sources = [q.source, HISN];
  s.player.toggle("a", sources);
  const credits = [];
  s.player.subscribe(() => credits.push([s.view("a", sources).provider, s.element.src]));
  await q.refuse();
  assert.equal(s.element.src, HISN.urls[0]);
  assert.equal(credits[0][0], "hisnmuslim");
  assert.equal(credits[0][1], "", "the credit changed before the file was loaded");
  s.sound();
  assert.equal(s.view("a", sources).provider, "hisnmuslim");
});

test("an answer with no addresses counts as failed", async () => {
  const s = setup();
  const q = quranSource();
  s.player.toggle("a", [q.source, HISN]);
  await q.answer([]);
  assert.equal(s.element.src, HISN.urls[0]);
});

test("verses play one after another under one control", async () => {
  const s = setup();
  const q = quranSource();
  const sources = [q.source];
  s.player.toggle("a", sources);
  await q.answer();
  s.sound();
  for (const url of VERSES.slice(1)) {
    s.end();
    assert.equal(s.element.src, url, "the next verse starts by itself");
    assert.equal(s.state("a", sources), "loading");
    s.sound();
    assert.equal(s.state("a", sources), "playing");
  }
  s.end();
  assert.equal(s.state("a", sources), "idle");
  s.player.toggle("a", sources);
  assert.equal(s.element.src, VERSES[0], "from the first verse again, without waiting");
  assert.equal(q.asked.length, 1);
});

test("pause in a later verse and resume at the same place", async () => {
  const s = setup();
  const q = quranSource();
  s.player.toggle("a", [q.source]);
  await q.answer();
  s.sound();
  s.end();
  s.sound();
  s.element.position = 4;
  s.player.toggle("a", [q.source]);
  assert.equal(s.state("a", [q.source]), "paused");
  s.player.toggle("a", [q.source]);
  s.sound();
  assert.deepEqual([s.element.src, s.element.position], [VERSES[1], 4]);
});

test("pressing while the next verse loads pauses instead of starting over, and the time limit stops", async () => {
  const s = setup();
  const q = quranSource();
  const sources = [q.source];
  s.player.toggle("a", sources);
  await q.answer();
  s.sound();
  s.end();
  s.player.toggle("a", sources);
  assert.equal(s.state("a", sources), "paused");
  assert.equal(s.element.src, VERSES[1]);
  s.advance(START_TIMEOUT_MS * 2);
  assert.equal(s.state("a", sources), "paused");
  s.player.toggle("a", sources);
  assert.equal(s.timers.size, 1, "the limit runs again");
  s.advance(START_TIMEOUT_MS);
  assert.equal(s.state("a", sources), "unavailable");
});

test("a later verse that fails gives up the whole recitation and starts the next source", async () => {
  for (const break_ of [(s) => s.element.emit("error"), (s) => s.advance(START_TIMEOUT_MS)]) {
    const s = setup();
    const q = quranSource();
    const sources = [q.source, HISN];
    s.player.toggle("a", sources);
    await q.answer();
    s.sound();
    s.end();
    s.sound();
    s.end(); // the third verse is loading
    break_(s);
    assert.equal(s.element.src, HISN.urls[0]);
    assert.equal(s.view("a", sources).provider, "hisnmuslim");
    s.sound();
    s.end();
    s.player.toggle("a", sources);
    assert.equal(s.element.src, HISN.urls[0], "the failed recitation is skipped from now on");
    assert.equal(q.asked.length, 1);
  }
});

test("each verse has its own time limit", async () => {
  const s = setup();
  const q = quranSource();
  const sources = [q.source];
  s.player.toggle("a", sources);
  await q.answer();
  s.sound();
  s.advance(START_TIMEOUT_MS * 3);
  s.end();
  s.advance(START_TIMEOUT_MS - 1);
  assert.equal(s.state("a", sources), "loading");
  s.sound();
  s.advance(START_TIMEOUT_MS * 3);
  assert.equal(s.state("a", sources), "playing");
});

test("the time limit covers waiting for the addresses, and a late answer changes nothing", async () => {
  const s = setup();
  const q = quranSource();
  const sources = [q.source, HISN];
  s.player.toggle("a", sources);
  s.advance(START_TIMEOUT_MS - 1);
  assert.equal(s.element.src, "");
  s.advance(1);
  assert.equal(s.element.src, HISN.urls[0]);
  await q.answer();
  assert.equal(s.element.src, HISN.urls[0]);
  assert.equal(s.view("a", sources).provider, "hisnmuslim");
});

test("an answer after the reader cancelled or moved on starts nothing and marks nothing", async () => {
  for (const leave of [(s, src) => s.player.toggle("a", src), (s) => s.player.toggle("b", B)]) {
    const s = setup();
    const q = quranSource();
    const sources = [q.source, HISN];
    s.player.toggle("a", sources);
    leave(s, sources);
    const src = s.element.src;
    await q.answer();
    assert.equal(s.element.src, src);
    assert.equal(s.state("a", sources), "idle");
    assert.equal(s.view("a", sources).provider, "quran");
  }
});

test("a late refusal after the reader cancelled marks nothing", async () => {
  const s = setup();
  const q = quranSource();
  s.player.toggle("a", [q.source, HISN]);
  s.player.toggle("a", [q.source, HISN]);
  await q.refuse();
  assert.equal(s.view("a", [q.source, HISN]).provider, "quran");
});

test("a browser that refuses to play after the wait is not a failure, and the next press starts at once", async () => {
  const s = setup();
  const q = quranSource();
  const sources = [q.source, HISN];
  s.player.toggle("a", sources);
  await q.answer();
  await s.refuse("NotAllowedError");
  assert.equal(s.state("a", sources), "idle");
  s.player.toggle("a", sources);
  assert.equal(s.element.src, VERSES[0], "synchronously, inside the reader's action");
  assert.equal(q.asked.length, 1);
});

test("a refusal at a later verse keeps the place", async () => {
  const s = setup();
  const q = quranSource();
  const sources = [q.source];
  s.player.toggle("a", sources);
  await q.answer();
  s.sound();
  s.end();
  await s.refuse("NotAllowedError");
  assert.equal(s.state("a", sources), "paused");
  assert.equal(s.timers.size, 0);
  assert.equal(s.element.src, VERSES[1]);
});

test("an answer is reused for an hour and asked for again after it", async () => {
  const s = setup();
  const q = quranSource();
  s.player.toggle("a", [q.source]);
  await q.answer();
  s.sound();
  s.player.stop("a");
  s.advance(KEEP_ANSWER_MS + 1);
  s.player.toggle("a", [q.source]);
  assert.equal(q.asked.length, 2);
});

test("another reciter applies at the next press after the end, not while playing or paused", async () => {
  const s = setup();
  const first = quranSource(7);
  const second = quranSource(1);
  s.player.toggle("a", [first.source]);
  await first.answer();
  s.sound();
  s.player.toggle("a", [second.source]); // pauses
  assert.equal(s.view("a", [second.source]).reciterName, "Reciter 7");
  s.player.toggle("a", [second.source]); // resumes
  s.sound();
  assert.equal(s.element.src, VERSES[0]);
  assert.equal(second.asked.length, 0);
  s.end();
  s.end();
  s.end();
  assert.deepEqual(s.view("a", [second.source]), { state: "idle", provider: "quran", reciterName: null });
  s.player.toggle("a", [second.source]);
  assert.equal(second.asked.length, 1);
});

test("a part unavailable with one reciter can be tried with another", async () => {
  const s = setup();
  const first = quranSource(7);
  const second = quranSource(1);
  s.player.toggle("a", [first.source]);
  await first.refuse();
  assert.equal(s.state("a", [first.source]), "unavailable");
  assert.equal(s.state("a", [second.source]), "idle");
  s.player.toggle("a", [second.source]);
  assert.equal(second.asked.length, 1);
});
