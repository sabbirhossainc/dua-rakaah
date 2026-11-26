import test from "node:test";
import assert from "node:assert/strict";
import { createQuranClient } from "./client.js";
import { DEFAULT_RECITER, KEEP_MS, Unavailable, audioAddress, createRecitations } from "./recitations.js";
import { fakePath, fakeSource } from "./test-helpers.js";

const HOST = "https://verses.quran.com";
const address = (reciter, verse) => `${HOST}/${fakePath(reciter, verse)}`;
const LIST = [
  { id: 1, reciterName: "One", style: "Mujawwad" },
  { id: 7, reciterName: "seven", translatedName: { name: "Seven" } },
];

/** A stand-in for the SDK client. `answer(reciter, verse)` may return a path or null, or throw. */
function setup({ answer = fakePath, list = () => LIST, timeoutMs } = {}) {
  const calls = [];
  const lines = [];
  const clock = { now: 1_000_000 };
  const byKey = async (verse, reciter) => {
    calls.push(`${reciter}/${verse}`);
    const url = await answer(Number(reciter), verse);
    if (url === null) return { audioFiles: [] };
    const audioUrl = url.startsWith("http") ? url : `${HOST}/${url.replace(/^\/+/, "")}`;
    return { audioFiles: [{ verseKey: verse, url, audioUrl }] };
  };
  const client = {
    content: {
      v4: {
        resources: { recitations: { list: async () => (calls.push("list"), list()) } },
        audio: { verseRecitation: { byKey } },
      },
    },
  };
  const service = createRecitations({ client, now: () => clock.now, log: (l) => lines.push(l), timeoutMs });
  return { service, calls, lines, clock };
}
const status = (code) => () => {
  throw Object.assign(new Error("Bearer invented-token secret"), { status: code, headers: { "x-auth-token": "invented-token" } });
};

test("several verses come in verse order with the reciter's name", async () => {
  // The first verse answers last.
  const wait = (ms) => new Promise((done) => setTimeout(done, ms));
  const s = setup({ answer: async (r, v) => (await wait(v === "2:285" ? 20 : 0), fakePath(r, v)) });
  assert.deepEqual(await s.service.recitation(["2:285", "2:286"], 1), {
    urls: [address(1, "2:285"), address(1, "2:286")],
    reciter: { id: 1, name: "One" },
  });
});

test("no reciter, or one not on the list, means recitation 7", async () => {
  const s = setup();
  assert.equal(DEFAULT_RECITER, 7);
  assert.equal((await s.service.recitation(["1:5"])).reciter.name, "Seven");
  assert.equal((await s.service.recitation(["1:5"], 999)).reciter.id, 7);
  assert.ok(!s.calls.includes("999/1:5"), "an unknown reciter is never asked for");
});

test("a reciter lacking one verse is replaced by recitation 7 for the whole run", async () => {
  for (const lack of [() => null, status(404)]) {
    const s = setup({ answer: (r, v) => (r === 1 && v === "2:286" ? lack() : fakePath(r, v)) });
    const got = await s.service.recitation(["2:285", "2:286"], 1);
    assert.deepEqual(got, { urls: [address(7, "2:285"), address(7, "2:286")], reciter: { id: 7, name: "Seven" } });
    assert.deepEqual(s.lines, []);
  }
});

test("when no reciter has every verse, nothing is returned", async () => {
  const s = setup({ answer: (r, v) => (v === "2:286" ? null : fakePath(r, v)) });
  await assert.rejects(s.service.recitation(["2:285", "2:286"], 1), Unavailable);
});

test("only https addresses on the source's audio hosts pass", () => {
  assert.equal(audioAddress("http://verses.quran.com/a.mp3"), `${HOST}/a.mp3`);
  assert.equal(audioAddress("//mirrors.quranicaudio.com/a.mp3"), "https://mirrors.quranicaudio.com/a.mp3");
  for (const host of ["verses.quran.foundation", "audio.qurancdn.com", "quranicaudio.com", "download.quranicaudio.com"]) {
    assert.ok(audioAddress(`https://${host}/a.mp3`), host);
  }
  const refused = [
    "https://evil.example/a.mp3",
    "https://verses.quran.com.evil.example/a.mp3",
    "https://evilquranicaudio.com/a.mp3",
    "https://user@verses.quran.com/a.mp3",
    "https://verses.quran.com:8443/a.mp3",
    "javascript:alert(1)",
    "/a.mp3",
    "",
    null,
  ];
  for (const bad of refused) assert.equal(audioAddress(bad), null, String(bad));
});

test("an address on another host makes the part unavailable, and is not kept", async () => {
  let bad = true;
  const s = setup({ answer: (r, v) => (bad ? "https://evil.example/a.mp3" : fakePath(r, v)) });
  await assert.rejects(s.service.recitation(["1:5"], 1), Unavailable);
  assert.deepEqual(s.calls, ["list", "1/1:5"], "no second reciter is tried");
  bad = false;
  assert.deepEqual((await s.service.recitation(["1:5"], 1)).urls, [address(1, "1:5")]);
});

