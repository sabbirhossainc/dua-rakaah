import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { checkRecordings, checkVerses } from "./check-audio.mjs";
import { Unavailable } from "../lib/quran/recitations.js";
import { fakeSource } from "../lib/quran/test-helpers.js";

const SCRIPT = fileURLToPath(new URL("./check-audio.mjs", import.meta.url));

/** A local server whose answer for each path comes from `routes`; it records every request. */
async function serve(t, routes) {
  const requests = [];
  const server = http.createServer((req, res) => {
    requests.push({ url: req.url, range: req.headers.range });
    const answers = routes[req.url] ?? [{ status: 404, type: "text/html" }];
    const answer = answers.length > 1 ? answers.shift() : answers[0];
    res.writeHead(answer.status, answer.type ? { "content-type": answer.type } : {});
    res.end("x");
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}`;
  return { base, requests };
}

const recording = (dua_id, url) => ({ dua_id, part: 1, candidates: [{ url }] });
const ok = { status: 206, type: "audio/mpeg" };

test("working addresses pass, each asked for once and only for its first byte", async (t) => {
  const { base, requests } = await serve(t, { "/1.mp3": [ok], "/2.mp3": [{ status: 200, type: "Audio/MPEG" }] });
  const r = await checkRecordings([recording(1, `${base}/1.mp3`), recording(2, `${base}/2.mp3`), recording(3, `${base}/1.mp3`)]);
  assert.deepEqual(r, { checked: 2, failures: [] });
  assert.deepEqual(requests, [{ url: "/1.mp3", range: "bytes=0-0" }, { url: "/2.mp3", range: "bytes=0-0" }]);
});

test("a missing file is retried once, then reported with every part that uses it", async (t) => {
  const { base, requests } = await serve(t, {});
  const url = `${base}/gone.mp3`;
  const r = await checkRecordings([recording(1, url), recording(2, url)]);
  assert.deepEqual(r.failures, [{ url, problem: "HTTP 404", parts: ["dua 1 part 1", "dua 2 part 1"] }]);
  assert.equal(requests.length, 2);
});

test("an answer that is not audio fails", async (t) => {
  const { base } = await serve(t, { "/1.mp3": [{ status: 200, type: "text/html" }], "/2.mp3": [{ status: 200 }] });
  const r = await checkRecordings([recording(1, `${base}/1.mp3`), recording(2, `${base}/2.mp3`)]);
  assert.deepEqual(r.failures.map((f) => f.problem), ['content type "text/html"', 'content type "(none)"']);
});

test("one failure followed by success passes", async (t) => {
  const { base, requests } = await serve(t, { "/1.mp3": [{ status: 503 }, ok] });
  assert.deepEqual((await checkRecordings([recording(1, `${base}/1.mp3`)])).failures, []);
  assert.equal(requests.length, 2);
});

test("an unreachable server is a failure, not a crash", async () => {
  const r = await checkRecordings([recording(1, "http://127.0.0.1:1/x.mp3")]);
  assert.equal(r.failures.length, 1);
});

const withVerses = (dua_id, from, to) => ({ dua_id, part: 1, candidates: [], quran: { from, to } });
/** A stand-in recitation service whose address for a verse comes from `addresses`. */
const fakeService = (addresses, reciter = 7) => ({
  async recitation([verse]) {
    if (!addresses[verse]) throw new Unavailable("no reciter has every verse");
    return { urls: [addresses[verse]], reciter: { id: reciter, name: "x" } };
  },
});

test("every listed verse is checked once with the default reciter", async (t) => {
  const { base, requests } = await serve(t, { "/285.mp3": [ok], "/286.mp3": [ok] });
  const service = fakeService({ "2:285": `${base}/285.mp3`, "2:286": `${base}/286.mp3` });
  const recordings = [withVerses(1, "2:285", "2:286"), withVerses(2, "2:286", "2:286"), recording(3, `${base}/x.mp3`)];
  assert.deepEqual(await checkVerses(recordings, service), { checked: 2, failures: [] });
  assert.equal(requests.length, 2);
});

test("a verse that is not found, or has no recitation by the default reciter, is named with its parts", async (t) => {
  const { base, requests } = await serve(t, {});
  const missing = await checkVerses([withVerses(1, "1:5", "1:5")], fakeService({ "1:5": `${base}/gone.mp3` }));
  assert.deepEqual(missing.failures, [{ verse: "1:5", problem: "HTTP 404", parts: ["dua 1 part 1"] }]);
  assert.equal(requests.length, 2, "tried once more");
  const none = await checkVerses([withVerses(1, "1:5", "1:5")], fakeService({}));
  assert.match(none.failures[0].problem, /unavailable/);
});

test("without credentials the command passes and says how many verses it did not check", async (t) => {
  const { base } = await serve(t, { "/1.mp3": [ok] });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "audio-check-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, "list.json");
  fs.writeFileSync(file, JSON.stringify({ version: 2, recordings: [recording(1, `${base}/1.mp3`), withVerses(2, "2:285", "2:286")] }));
  const env = { ...process.env, QF_CLIENT_ID: "", QF_CLIENT_SECRET: "", QF_OAUTH2_BASE_URL: "", QF_API_BASE_URL: "" };
  const result = await new Promise((resolve) => {
    execFile(process.execPath, [SCRIPT, file], { env }, (err, stdout) => resolve({ code: err?.code ?? 0, stdout }));
  });
  assert.equal(result.code, 0);
  assert.match(result.stdout, /1 recording address\(es\) checked, 0 failed/);
  assert.match(result.stdout, /2 listed Quran verse\(s\) not checked: no Quran Foundation credentials/);
});

test("with credentials the command asks the source for each verse and fails when one has none", async (t) => {
  const source = await fakeSource({ audio: () => null });
  t.after(source.close);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "audio-check-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, "list.json");
  fs.writeFileSync(file, JSON.stringify({ version: 2, recordings: [withVerses(2, "1:5", "1:5")] }));
  const env = { ...process.env, QF_CLIENT_ID: "id", QF_CLIENT_SECRET: "top-secret", QF_OAUTH2_BASE_URL: source.base, QF_API_BASE_URL: source.base };
  const result = await new Promise((resolve) => {
    execFile(process.execPath, [SCRIPT, file], { env }, (err, stdout, stderr) => resolve({ code: err?.code ?? 0, stdout, stderr }));
  });
  assert.equal(result.code, 1);
  assert.match(result.stderr, /FAIL  verse 1:5:[\s\S]*used by dua 2 part 1/);
  assert.match(result.stdout, /1 listed Quran verse\(s\) checked, 1 failed/);
  assert.doesNotMatch(result.stdout + result.stderr, /top-secret|invented-token/);
});

test("the command prints the failures, changes nothing and exits 1; with all working it exits 0", async (t) => {
  const { base } = await serve(t, { "/1.mp3": [ok] });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "audio-check-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, "list.json");
  const run = (recordings) => {
    const text = JSON.stringify({ version: 1, recordings });
    fs.writeFileSync(file, text);
    return new Promise((resolve) => {
      execFile(process.execPath, [SCRIPT, file], (err, stdout, stderr) => {
        assert.equal(fs.readFileSync(file, "utf8"), text);
        resolve({ code: err?.code ?? 0, stdout, stderr });
      });
    });
  };
  const good = await run([recording(1, `${base}/1.mp3`)]);
  assert.equal(good.code, 0);
  assert.match(good.stdout, /1 recording address\(es\) checked, 0 failed/);
  const bad = await run([recording(1, `${base}/1.mp3`), recording(2, `${base}/2.mp3`)]);
  assert.equal(bad.code, 1);
  assert.match(bad.stderr, /\/2\.mp3: HTTP 404[\s\S]*dua 2 part 1/);
});
