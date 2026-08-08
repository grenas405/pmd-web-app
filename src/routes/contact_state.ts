/**
 * contact_state.ts — the result of a submission, in the vocabulary the page
 * renders. Kept apart from the handler so the page module depends on a type,
 * not on the HTTP layer.
 */

export type ContactStatus = "idle" | "sent" | "invalid" | "limited" | "error";

export interface ContactFormState {
  readonly status: ContactStatus;
  /** Shown in the form's status line. Always a fixed, public sentence. */
  readonly message?: string;
  /** Field name -> message, for inline errors. */
  readonly errors?: Readonly<Record<string, string>>;
  /** Values echoed back so a rejected submission is not retyped. */
  readonly values?: Readonly<Record<string, string>>;
}

export const IDLE_FORM: ContactFormState = { status: "idle" };

export const SENT_MESSAGE =
  "Thank you — your message is in. I read every one myself and usually reply within one business day.";
