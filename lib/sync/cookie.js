// The signed cookie that binds a browser to its anonymous owner id (design D3).
// Format: `<owner id>.<hex HMAC-SHA-256 of the id>`. Server side only (uses node:crypto).
import { createHmac, timingSafeEqual } from "node:crypto";
import { isUuid } from "./records.js";

export const ANON_COOKIE = "dua_anon";

function mac(id, secret) {
  return createHmac("sha256", secret).update(id).digest("hex");
}

export function signOwnerId(id, secret) {
  if (!secret) throw new Error("ANON_COOKIE_SECRET is not set");
  return `${id}.${mac(id, secret)}`;
}

/** Returns the owner id when the signature is right, otherwise null. */
export function verifyOwnerCookie(value, secret) {
  if (!secret || typeof value !== "string") return null;
  const dot = value.indexOf(".");
  if (dot < 0) return null;
  const id = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  if (!isUuid(id)) return null;
  const expected = Buffer.from(mac(id, secret), "hex");
  const given = Buffer.from(sig, "hex");
  // Buffer.from(…, "hex") stops at the first bad character, so compare lengths as well.
  if (given.length !== expected.length || sig.length !== expected.length * 2) return null;
  return timingSafeEqual(given, expected) ? id : null;
}
