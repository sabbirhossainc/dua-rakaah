import test from "node:test";
import assert from "node:assert/strict";
import { fmt } from "../i18n.js";
import { createPlayer } from "./player.js";
import { creditOf, partSources } from "./sources.js";

const HISN = "https://www.hisnmuslim.com/audio/ar/1.mp3";
const VERSE = "https://verses.quran.com/x/021087.mp3";
const audio = { key: "47:1", duaId: 47, part: 1, urls: [HISN], quran: { coverage: "partial" } };
const reply = (status, body) => async () => ({ ok: status === 200, status, json: async () => body });
const good = { urls: [VERSE], coverage: "partial", reciter: { id: 7, name: "Seven" } };

test("Quran.com comes first, then each other recording", () => {
  assert.deepEqual(partSources(audio, "3").map((s) => [s.provider, s.id]), [["quran", "quran:47:1:3"], ["hisnmuslim", HISN]]);
  assert.deepEqual(partSources({ ...audio, quran: null }, "3").map((s) => s.provider), ["hisnmuslim"]);
  assert.deepEqual(partSources({ ...audio, urls: [] }, "3").map((s) => s.provider), ["quran"]);
});

test("the recitation is asked from this app's server for the chosen reciter, and nothing before that", async () => {
  const asked = [];
  const request = async (...args) => (asked.push(args), reply(200, good)());
  const [recitation] = partSources(audio, "3", request);
  assert.deepEqual(asked, []);
  assert.deepEqual(await recitation.resolve(), { urls: [VERSE], reciter: { id: 7, name: "Seven" } });
  assert.deepEqual(asked, [["/api/audio/47/1?reciter=3", { cache: "no-store" }]]);
});

test("an answer that cannot be played is a failure", async () => {
  const bad = [
    reply(503, { error: "unavailable" }),
    reply(404, {}),
    reply(200, { ...good, urls: [] }),
    reply(200, { ...good, urls: ["http://verses.quran.com/a.mp3"] }),
    reply(200, { ...good, urls: [5] }),
    reply(200, { urls: [VERSE] }),
    reply(200, null),
    async () => {
      throw new TypeError("network");
    },
  ];
  for (const request of bad) await assert.rejects(partSources(audio, "7", request)[0].resolve());
});

const credit = (view, quran = audio.quran) => {
  const c = creditOf(view, quran);
  return [fmt("en", c.label, c.vars), c.fullVerse];
};

test("each source has its credit, and the reciter is named once known", () => {
  assert.deepEqual(credit({ state: "idle", provider: "hisnmuslim", reciterName: null }), ["Recitation: Hisn al-Muslim", false]);
  assert.deepEqual(credit({ state: "idle", provider: "quran", reciterName: null }, { coverage: "full" }), ["Recitation: Quran Foundation", false]);
  assert.deepEqual(credit({ state: "playing", provider: "quran", reciterName: "Seven" }, { coverage: "full" }), [
    "Recitation: Seven · Quran Foundation",
    false,
  ]);
});

test("the full verse label shows only while Quran.com is on offer for part of a verse", () => {
  assert.equal(credit({ state: "idle", provider: "quran", reciterName: null })[1], true, "before play");
  assert.equal(credit({ state: "playing", provider: "quran", reciterName: "Seven" })[1], true);
  assert.equal(credit({ state: "playing", provider: "hisnmuslim", reciterName: null })[1], false, "a fallback recording");
  assert.equal(credit({ state: "unavailable", provider: "quran", reciterName: null })[1], false);
});

test("with the player: the label and credit change when a part falls back", async () => {
  const element = { addEventListener() {}, removeEventListener() {}, removeAttribute() {}, load() {}, pause() {}, play: () => undefined };
  const player = createPlayer({ createElement: () => element, isOnline: () => true, setTimer: () => 1, clearTimer: () => {} });
  const sources = partSources(audio, "7", reply(503, {}));
  const now = () => credit(player.getView(audio.key, sources));
  assert.deepEqual(now(), ["Recitation: Quran Foundation", true]);
  player.toggle(audio.key, sources);
  await new Promise((r) => setImmediate(r));
  assert.deepEqual(now(), ["Recitation: Hisn al-Muslim", false]);
  assert.equal(element.src, HISN);
});
