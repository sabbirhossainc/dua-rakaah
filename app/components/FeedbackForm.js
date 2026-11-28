"use client";
// The General Feedback form (design D11 of apply-audit-pages-and-feedback). The fields are checked here by the same
// rules as on the server, problems are shown next to their field, and the result is announced. Offline, nothing is
// sent and what was typed stays.
import { useId, useRef, useState } from "react";
import Button from "@/app/components/ui/Button";
import { FEEDBACK_TYPES, MESSAGE_MAX, NAME_MAX, validateFeedback } from "@/lib/feedback";
import { t } from "@/lib/i18n";

const EMPTY = { name: "", email: "", type: "", message: "", website: "" };
const TYPE_LABELS = { bug: "feedbackTypeBug", correction: "feedbackTypeCorrection", suggestion: "feedbackTypeSuggestion" };
const ORDER = ["name", "email", "type", "message"];
const FIELD = "min-h-11 w-full rounded-tile border border-edge bg-surface px-3 py-2 text-ui text-ink aria-invalid:border-danger";

function Field({ id, label, error, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-ui font-semibold text-ink">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-label text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export default function FeedbackForm({ lang }) {
  const base = useId();
  const ids = Object.fromEntries(ORDER.map((name) => [name, `${base}-${name}`]));
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  // idle | sending | sent | failed | limited | offline
  const [status, setStatus] = useState("idle");
  const formRef = useRef(null);

  const set = (name) => (event) => setValues((v) => ({ ...v, [name]: event.target.value }));
  const describe = (name) => (errors[name] ? { "aria-invalid": true, "aria-describedby": `${ids[name]}-error` } : {});

  async function submit(event) {
    event.preventDefault();
    const found = validateFeedback({ ...values, lang }).errors;
    setErrors(found);
    const first = ORDER.find((name) => found[name]);
    if (first) {
      setStatus("idle");
      formRef.current?.querySelector(`#${CSS.escape(ids[first])}`)?.focus();
      return;
    }
    if (!navigator.onLine) {
      setStatus("offline");
      return;
    }
    setStatus("sending");
    try {
      const response = await fetch("/api/general-feedbacks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...values, lang }),
      });
      if (response.ok) {
        setValues(EMPTY);
        setStatus("sent");
      } else {
        setStatus(response.status === 429 ? "limited" : "failed");
      }
    } catch {
      setStatus(navigator.onLine ? "failed" : "offline");
    }
  }

  const problem = { failed: "feedbackFailed", limited: "feedbackTooMany", offline: "feedbackOffline" }[status];
  const sending = status === "sending";
  return (
    <form ref={formRef} noValidate onSubmit={submit} className="flex max-w-[640px] flex-col gap-5" data-feedback-form>
      <Field id={ids.name} label={t(lang, "feedbackName")} error={errors.name && t(lang, errors.name)}>
        <input id={ids.name} name="name" autoComplete="name" maxLength={NAME_MAX} value={values.name} onChange={set("name")} className={FIELD} {...describe("name")} />
      </Field>
      <Field id={ids.email} label={t(lang, "feedbackEmail")} error={errors.email && t(lang, errors.email)}>
        <input id={ids.email} name="email" type="email" autoComplete="email" value={values.email} onChange={set("email")} className={FIELD} {...describe("email")} />
      </Field>
      <Field id={ids.type} label={t(lang, "feedbackType")} error={errors.type && t(lang, errors.type)}>
        <select id={ids.type} name="type" required value={values.type} onChange={set("type")} className={`${FIELD} cursor-pointer`} {...describe("type")}>
          <option value="" disabled>
            {t(lang, "feedbackType")}
          </option>
          {FEEDBACK_TYPES.map((type) => (
            <option key={type} value={type}>
              {t(lang, TYPE_LABELS[type])}
            </option>
          ))}
        </select>
      </Field>
      <Field id={ids.message} label={t(lang, "feedbackMessage")} error={errors.message && t(lang, errors.message)}>
        <textarea id={ids.message} name="message" required rows={6} maxLength={MESSAGE_MAX} value={values.message} onChange={set("message")} className={FIELD} {...describe("message")} />
      </Field>
      {/* Only a robot fills this: hidden from sight, from screen readers and from the keyboard. */}
      <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" value={values.website} onChange={set("website")} />
        </label>
      </div>
      <div>
        <Button type="submit" disabled={sending}>
          {t(lang, sending ? "feedbackSending" : "feedbackSend")}
        </Button>
      </div>
      <p role="status" className="text-ui font-semibold text-ink empty:hidden" data-feedback-sent>
        {status === "sent" ? t(lang, "feedbackSent") : ""}
      </p>
      <p role="alert" className="text-ui font-semibold text-danger empty:hidden" data-feedback-error>
        {problem ? t(lang, problem) : ""}
      </p>
    </form>
  );
}