test("a protocol-relative address keeps its own host", async () => {
  const s = setup({ answer: () => "//mirrors.quranicaudio.com/x/001005.mp3" });
  assert.deepEqual((await s.service.recitation(["1:5"])).urls, ["https://mirrors.quranicaudio.com/x/001005.mp3"]);
});

test("an answer is reused within a day and asked for again after it", async () => {
  const s = setup();
  await s.service.recitation(["1:5"], 1);
  s.clock.now += KEEP_MS - 1;
  await s.service.recitation(["1:5"], 1);
  assert.deepEqual(s.calls, ["list", "1/1:5"]);
  s.clock.now += 2;
  await s.service.recitation(["1:5"], 1);
  assert.deepEqual(s.calls, ["list", "1/1:5", "list", "1/1:5"]);
  assert.ok(KEEP_MS <= 24 * 60 * 60 * 1000);
});

test("requests at the same time share one call", async () => {
  const s = setup();
  await Promise.all([s.service.recitation(["1:5"], 1), s.service.recitation(["1:5"], 1)]);
  assert.deepEqual(s.calls, ["list", "1/1:5"]);
});

test("a refusal, a limit or a broken source is unavailable, is not kept and tries no second reciter", async () => {
  for (const code of [401, 429, 500]) {
    let fail = true;
    const s = setup({ answer: (r, v) => (fail ? status(code)() : fakePath(r, v)) });
    const err = await s.service.recitation(["1:5"], 1).catch((e) => e);
    assert.ok(err instanceof Unavailable);
    assert.doesNotMatch(`${err.message} ${s.lines.join(" ")}`, /token|secret|Bearer/i);
    assert.deepEqual(s.lines, [`Quran.com verse 1:5, reciter 1 failed: HTTP ${code}`]);
    assert.deepEqual(s.calls, ["list", "1/1:5"]);
    fail = false;
    assert.equal((await s.service.recitation(["1:5"], 1)).reciter.id, 1);
  }
});

test("an answer that never comes times out", async () => {
  const s = setup({ answer: () => new Promise(() => {}), timeoutMs: 20 });
  await assert.rejects(s.service.recitation(["1:5"]), Unavailable);
  assert.deepEqual(s.lines, ["Quran.com verse 1:5, reciter 7 failed: timeout"]);
});

test("after a failure no further verses are asked for", async () => {
  const s = setup({ answer: status(429) });
  const verses = Array.from({ length: 11 }, (_, i) => `3:${190 + i}`);
  await assert.rejects(s.service.recitation(verses), Unavailable);
  assert.ok(s.calls.length <= 5, `${s.calls.length} calls`);
});

test("the reciter list has numbers, names and styles, and skips unusable entries", async () => {
  const s = setup({ list: () => [...LIST, { id: "3", reciterName: "x" }, { id: 4 }, null] });
  assert.deepEqual(await s.service.reciters(), [
    { id: 1, name: "One", style: "Mujawwad" },
    { id: 7, name: "Seven", style: null },
  ]);
});

test("reciter names are asked for in English", async (t) => {
  const source = await fakeSource();
  t.after(source.close);
  const client = createQuranClient({ clientId: "id", clientSecret: "s", oauth2BaseUrl: source.base, apiBaseUrl: source.base });
  await createRecitations({ client }).reciters();
  assert.equal(source.requests.find((r) => r.path.endsWith("/recitations")).query, "?language=en");
});

test("an empty or failing reciter list is unavailable and asked for again", async () => {
  let answer = () => [];
  const s = setup({ list: () => answer() });
  await assert.rejects(s.service.reciters(), Unavailable);
  answer = status(500);
  await assert.rejects(s.service.reciters(), Unavailable);
  await assert.rejects(s.service.recitation(["1:5"]), Unavailable);
  answer = () => LIST;
  assert.equal((await s.service.reciters()).length, 2);
});

test("with the real SDK, a refusal puts no token or secret in any log", async (t) => {
  const source = await fakeSource({ audio: () => 429 });
  t.after(source.close);
  const client = createQuranClient({ clientId: "id", clientSecret: "top-secret", oauth2BaseUrl: source.base, apiBaseUrl: source.base });
  const lines = [];
  const seen = [];
  for (const method of ["log", "info", "warn", "error", "debug"]) t.mock.method(console, method, (...a) => seen.push(a.join(" ")));
  const service = createRecitations({ client, log: (l) => lines.push(l) });
  await assert.rejects(service.recitation(["1:5"]), Unavailable);
  assert.deepEqual(lines, ["Quran.com verse 1:5, reciter 7 failed: HTTP 429"]);
  assert.doesNotMatch(seen.join("\n"), /top-secret|invented-token/);
});
