import test from "node:test";
import assert from "node:assert/strict";
import { createLimiter, escapeHtml, feedbackEmail, handleFeedback, validateFeedback } from "./feedback.js";

const VALID = { name: "Aisha", email: "reader@example.com", type: "correction", message: "The reference of dua 45 is wrong.", lang: "en" };
const ENV = { RESEND_API_KEY: "re_test", FEEDBACK_TO_EMAIL: "team@example.com" };

function post(body, ip = "203.0.113.1") {
  return new Request("http://localhost/api/general-feedbacks", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `${ip}, 10.0.0.1` },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function deps(overrides = {}) {
  const sent = [];
  return {
    sent,
    env: ENV,
    limiter: createLimiter(),
    send: async (key, email) => {
      sent.push({ key, email });
      return { data: { id: "1" } };
    },
    ...overrides,
  };
}

test("a valid submission has no errors, and its fields are trimmed", () => {
  const { value, errors } = validateFeedback({ ...VALID, name: "  Aisha " });
  assert.deepEqual(errors, {});
  assert.equal(value.name, "Aisha");
});

test("every field rule", () => {
  const err = (patch) => validateFeedback({ ...VALID, ...patch }).errors;
  assert.equal(err({ message: "" }).message, "feedbackErrorRequired");
  assert.equal(err({ message: "short" }).message, "feedbackErrorMessageLength");
  assert.equal(err({ message: "x".repeat(5001) }).message, "feedbackErrorMessageLength");
  assert.equal(err({ email: "abc" }).email, "feedbackErrorEmail");
  assert.deepEqual(err({ email: "" }), {}, "email is optional");
  assert.deepEqual(err({ name: "" }), {}, "name is optional");
  assert.equal(err({ name: "x".repeat(101) }).name, "feedbackErrorNameLength");
  assert.equal(err({ type: "other" }).type, "feedbackErrorType");
  assert.equal(validateFeedback({ ...VALID, lang: "fr" }).value.lang, "en");
});

test("markup in the message is escaped in the email", () => {
  const { html, subject } = feedbackEmail({ ...VALID, message: "<script>alert(1)</script>" });
  assert.ok(html.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
  assert.ok(!html.includes("<script>"));
  assert.equal(subject, "[Feedback] Dua or hadith correction");
  assert.equal(escapeHtml(`"'&`), "&quot;&#39;&amp;");
});

test("a valid submission is sent once, with the reply going to the reader", async () => {
  const d = deps();
  const res = await handleFeedback(post(VALID), d);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
  assert.equal(d.sent.length, 1);
  assert.equal(d.sent[0].key, "re_test");
  assert.equal(d.sent[0].email.to, "team@example.com");
  assert.equal(d.sent[0].email.replyTo, "reader@example.com");
});

test("no reply address without an email", async () => {
  const d = deps();
  await handleFeedback(post({ ...VALID, email: "" }), d);
  assert.equal("replyTo" in d.sent[0].email, false);
});

test("an invalid body is refused with its fields, and nothing is sent", async () => {
  const d = deps();
  const res = await handleFeedback(post({ ...VALID, type: "other" }), d);
  assert.equal(res.status, 400);
  assert.deepEqual(Object.keys((await res.json()).errors), ["type"]);
  assert.equal((await handleFeedback(post("{not json"), d)).status, 400);
  assert.equal((await handleFeedback(post({ ...VALID, message: "x".repeat(20000) }), d)).status, 413);
  assert.equal(d.sent.length, 0);
});

test("the honeypot is answered as accepted and nothing is sent", async () => {
  const d = deps();
  const res = await handleFeedback(post({ ...VALID, website: "http://spam.example" }), d);
  assert.equal(res.status, 200);
  assert.equal(d.sent.length, 0);
});

test("a sixth submission within 10 minutes is refused, and one later is accepted", async () => {
  let clock = 1_000_000;
  const d = deps({ now: () => clock });
  for (let i = 0; i < 5; i++) assert.equal((await handleFeedback(post(VALID), d)).status, 200);
  assert.equal((await handleFeedback(post(VALID), d)).status, 429);
  assert.equal((await handleFeedback(post(VALID, "198.51.100.7"), d)).status, 200, "another sender is not limited");
  clock += 10 * 60 * 1000;
  assert.equal((await handleFeedback(post(VALID), d)).status, 200);
});

test("not configured gives 503, a failed delivery 502, and neither leaks the service's error", async () => {
  const d = deps({ env: { FEEDBACK_TO_EMAIL: "team@example.com" } });
  assert.equal((await handleFeedback(post(VALID), d)).status, 503);
  assert.equal(d.sent.length, 0);
  const failing = deps({ send: async () => ({ error: { message: "secret detail re_test" } }) });
  const original = console.error;
  console.error = () => {};
  const res = await handleFeedback(post(VALID), failing);
  console.error = original;
  assert.equal(res.status, 502);
  assert.equal(JSON.stringify(await res.json()).includes("secret"), false);
});
