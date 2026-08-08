/**
 * html.ts — a tagged template that escapes by default.
 *
 * There is no template engine here and no virtual DOM. There is one rule:
 * every interpolated value is HTML-escaped unless it is already an `Html`
 * value produced by this module. Escaping is therefore the default and
 * "trust me" has to be typed out (`raw`), which makes it greppable.
 */

const HTML = Symbol("html");

export interface Html {
  readonly [HTML]: true;
  readonly value: string;
}

/** Wrap an already-safe string. Every call site is an auditable decision. */
export function raw(value: string): Html {
  return { [HTML]: true, value };
}

export function isHtml(value: unknown): value is Html {
  return typeof value === "object" && value !== null && HTML in value;
}

/** Escape the five characters that change meaning inside markup. Pure. */
export function escapeHtml(input: string): string {
  let out = "";
  for (const char of input) {
    switch (char) {
      case "&":
        out += "&amp;";
        break;
      case "<":
        out += "&lt;";
        break;
      case ">":
        out += "&gt;";
        break;
      case '"':
        out += "&quot;";
        break;
      case "'":
        out += "&#39;";
        break;
      default:
        out += char;
    }
  }
  return out;
}

/**
 * Escape a string for use inside a `<script type="application/json">` body.
 * JSON is not HTML: `</script>` inside a string literal would end the element.
 */
export function escapeJsonForScript(json: string): string {
  return json
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}

type Value = Html | string | number | boolean | null | undefined | readonly Value[];

function renderValue(value: Value): string {
  if (value === null || value === undefined || value === false || value === true) return "";
  if (isHtml(value)) return value.value;
  if (Array.isArray(value)) return value.map(renderValue).join("");
  return escapeHtml(String(value));
}

/** html`<p>${untrusted}</p>` — interpolations are escaped, nesting is safe. */
export function html(strings: TemplateStringsArray, ...values: readonly Value[]): Html {
  let out = strings[0] ?? "";
  for (let i = 0; i < values.length; i++) {
    out += renderValue(values[i] as Value) + (strings[i + 1] ?? "");
  }
  return raw(out);
}

/** Join a list of fragments with a separator, keeping everything escaped. */
export function join(parts: readonly Html[], separator = ""): Html {
  return raw(parts.map((part) => part.value).join(separator));
}

/** Final step before the wire. Nothing downstream may append to this. */
export function renderToString(document: Html): string {
  return document.value;
}
