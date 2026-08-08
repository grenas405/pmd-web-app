/**
 * contact.js — submit the contact form without leaving the page.
 *
 * The form already works: it is a real `<form method="post">` and the server
 * answers it with HTML. This module upgrades that to a `fetch`, and if
 * anything about the upgrade fails it steps aside and lets the browser submit
 * the form normally.
 */

const FIELDS = ["name", "email", "company", "message"];

function clearErrors(form) {
  for (const name of FIELDS) {
    const input = form.elements.namedItem(name);
    if (input instanceof HTMLElement) {
      input.removeAttribute("aria-invalid");
      input.removeAttribute("aria-describedby");
    }
    form.querySelector(`#${name}-error`)?.remove();
  }
}

function showError(form, name, message) {
  const input = form.elements.namedItem(name);
  if (!(input instanceof HTMLElement)) return;
  input.setAttribute("aria-invalid", "true");
  input.setAttribute("aria-describedby", `${name}-error`);

  const note = document.createElement("p");
  note.className = "field__error";
  note.id = `${name}-error`;
  note.textContent = message;
  input.after(note);
}

function setStatus(element, status, message) {
  element.className = `form__status form__status--${status}`;
  element.textContent = message;
  element.hidden = message === "";
}

export function initContactForm(root = document) {
  const form = root.querySelector("[data-contact-form]");
  if (!(form instanceof HTMLFormElement)) return;

  const status = form.querySelector("[data-form-status]");
  const submit = form.querySelector("button[type=submit]");
  if (status === null || !(submit instanceof HTMLButtonElement)) return;

  const originalLabel = submit.innerHTML;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearErrors(form);
    setStatus(status, "idle", "");
    submit.disabled = true;
    submit.textContent = "Sending…";

    try {
      const response = await fetch(form.action, {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          "accept": "application/json",
        },
        body: new URLSearchParams(new FormData(form)),
      });

      const payload = await response.json();

      if (response.ok && payload.ok === true) {
        form.reset();
        setStatus(status, "sent", payload.message ?? "Thank you — your message is in.");
        return;
      }

      const errors = payload.errors ?? {};
      for (const [name, message] of Object.entries(errors)) {
        if (typeof message === "string") showError(form, name, message);
      }
      const kind = response.status === 429 ? "limited" : "invalid";
      setStatus(status, kind, payload.message ?? "That could not be sent.");
    } catch {
      // Network failure, blocked request, unparseable answer: say so plainly
      // and offer the address that does not depend on this endpoint.
      const fallback = form.dataset.fallbackEmail ?? "";
      setStatus(
        status,
        "error",
        `The message could not be sent from here. Please email ${fallback} directly.`,
      );
    } finally {
      submit.innerHTML = originalLabel;
      submit.disabled = false;
    }
  });
}
