import test from "node:test";
import assert from "node:assert/strict";
import { QF_VARIABLES, quranConfig, quranConfigured } from "./config.js";
import { createQuranClient } from "./client.js";
import { fakeSource } from "./test-helpers.js";

const full = { QF_CLIENT_ID: "id", QF_CLIENT_SECRET: "secret", QF_OAUTH2_BASE_URL: "https://a.example", QF_API_BASE_URL: "https://b.example" };

test("all four variables together make the source set up", () => {
  assert.deepEqual(quranConfig(full), { clientId: "id", clientSecret: "secret", oauth2BaseUrl: "https://a.example", apiBaseUrl: "https://b.example" });
  assert.equal(quranConfigured(full), true);
});

test("any missing or empty variable means not set up", () => {
  for (const name of QF_VARIABLES) {
    for (const value of [undefined, "", "   "]) assert.equal(quranConfigured({ ...full, [name]: value }), false, `${name}=${value}`);
  }
  assert.equal(quranConfigured({}), false);
});

test("the client asks the configured servers, with the audio scope only and the headers the API needs", async (t) => {
  const source = await fakeSource();
  t.after(source.close);
  const client = createQuranClient({ clientId: "id", clientSecret: "secret", oauth2BaseUrl: source.base, apiBaseUrl: source.base });
  const reciters = await client.content.v4.resources.recitations.list();
  assert.deepEqual(reciters.map((r) => [r.id, r.translatedName.name]), [[1, "Reciter One"], [7, "Reciter Seven"]]);
  const { audioFiles } = await client.content.v4.audio.verseRecitation.byKey("2:255", "7");
  assert.deepEqual(audioFiles.map((f) => [f.verseKey, f.audioUrl]), [["2:255", "https://verses.quran.com/Invented7/mp3/002255.mp3"]]);
  assert.deepEqual(source.requests.map((r) => r.path), [
    "/oauth2/token",
    "/content/api/v4/resources/recitations",
    "/content/api/v4/recitations/7/by_ayah/2:255",
  ]);
  assert.equal(source.requests[1].headers["x-auth-token"], "invented-token");
  assert.equal(source.requests[1].headers["x-client-id"], "id");
});
