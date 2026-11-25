import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { signOwnerId, verifyOwnerCookie } from "./cookie.js";

const SECRET = "test-secret-one";

test("a signed id verifies and returns the id", () => {
  const id = randomUUID();
  assert.equal(verifyOwnerCookie(signOwnerId(id, SECRET), SECRET), id);
});

test("a changed id, a changed signature, a missing dot, an empty value and another secret all fail", () => {
  const id = randomUUID();
  const good = signOwnerId(id, SECRET);
  const sig = good.slice(good.indexOf(".") + 1);
  assert.equal(verifyOwnerCookie(`${randomUUID()}.${sig}`, SECRET), null);
  assert.equal(verifyOwnerCookie(`${id}.${sig.slice(0, -1)}${sig.endsWith("0") ? "1" : "0"}`, SECRET), null);
  assert.equal(verifyOwnerCookie(id, SECRET), null);
  assert.equal(verifyOwnerCookie("", SECRET), null);
  assert.equal(verifyOwnerCookie(good, "another-secret"), null);
});

test("odd values never throw", () => {
  for (const v of [undefined, null, 5, ".", "..", "x.y", `${randomUUID()}.zz`, `${randomUUID()}.`]) {
    assert.equal(verifyOwnerCookie(v, SECRET), null);
  }
  assert.equal(verifyOwnerCookie(signOwnerId(randomUUID(), SECRET), ""), null);
});

test("signing without a secret is an error", () => {
  assert.throws(() => signOwnerId(randomUUID(), ""), /ANON_COOKIE_SECRET/);
});
