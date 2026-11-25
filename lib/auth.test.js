import test from "node:test";
import assert from "node:assert/strict";
import { jwtCallback, sessionCallback } from "./auth-callbacks.js";

const googleLogin = {
  token: { name: "A Reader", email: "reader@example.com", picture: "https://x/y.png", sub: "12345" },
  account: { provider: "google", providerAccountId: "12345" },
  profile: { sub: "12345", name: "A Reader", email: "reader@example.com", picture: "https://x/y.png" },
};

test("sign-in keeps only the Google account id in the token", () => {
  assert.deepEqual(jwtCallback(googleLogin), { accountId: "google:12345" });
});

test("a later request keeps the account id and nothing else", () => {
  const token = { accountId: "google:12345", name: "A Reader", email: "reader@example.com" };
  assert.deepEqual(jwtCallback({ token }), { accountId: "google:12345" });
});

test("a token with no account id stays empty", () => {
  assert.deepEqual(jwtCallback({ token: { name: "x" } }), {});
});

test("the session has only the account id and the end time", () => {
  const session = sessionCallback({
    session: { user: { name: "A Reader", email: "reader@example.com", image: "x" }, expires: "2026-12-25T00:00:00.000Z" },
    token: { accountId: "google:12345", email: "reader@example.com" },
  });
  assert.deepEqual(session, { accountId: "google:12345", expires: "2026-12-25T00:00:00.000Z" });
  assert.equal("user" in session, false);
});
