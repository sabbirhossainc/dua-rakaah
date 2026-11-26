import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { checkRecordings } from "./check-audio.mjs";

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
