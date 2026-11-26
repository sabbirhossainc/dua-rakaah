import test from "node:test";
import assert from "node:assert/strict";
import { jwtCallback, sessionCallback } from "./auth-callbacks.js";

const googleLogin = {
  token: { name: "A Reader", email: "reader@example.com", picture: "https://x/y.png", sub: "12345" },
  account: { provider: "google", providerAccountId: "12345" },
  profile: { sub: "12345", name: "A Reader", email: "reader@example.com", picture: "https://x/y.png" },
};

test("sign-in keeps only the Google account id and the time of sign-in in the token", () => {
  const before = Date.now();
  const token = jwtCallback(googleLogin);
  assert.deepEqual(Object.keys(token).sort(), ["accountId", "signedInAt"]);
  assert.equal(token.accountId, "google:12345");
  assert.ok(token.signedInAt >= before && token.signedInAt <= Date.now());
});

test("a later request keeps the time of sign-in unchanged", () => {
  const token = { accountId: "google:12345", signedInAt: 1000, email: "reader@example.com" };
  assert.deepEqual(jwtCallback({ token }), { accountId: "google:12345", signedInAt: 1000 });
});

test("a token from before the time was recorded keeps the account id and nothing else", () => {
  const token = { accountId: "google:12345", name: "A Reader", email: "reader@example.com" };
  assert.deepEqual(jwtCallback({ token }), { accountId: "google:12345" });
});

test("a token with no account id stays empty", () => {
  assert.deepEqual(jwtCallback({ token: { name: "x" } }), {});
});

test("the session has only the account id, the time of sign-in and the end time", () => {
  const session = sessionCallback({
    session: { user: { name: "A Reader", email: "reader@example.com", image: "x" }, expires: "2026-12-25T00:00:00.000Z" },
    token: { accountId: "google:12345", signedInAt: 1000, email: "reader@example.com" },
  });
  assert.deepEqual(session, { accountId: "google:12345", signedInAt: 1000, expires: "2026-12-25T00:00:00.000Z" });
  assert.equal("user" in session, false);
});

test("a session whose token has no time of sign-in counts as 0", () => {
  assert.equal(sessionCallback({ session: {}, token: { accountId: "google:12345" } }).signedInAt, 0);
});
