import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { groupDuas } from "../content.js";
import { DEFAULT_INPUTS, computeBuildRevision } from "../build-revision.js";
import { withRecordings } from "./lookup.js";
import { textSha } from "./parts.js";

const row = (id, arabic) => ({ id, cat_id: 1, subcat_id: 1, dua_id: id, dua_arabic: arabic });
const entry = (dua_id, part, arabic, ...urls) => ({ dua_id, part, text_sha: textSha(arabic), candidates: urls.map((url) => ({ url })) });
const audioOf = (rows, ...recordings) =>
  withRecordings(groupDuas(rows, "en"), { version: 1, recordings }).map((d) => d.parts.map((p) => p.audio));

test("a matching part gets its addresses in play order", () => {
  assert.deepEqual(audioOf([row(4, "ا"), row(4, "ب")], entry(4, 2, "ب", "u1", "u2")), [
    [null, { key: "4:2", urls: ["u1", "u2"] }],
  ]);
});

test("a changed text gets no recording, even for a change of one mark", () => {
  assert.deepEqual(audioOf([row(4, "ا ")], entry(4, 1, "ا", "u")), [[null]]);
});

test("a recording for a part or dua that is not there is ignored", () => {
  assert.deepEqual(audioOf([row(4, "ا")], entry(4, 2, "ا", "u"), entry(9, 1, "ا", "u")), [[null]]);
});

test("a part without Arabic text and an entry without recordings get nothing", () => {
  assert.deepEqual(audioOf([row(4, null), row(5, "ا")], entry(4, 1, "", "u"), entry(5, 1, "ا")), [[null], [null]]);
});

test("the same text in two parts does not share a recording", () => {
  assert.deepEqual(audioOf([row(4, "ا"), row(4, "ا")], entry(4, 1, "ا", "u")), [[{ key: "4:1", urls: ["u"] }, null]]);
});

test("the other fields are kept and the input is not changed", () => {
  const duas = groupDuas([row(4, "ا")], "en");
  const [out] = withRecordings(duas, { recordings: [entry(4, 1, "ا", "u")] });
  assert.equal(out.id, 4);
  assert.equal(out.parts[0].arabic, "ا");
  assert.equal("audio" in duas[0].parts[0], false);
});

test("a changed list of recordings changes the build revision", (t) => {
  assert.ok(DEFAULT_INPUTS.includes("data/audio-sources.json"));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "audio-revision-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.mkdirSync(path.join(dir, "data"));
  const list = path.join(dir, "data", "audio-sources.json");
  fs.writeFileSync(list, '{"recordings":[1]}');
  const before = computeBuildRevision(dir);
  fs.writeFileSync(list, '{"recordings":[]}');
  assert.notEqual(computeBuildRevision(dir), before);
});
