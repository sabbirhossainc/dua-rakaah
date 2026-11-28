// General feedback (design D10, D11 of apply-audit-pages-and-feedback): the field rules shared by the form and the
// server, and the server's handling of a submission. Pure apart from what the caller passes in, so it can be tested
// without a network or an email service.

export const FEEDBACK_TYPES = Object.freeze(["bug", "correction", "suggestion"]);
export const NAME_MAX = 100;
export const MESSAGE_MIN = 10;
export const MESSAGE_MAX = 5000;
export const RATE_LIMIT = 5;
export const RATE_WINDOW_MS = 10 * 60 * 1000;
/** The largest body the route reads, in bytes. */
export const BODY_MAX = 16 * 1024;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const text = (v) => (typeof v === "string" ? v.trim() : "");

/**
 * The submission's fields, trimmed, and what is wrong with them: `{ value, errors }`, where `errors` maps a field to
 * the i18n key of its problem and is empty when the submission is valid.
 */
export function validateFeedback(input) {
  const value = {
    name: text(input?.name),
    email: text(input?.email),
    type: text(input?.type),
    message: text(input?.message),
    lang: input?.lang === "bn" ? "bn" : "en",
  };
  const errors = {};
  if (value.name.length > NAME_MAX) errors.name = "feedbackErrorNameLength";
  if (value.email && (value.email.length > 254 || !EMAIL.test(value.email))) errors.email = "feedbackErrorEmail";
  if (!FEEDBACK_TYPES.includes(value.type)) errors.type = "feedbackErrorType";
  if (!value.message) errors.message = "feedbackErrorRequired";
  else if (value.message.length < MESSAGE_MIN || value.message.length > MESSAGE_MAX) errors.message = "feedbackErrorMessageLength";
  return { value, errors };
}

const ENTITIES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ENTITIES[c]);

const TYPE_NAMES = { bug: "Bug", correction: "Dua or hadith correction", suggestion: "UI or feature suggestion" };

/** The email for one valid submission. Every value is escaped in the HTML part. */
export function feedbackEmail(value) {
  const rows = [
    ["Type", TYPE_NAMES[value.type]],
    ["Name", value.name || "(not given)"],
    ["Email", value.email || "(not given)"],
    ["Page language", value.lang],
  ];
  return {
    subject: `[Feedback] ${TYPE_NAMES[value.type]}`,
    text: `${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\n${value.message}\n`,
    html:
      `<table>${rows.map(([k, v]) => `<tr><th align="left">${k}</th><td>${escapeHtml(v)}</td></tr>`).join("")}</table>` +
      `<p style="white-space:pre-wrap">${escapeHtml(value.message)}</p>`,
  };
}

/** A sliding-window limit per key, in memory: per server instance, forgotten on restart (design D10). */
export function createLimiter({ limit = RATE_LIMIT, windowMs = RATE_WINDOW_MS } = {}) {
  const hits = new Map();
  const recent = (key, now) => (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  return {
    allowed(key, now) {
      const list = recent(key, now);
      if (list.length) hits.set(key, list);
      else hits.delete(key);
      return list.length < limit;
    },
    record(key, now) {
      hits.set(key, [...recent(key, now), now]);
    },
  };
}

const json = (status, body) => Response.json(body, { status });

/** The sender's network address, as the proxy in front of the app reports it. */
export function senderKey(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown";
}

/**
 * Handles `POST /api/general-feedbacks`.
 *
 * @param {Request} request
 * @param {{ env: { RESEND_API_KEY?: string, FEEDBACK_TO_EMAIL?: string, FEEDBACK_FROM_EMAIL?: string },
 *           send: (key: string, email: object) => Promise<{ error?: unknown }>,
 *           limiter: ReturnType<typeof createLimiter>, now?: () => number }} deps
 */
export async function handleFeedback(request, { env, send, limiter, now = Date.now }) {
  let body;
  try {
    const raw = await request.text();
    if (raw.length > BODY_MAX) return json(413, { ok: false });
    body = JSON.parse(raw);
  } catch {
    return json(400, { ok: false, errors: { body: "invalid" } });
  }
  // The hidden field only a robot fills: answered as if accepted, and nothing is sent.
  if (text(body?.website)) return json(200, { ok: true });

  const { value, errors } = validateFeedback(body);
  if (Object.keys(errors).length) return json(400, { ok: false, errors });

  const key = senderKey(request);
  const at = now();
  if (!limiter.allowed(key, at)) return json(429, { ok: false });

  if (!env.RESEND_API_KEY || !env.FEEDBACK_TO_EMAIL) return json(503, { ok: false });

  const email = feedbackEmail(value);
  let result;
  try {
    result = await send(env.RESEND_API_KEY, {
      from: env.FEEDBACK_FROM_EMAIL || "Dua & Raka'ah <onboarding@resend.dev>",
      to: env.FEEDBACK_TO_EMAIL,
      ...(value.email ? { replyTo: value.email } : {}),
      ...email,
    });
  } catch {
    result = { error: true };
  }
  // The service's own error text stays on the server.
  if (result?.error) {
    console.error("feedback: email not sent");
    return json(502, { ok: false });
  }
  limiter.record(key, at);
  return json(200, { ok: true });
}
