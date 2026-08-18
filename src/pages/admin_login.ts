/**
 * admin_login.ts — the door.
 *
 * No masthead, no footer, no navigation: there is nothing here to explore and
 * offering links would only be an invitation. One field, one button, and a
 * canvas of scrolling pseudo-code behind it.
 *
 * The error text never says which half was wrong, or whether an account exists.
 */

import { type Html, html } from "../render/html.ts";
import type { RenderContext } from "../render/context.ts";
import { layout } from "../render/layout.ts";

export interface LoginState {
  readonly error?: string;
}

export function renderLogin(context: RenderContext, state: LoginState): Html {
  const main = html`
    <div class="signin">
      <canvas class="signin__rain" data-coderain aria-hidden="true"></canvas>

      <div class="signin__panel">
        <p class="signin__eyebrow">
          <span class="signin__dot" aria-hidden="true"></span>
          Restricted
        </p>
        <h1 class="signin__title">Sign in</h1>

        ${state.error === undefined
          ? html``
          : html`<p class="signin__error" role="alert">${state.error}</p>`}

        <form class="signin__form" method="post" action="/admin">
          <label class="signin__label" for="password">Password</label>
          <input
            class="signin__input"
            id="password"
            name="password"
            type="password"
            autocomplete="current-password"
            required
            autofocus
            data-signin-input
          />
          <button class="button button--solid signin__submit" type="submit">Continue</button>
        </form>
      </div>
    </div>
  `;

  return layout(
    context,
    {
      title: "Sign in",
      description: "Administration.",
      path: "/admin",
      // No ambient background, no JSON-LD, and no navigation to anywhere.
      full: false,
      chrome: false,
    },
    main,
  );
}
