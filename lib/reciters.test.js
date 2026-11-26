import test from "node:test";
import assert from "node:assert/strict";
import { loadReciters, selectedReciter } from "./reciters.js";

const LIST = [
  { id: 1, name: "One", style: null },
  { id: 7, name: "Seven", style: "Murattal" },
];
const reply = (status, body) => async () => ({ ok: status === 200, status, json: async () => body });

test("with nothing saved, recitation 7 shows as chosen", () => {
  assert.equal(selectedReciter(null, LIST), "7");
});

test("a saved reciter on the list shows as chosen", () => {
  assert.equal(selectedReciter("1", LIST), "1");
});

test("a saved reciter that is no longer listed shows recitation 7", () => {
  assert.equal(selectedReciter("999", LIST), "7");
});

test("the list is asked from this app's server and nothing is saved", async () => {
  const asked = [];
  const request = async (...args) => (asked.push(args), reply(200, { reciters: LIST, default: 7 })());
  assert.deepEqual(await loadReciters(request), { status: "ok", reciters: LIST });
  assert.deepEqual(asked, [["/api/reciters", { cache: "no-store" }]]);
});

test("a source that is not set up hides the choice", async () => {
  assert.deepEqual(await loadReciters(reply(404, {})), { status: "hidden" });
});

test("a list that cannot be loaded says so", async () => {
  const bad = [
    reply(503, {}),
    reply(500, {}),
    reply(200, {}),
    reply(200, { reciters: [] }),
    reply(200, { reciters: [{ id: "1", name: "x" }] }),
    async () => {
      throw new TypeError("network");
    },
  ];
  for (const request of bad) assert.deepEqual(await loadReciters(request), { status: "failed" });
});
