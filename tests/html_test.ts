/**
 * The escaping tests. If these fail, the site has a cross-site scripting bug,
 * so they cover the hostile cases rather than the happy path.
 */

import { assert, assertEquals } from "@std/assert";
import { escapeHtml, escapeJsonForScript, html, join, raw } from "../src/render/html.ts";

Deno.test("escapeHtml neutralises every character that changes markup meaning", () => {
  assertEquals(escapeHtml(`<script>alert("x")&'`), "&lt;script&gt;alert(&quot;x&quot;)&amp;&#39;");
});

Deno.test("interpolated values are escaped by default", () => {
  const payload = `"><img src=x onerror=alert(1)>`;
  const out = html`<p>${payload}</p>`.value;
  // The payload survives as text — that is the point — but it is no longer
  // markup, so the browser never sees a tag or an attribute here.
  assert(!out.includes("<img"), "raw tag survived interpolation");
  assertEquals(out, "<p>&quot;&gt;&lt;img src=x onerror=alert(1)&gt;</p>");
});

Deno.test("interpolation inside an attribute cannot break out of the quotes", () => {
  const payload = `x" onload="alert(1)`;
  const out = html`<a title="${payload}">link</a>`.value;
  assertEquals(out, `<a title="x&quot; onload=&quot;alert(1)">link</a>`);
});

Deno.test("nested Html fragments are inserted verbatim, values inside them are not", () => {
  const inner = html`<em>${"<b>"}</em>`;
  const out = html`<p>${inner}</p>`.value;
  assertEquals(out, "<p><em>&lt;b&gt;</em></p>");
});

Deno.test("arrays render each item with the same escaping rules", () => {
  const out = html`<ul>${["<a>", "b"].map((item) => html`<li>${item}</li>`)}</ul>`.value;
  assertEquals(out, "<ul><li>&lt;a&gt;</li><li>b</li></ul>");
});

Deno.test("null, undefined and booleans render as nothing", () => {
  assertEquals(html`[${null}${undefined}${false}${true}]`.value, "[]");
});

Deno.test("raw is the only escape hatch and it is explicit", () => {
  assertEquals(html`${raw("<hr>")}`.value, "<hr>");
});

Deno.test("join keeps fragments intact", () => {
  assertEquals(join([html`<i>a</i>`, html`<i>b</i>`], "|").value, "<i>a</i>|<i>b</i>");
});

Deno.test("JSON embedded in a script element cannot close it", () => {
  const json = JSON.stringify({ bio: "</script><script>alert(1)</script>" });
  const escaped = escapeJsonForScript(json);
  assert(!escaped.includes("</script>"), "closing tag survived");
  assertEquals(JSON.parse(escaped).bio, "</script><script>alert(1)</script>");
});

Deno.test("JSON line separators are escaped so the script stays parseable", () => {
  const separators = "x\u2028y\u2029z";
  const escaped = escapeJsonForScript(JSON.stringify({ a: separators }));
  assert(!escaped.includes("\u2028"), "U+2028 left unescaped");
  assert(!escaped.includes("\u2029"), "U+2029 left unescaped");
  assertEquals(JSON.parse(escaped).a, separators);
});
