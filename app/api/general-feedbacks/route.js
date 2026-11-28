// General feedback, delivered by email through Resend (design D10 of apply-audit-pages-and-feedback). The API key and
// the team's address are read here, on the server, and never reach the browser.
import "server-only";
import { Resend } from "resend";
import { createLimiter, handleFeedback } from "@/lib/feedback";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const limiter = createLimiter();

const send = (key, email) => new Resend(key).emails.send(email);

export function POST(request) {
  return handleFeedback(request, {
    env: {
      RESEND_API_KEY: process.env.RESEND_API_KEY,
      FEEDBACK_TO_EMAIL: process.env.FEEDBACK_TO_EMAIL,
      FEEDBACK_FROM_EMAIL: process.env.FEEDBACK_FROM_EMAIL,
    },
    send,
    limiter,
  });
}
