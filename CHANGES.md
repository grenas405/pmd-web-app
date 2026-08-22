# Changes

## Unreleased

### The stack, falling behind the page

`heavenlyroofingllc`'s tech-stack page opens with a Matrix rain on a canvas — columns of characters
descending with a bright head and a fading tail. The mechanism is worth taking; the specifics are
not, so the emerald became gold from this site's own tokens, and the random katakana became
something better.

- **What falls is real code.** Each column holds one snippet from `src/content/rain.ts` and shows
  consecutive characters of it, so reading down a column gives an actual line of `@std/http` rather
  than confetti. The decoration ends up making the same argument the rest of the page makes.
- **And the snippets have to stay real.** `tests/rain_test.ts` imports every symbol they name —
  `getCookies` from `@std/http/cookie`, `serveFile`, `encodeHex`, `ContactSchema`, `inquiryKey` —
  from the place the snippet says it comes from. A specifier that stops existing or a symbol that
  was never exported fails `deno check` before a single test runs. A site that asks to be trusted on
  checkable claims should not put invented API in its own wallpaper.
- **The starfield stays as the floor.** `rain.js` sets `data-rain` on `.sky` only after it has
  painted a frame, and CSS cross-fades the two. Without JavaScript, on a failed import, or under
  reduced motion, today's background is still there — deleting it outright would have left a flat
  gradient behind every page in three cases where nothing was wrong.
- **Capped at 30fps**, idle while the tab is hidden, `devicePixelRatio` capped at 2, and never
  imported at all when motion is reduced. The source runs uncapped `requestAnimationFrame`; this is
  a full-viewport canvas on every page, and 60fps of it is a phone battery for no visible gain.

Two faults found by looking at it rather than by reading it. The source's speeds carried across
unchanged looked broken at half its frame rate — six seconds after load most columns were still
above the fold — and columns respawning up to 1080px above the viewport went dark for half a minute
at a time. And the tail is drawn _upward_ from the head, so advancing the snippet index with it put
later characters higher up: `@std/http` arrived on screen as `ptth/dts@`. Walking the index
backwards as the tail walks up is what makes a column read downward.

### Slogans that take a position, and resolve out of noise

The rotating clause was specific, which was right, but folksy — "book jobs while you sleep" sounds
like a man with a van rather than a firm. The register is raised without giving up a single
checkable claim, which the research is clear about: the vague tagline is what a company writes when
it [refuses to choose who it is for](https://theb2bplaybook.com/b2b-positioning-strategy), and
buyers want plain language about what they get. "Where intelligence meets innovation" would have
been a downgrade.

- **Every slogan is now a claim and its refusal** — "belong to you, not to a platform", "answer to
  you, not to an agency", "take bookings at midnight, not just at nine". The construction is the
  professionalism: it takes a position instead of naming a feature, and it is very hard to write
  vaguely.
- **The bilingual promise, said twice.** "speak Spanish, not just English" joins the rotation, and
  because once in five turns is a weak way to say it, the stat strip carries `ENGLISH & ESPAÑOL`
  permanently in place of "1 direct line", which "no middlemen" already implied. A test fails if the
  tilde is ever lost — `ESPANOL` in the one line aimed at Spanish speakers would be worse than
  silence.
- **"answer faster than your competitors" was cut** from the approved set. It is a comparative claim
  about businesses nobody has measured, and it would have been the only line on the page that could
  not be defended if challenged.
- **The transition is a decode.** Each character is replaced with noise and settles left to right
  over about 800ms. Spaces never scramble — dissolving the word boundaries turns a sentence being
  decoded into mush — and the final string is written unconditionally at the end, because an
  interrupted scramble leaving nonsense across the hero is worse than no animation at all. No
  Anime.js: this is character substitution on a timer. The old character-by-character `type` mode is
  gone, since nothing used it any more.

**And the fault this would otherwise have shipped.** The slogans run 31–43 characters, so on a phone
the long ones wrap onto a second line and the short ones do not — the buttons below jumped 30px
every few seconds. Rather than a fourth guess at a `min-height`, the row now holds an invisible copy
of its longest state stacked underneath the live one, so it is always as tall as the tallest thing
that can appear in it. The copy has to mirror the live markup exactly, gap and caret included: a
plain string wraps at a different width and reserves the wrong height, which is how the first
attempt failed.

### A hero that talks to the person buying

The hero looked the part and still read like a CV. Three changes, all copy and one of them
structural:

- **The rotating line completes a sentence instead of listing categories.** "in Business Websites"
  becomes "Websites that **book jobs while you sleep** / **answer while you're on a roof** / **turn
  a quote into a customer** / **work with one bar of signal** / **you own outright**". Every phrase
  is already argued elsewhere on the site — the signal one by the offline case in `narrative.ts`,
  the last by the ownership promise in the trust line — because a hero must not sell what the
  pricing page then has to walk back. A test fails if a capitalised title noun creeps back in, since
  "Websites that Business Websites" is the regression waiting to happen.
- **The tagline rotates through five languages.** English, Spanish, French, German and Latin, each
  carrying its own `lang` so a screen reader pronounces "Une Personne" as French rather than as
  English. Roughly a fifth of Oklahoma City speaks Spanish at home. The Latin is a coinage —
  `Exemplaris Mutatio`, "a change of the model" — because Latin has no settled word for paradigm. It
  cross-fades rather than types: two blinking carets in one viewport is noise, and the benefit line
  has earned the eye.
- **The hero names its clients.** Heavenly Roofing, Mercy Seat Ministries and Praxedis Technologies,
  derived from `liveSites` with this site filtered out of its own proof by `host !== site.domain`. A
  test fails if the hero ever offers itself as a reference.
- **Oklahoma is said once.** The role line, a location line and the stat strip all named it within
  four rows; the location line is gone and the city stays where it counts.

Two layout faults were found and fixed while measuring rather than by reading:

- **The hero jumped when the language changed.** The translations are not the same length — French
  wraps to two rows where English fits one — so the name, buttons and cue moved with it. The eyebrow
  now reserves the wrapped height. Two guesses (2.9em, 3.45em) were both wrong; 4.8em is the
  measured answer. The first browser test written for this **passed by luck**, having sampled two
  languages that happened to wrap the same way; it now forces every translation and measures each.
- **The hero was always a masthead taller than the screen.** It asked for `100svh` while starting
  _below_ a sticky masthead, so it overran by 74px — which is why its content sat low and the scroll
  cue kept falling under the fold. It now asks for `calc(100svh - var(--masthead-h))`, and the
  spacing compresses on short viewports so a 900px laptop shows the whole thing.

### The hero's name could vanish, and the aurora could push the page sideways

Both reported from a phone, and neither reproduces in Chromium — no overflow at any width from 320px
to 768px, and the name paints. Both are WebKit-shaped, and both were real fragilities in what
shipped rather than guesses about a browser:

- **`color: transparent` had no fallback.** Clipping text to a gradient means colouring the text
  transparent and letting the background show through it. If the clip does not take — unsupported,
  or dropped by a rendering quirk — what is left is transparent text on a dark page, which is a
  heading that is simply not there. The solid gold is now the real declaration and the gradient
  replaces it only inside `@supports`.
- **`will-change: transform` on every letter** promoted all sixteen to their own compositing layers
  for the life of the page, and WebKit does not reliably paint a parent's clipped gradient onto a
  promoted descendant. Removed: the reveal writes its transforms inline and clears them, so the
  promotion it needs lasts exactly as long as the animation and not a moment longer.
- **The aurora animates out to `scale(1.07)`**, reaching past the hero on every side. Only
  `body { overflow-x: clip }` was containing that, and `overflow: clip` needs Safari 16 — before it
  the declaration is dropped entirely, taking the containment with it and leaving roughly 20px of
  sideways scroll on a phone. `.hero` now clips its own decoration with `overflow: hidden`, which
  every browser understands.

A browser step asserts the invariant behind the first two: the title may be transparent only when
something is demonstrably painting it, and no letter may carry `will-change`. Verified by mutation —
restoring `will-change` fails it.

### The hero, rebuilt on portfolio-app's shape

The landing page now opens the way `portfolio-app` does: centred, full-height, and leading with the
name rather than the tagline. What was borrowed is the **information architecture**; the tokens,
naming and motion rules stayed this app's own. None of `assets/css/hero.css` was copied — its
variables (`--navy`, `--gold-dk`) and flat class names do not exist here, and importing them would
have left two vocabularies in one stylesheet.

- **The name is the `h1`.** "One Person. One Paradigm Shift." moves to the eyebrow, exactly where
  portfolio-app puts it. The `h1` now matches what somebody actually searches for and what the
  JSON-LD `Person` already claimed.
- **The letters are split on the server**, not in the browser. portfolio-app assembles them in
  JavaScript; doing that here would break the contract every other script keeps, and a heading that
  only exists after a script runs is a heading a crawler never sees. `aria-label` carries the whole
  name so a screen reader hears "Pedro M. Dominguez", not eighteen letters.
- **The stat strip counts, it does not claim.** `4 live sites` comes from `liveSites.length`, so it
  cannot drift from the roster further down the page. The trust line takes `$295` from `plan.build`
  — portfolio-app says `$275`, and copying a hero must not copy another site's price.
- **A ladder of new lines**: role, location, stat strip, gradient divider, trust line and a scroll
  cue, each mapping to a portfolio-app block. Dropped from the original: the pointer-tilt transform,
  the hover shine replay and the spark particles, which belong to a louder register than this page.
- **`hero.js`** reveals it — eyebrow, then the name letter by letter, then the divider drawing
  itself, then the remaining lines. Modelled on `layers.js`, but with no IntersectionObserver: the
  hero is the top of the page, so waiting to be seen would mean waiting for something that already
  happened. Everything is visible as served; the reveal hides pieces and gives them back, never the
  reverse.
- **The Claude Code session moved out of the hero** into a section of its own with its own heading,
  which the scroll cue points at. It had been borrowing the hero's heading, and a full-height hero
  left it no room. Sections renumbered 01–10.

A browser step asserts the name fits a 375px viewport and finishes its reveal. Verified by mutation:
raising the font floor to `5rem` fails it with "the name spills 63px past the viewport" — the same
class of bug that shipped once already as a clipped "ft" and a sideways scrollbar.

### The contact form stops arguing about length

- **The 20-character minimum on the message is gone**, in the schema and in the `minlength`
  attribute both. "Need a website" is a lead; a form that refuses it and asks for a longer
  explanation turns that lead into a bounce. Nothing about the enquiry was better for the floor
  being there.
- Empty is still refused. `text()` trims, so dropping the minimum outright would have accepted a
  blank enquiry — `min(1)` is the server-side half of the field's `required` attribute, not a
  reinstated length rule.

### The service could not write its own database

Signing in to `/admin` returned 500, and the page suggested emailing the person reading it. The
cause was not in the application: `var/kv.sqlite3` was `0640` owned by `sysadmin` with group
`pmdweb`, so the service could read its database and not write it.

- **`Deno.openKv` succeeds on a read-only database.** Confirmed empirically, and it is why the fault
  was invisible for a day: the service started, every page rendered, and only writes failed.
  `GET
  /admin` is a pure read so the login page appeared; every `POST /admin` writes — the failure
  counter on a wrong password, the session on a right one — so both answered 500. That is why a
  wrong password and a correct one were indistinguishable: neither reached the password check.
- **`deploy.sh` created the condition on every run.** `chmod -R g+rX,g-w,o-rwx "$APP_DIR"` descends
  into `var/` and strips group-write from the database; the `install -d … -m 2770 var` that follows
  only ever fixed the directory node, never its contents. The subtree is now re-asserted after the
  recursive chmod, and the deploy **verifies** it — `sudo -u pmdweb test -w …` on the directory and
  on the database — and fails rather than shipping a site whose forms silently do not work.
- **A startup probe.** `main.ts` now writes one throwaway key after opening KV and logs
  `kv.readonly` with the remedy if it is refused. It reports rather than throws: a site that cannot
  record enquiries is still worth serving, and exiting would hand systemd a restart loop, turning a
  broken form into an outage.
- The public contact form was affected too, since Tuesday's deploy. It degrades rather than crashing
  — `src/routes/contact.ts` catches the write failure and tells the visitor to email instead — so
  enquiries were being turned away rather than lost silently.

### Failures now say enough to be fixed

The bug above took a day to find because the server knew and could not say. `src/log.ts` reduced
every `Error` to `value.message`, discarding the stack — right for anything reaching a browser,
wrong for journald, which only root and the service account can read.

- **Stacks are kept, in the journal only.** `sanitizeError` records `name`, `message`, up to eight
  trimmed frames, and a flattened `cause` — flattened rather than recursed into, because causes can
  form a cycle. Frames go through the same control-character scrubbing as every other value, so a
  crafted message still cannot forge a log line.
- **A five-character incident code** on every failed response, logged beside the error. The alphabet
  drops `0/O` and `1/I/L` so it survives being read aloud or retyped. "The site broke this morning"
  becomes `journalctl -u pmd-web | grep 7QK2M`.
- **Two failure pages.** The public one names no internals and points at the phone — the advertised
  channel — with the code to quote. A request carrying a valid admin session gets the truth instead:
  error name, message, stack, method and path, on screen. There is nobody to leak to; the reader is
  the person holding the password, and it is the difference between "I get a 500" and a file and a
  line number. Choosing between them is a KV read inside an error handler, so it is wrapped and
  falls back to the public page — if the database is what broke, this must not break on top of it.
- **A floor beneath both.** The failure page renders through the same layout as every other page, so
  whatever broke the request can break the page reporting it. Discovered while testing, not in
  production: a plain-string fallback now carries the incident code when rendering fails twice.
- **4xx on `/admin` routes through the same chooser.** A `POST` to a GET-only admin route used to
  render the public page — the one that suggests emailing yourself. It now answers with the code and
  the method and path that were refused.
- **Rejections are pinned as rejections.** A wrong password answers 401, a lockout 429, a foreign
  origin 403, a missing session 303. None of them was a 500 before, but nothing stopped a future
  change from making one; a test now asserts each answers below 500.

### An admin area nothing links to

- **`deno task admin-password`** sets or changes the password from the command line, prompting twice
  with echo off. It never travels as a shell argument, so it cannot land in history or in `ps`. It
  must run as root — `sudo DENO_DIR=/var/cache/pmd-web/deno deno task admin-password` — because the
  KV file is `0640` owned by `pmdweb`, so it cannot be written as yourself, and `sudo -u pmdweb`
  fails too: that account cannot traverse a `0750` home to reach the checkout. The message says so
  when the write is refused.
- **Stored as PBKDF2-HMAC-SHA256, 210,000 iterations, random salt per password**, via Web Crypto —
  no new dependency, since `crypto.subtle` was already in use for the asset and script hashes.
  Compared in constant time, because `===` on a hash returns early and the time it took says how
  much of the guess was right. Verified empirically: the same password twice produces different
  records, and no plaintext survives in what is written.
- **Failed attempts are counted in KV, not in memory.** `src/http/ratelimit.ts` is in-memory and
  resets on every restart — fine for a contact form, wrong for a login, where it would hand an
  attacker a fresh budget of guesses with every deploy. Five failures in fifteen minutes locks that
  client out and the count survives a restart.
- Sessions are 32 random bytes in KV with an 8-hour `expireIn`, so the expiry is the database's job
  rather than a field somebody has to remember to check. The cookie is `HttpOnly`, `SameSite=Strict`
  and `Secure` whenever the origin is https, so it still works on `http://localhost`.
- **Nothing links to it.** No nav entry, not in the sitemap, `Disallow: /admin` in `robots.txt`, and
  every response is `no-store` with `X-Robots-Tag: noindex`. A test walks every public page and
  fails if the string `/admin` appears in any of them.
- **The sign-in page** is chrome-less — `PageMeta` gained a `chrome` flag so the masthead and footer
  can be dropped — with pseudo-code scrolling on a canvas behind the panel. The lines are assembled
  in the browser from a token set, so no real source is served to an unauthenticated page. It stops
  the moment the password field takes focus: text moving behind what you are typing into stops being
  charming the second it costs somebody an attempt.
- **The dashboard** shows the enquiries with counts, states and the message in full, and edits
  exactly four fields: email, phone, the `sms:` link and its note. Everything else stays in version
  control where the tests guard it, and KV is an override layer — an empty database renders the
  committed site exactly.
- **Deleting is two steps, done on the server.** The first press asks; the second deletes. An inline
  `onclick="return confirm(…)"` would have been blocked by the policy — there is no `unsafe-inline`
  — so the confirmation would silently never appear and the delete would go straight through. The
  server-side version also works with JavaScript off. Deletion leaves a tombstone at
  `["deleted", …]` holding when and who from, so a lost lead leaves a trace and a stolen session
  cannot erase quietly.
- **The trap that came with editable contact details.** They live inside the JSON-LD, and the
  JSON-LD is admitted by the Content-Security-Policy through its hash — computed once at startup.
  Changing the phone number would have left the emitted graph unmatched by the policy, so the
  browser would block it: structured data gone from search results, and nothing to see but a console
  message. `src/admin/contact.ts` now recomputes the details, the graph and its hash together on
  every write; `RenderContext.jsonLd` and `SecurityOptions.scriptHashes` became getters over that
  store rather than values frozen at boot. A test changes the number and re-runs the existing check
  that every inline script the page emits is still admitted.

### A thesis with sources, and a reveal to carry it

- **`/thesis`** — the argument the rest of the site rests on, in six sections: what changed as
  models got cheap, renting versus owning, why cheap is not the same as worthless, what the
  foundation is built on and why that is economic rather than technical, the objections, and the
  sources. Written for a business owner; the terms the citations use are introduced once in plain
  words and then the plain words do the work.
- **The citation was verified against the transcript, and needed to be.** The tidied version
  circulating in search results differs from what was said, and one outlet's headline attributes the
  passage to a different host. What is on the page: Chamath Palihapitiya, All-In Podcast, 24 July
  2026, around ten minutes in — _"The real business model is not in the foundational model anymore.
  It's at the application layer above and it's in the infrastructure below, whether that's the cloud
  or whether that's chips."_ No episode number appears anywhere, because two sources disagree about
  it.
- **The quotation is used whole, and a test enforces that.** It puts value at the application layer
  _and_ in the infrastructure below. Cropping the second clause would make it say something the
  speaker did not — and would throw away the evidence the "cheap is not worthless" section needs.
  `tests/content_test.ts` and `tests/app_test.ts` both fail if that clause disappears.
- The page also says plainly that the speaker is describing where investable value sits, **not**
  arguing that a local business should own its software. That step is this site's own, and it is
  made rather than borrowed.
- **The objections section argues against the site in public.** Veracode put 100+ models through 80
  coding tasks: 45% of the output carried a security flaw, and the pass rate has barely moved in two
  years. That is on the page, answered with what this codebase actually does about it — and the
  hardest objections ("who maintains it when you are gone?", "can a business our size carry this?")
  are conceded rather than deflected. A test refuses an answer shorter than 80 characters.
- Every figure names a source, and every source says what it supports. The SaaS-spend benchmark
  carries an explicit caveat that "small business" in those surveys means firms far larger than a
  roofer or a church.

### The landing page argues economics now, not craft

- Section 01 was a craft argument — software got heavy, mine is small. It is now the short version
  of the economic one: the clever part got cheap, the part that is yours did not, and that is what
  makes owning software affordable. The long version, with citations, is one link away.
- **The six-layer stack, revealed.** `static/js/layers.js` builds the stack from the foundation
  upward, sends a gold rail up through it, lands the one layer a business can own, and counts
  `1,500×` up to exactly the cited figure. The order is the argument, which is why it runs
  bottom-up.
- Same contract as every other animation here: the diagram is **served finished** — every layer, the
  rail and the final figure in the HTML — and `layers.js` hides those pieces to replay them. No
  JavaScript, reduced motion, or a failed Anime.js import all leave the completed diagram on screen.
  Anime.js is imported on first sight of the figure, so a visitor who never scrolls that far never
  pays the 42 KB.
- The layers are the six from the cited research, not invented to suit the picture, and a test holds
  the count and the single "yours" flag so the diagram cannot drift from the source it illustrates.
- The pipeline figure moved to `/thesis`, where the technical foundation is actually the subject. It
  describes a request path, and section 01 is no longer about request paths.
- The browser suite gained a step that scrolls to the stack, waits for the reveal to **start and
  finish**, and asserts the counter landed on `1,500×` with no layer left faded. Waiting only for
  "not playing" passed instantly at page load — before the animation began — which is precisely the
  state it was meant to catch.

### A menu worth opening

- The hamburger now opens a **full-screen menu**: the five sections numbered and set in the display
  face, each with a line saying what is down there, over a blurred night-sky surface with a scanline
  and corner brackets. It opens with a diagonal wipe from the toggle's corner, a gold hairline races
  across, and the items rise in sequence 60ms apart.
- The wipe is a CSS `clip-path` transition rather than a scripted one — both polygons have four
  vertices, which is what lets the browser tween them, and Anime.js cannot interpolate `polygon()`
  and would snap between shapes. Anime.js drives what it is good at: the sweep and the staggered
  rise, imported on **first open**, so a visitor who never opens the menu never pays for the 42 KB.
  If that import fails the menu still opens — the same contract `session.js` keeps.
- While it is open the page behind holds still and goes `inert`, so Tab cannot leave the menu; focus
  lands on the first item and returns to the button on close. Escape and any link close it, and
  crossing the 60rem breakpoint closes it rather than stranding the scroll lock.
- **Fixed: a phone with JavaScript disabled had no navigation at all.** `.masthead__nav` was
  `display: none` until a script added `[data-open]`, while `nav.js` claimed the links "work without
  this file". They now do: a one-line inline script in `<head>` marks the document as enhanced, and
  the stylesheet only hides the links behind a button when that flag is present. Without it the
  links render as a plain stacked list and the button is not drawn, because a dead button is worse
  than no button.
- That flag is the second inline script on the page, admitted by hash like the JSON-LD. Both hashes
  now come from `inlineScriptHashes()` in `src/render/layout.ts` — the module that emits them —
  rather than being assembled in `main.ts`, and a test reads every inline script back out of the
  served HTML to check its hash is in the header. A third one added and forgotten fails the suite.
  The policy still carries no `unsafe-inline` and no nonce.
- Desktop is untouched: at 60rem the same markup flattens back into the masthead row it has always
  been, with the indexes and descriptions hidden.

### Fixed: the menu opening as a strip, and links that went nowhere

- **The menu only filled the screen at the top of the page.** `.masthead[data-scrolled]` carries a
  `backdrop-filter`, and a `backdrop-filter` makes an element the **containing block for its
  `position: fixed` descendants** — the nav panel being one. Twenty-four pixels down, `nav.js` adds
  the attribute and `inset: 0` stops meaning the viewport and starts meaning the masthead's own
  ~4.5rem bar. `nav.js` now sets `data-menu-open` on the masthead while the menu is open and the
  stylesheet drops the filter, along with its transition — the element stays a containing block for
  as long as the filter is anything but `none`, so fading it out would leave the panel clipped for
  the whole of the opening wipe.
- **On `/pricing`, every nav link went nowhere.** They were bare fragments (`#contact`, `#work`),
  which resolve against the page being read — so on `/pricing` they became `/pricing#contact`,
  matching nothing. They are now rooted (`/#contact`): same-document scrolling on the landing page,
  a trip home from anywhere else. The masthead CTA had the same fault.
- `nav.js` derived section ids with `href.slice(1)`, which would have silently returned `#work` for
  the new hrefs and stopped the current-section highlighting from ever matching. It parses the hash
  now. `tests/content_test.ts` requires nav hrefs to be rooted rather than bare.

### Browser tests, because every bug here has been a rendering bug

- The `data-menu-open` rule shipped in 645f8d4 with its body replaced by a comment — a deliberate
  mutation, made to prove the browser test could detect the bug, that was committed by mistake
  instead of being reverted. The menu was therefore still opening as a strip on the live site. The
  rule is restored. The incident did establish what the mutation was meant to: the broken stylesheet
  produced a 144px panel against an assertion of "more than 921px", so `deno task e2e` catches it —
  it simply was not re-run before committing.
- The menu check now also asks the browser what is at the bottom of the screen, not only how tall
  the panel measures. `boundingBox()` reports the layout box, which `clip-path` shrinks without
  touching, so a panel clipped to a strip could have measured full height and passed.

- **`deno task e2e`** drives a real Chromium at 375, 768 and 1280 px: the menu fills the viewport
  after scrolling, the close button returns focus to the toggle, the masthead survives following a
  nav link, `/pricing`'s nav links land on the landing page, the laptop layout is a row with no
  toggle, and nothing scrolls sideways on either page. Six of those are bugs that have actually
  happened here and could not have failed in `tests/`, because none of them are wrong in the HTML.
- Files are `e2e/*_e2e.ts`, **not** `*_test.ts`: `deno test` with no path walks the whole project,
  and `scripts/deploy.sh` runs `deno task verify` on the VPS where there is no browser. The `test`
  task is pinned to `tests/` for the same reason, and the e2e task is never part of the deploy gate.
- The harness starts the real server on a free port with its own throwaway KV database, waits for
  `/healthz`, and removes the database afterwards.

### A way out of the menu

- **A small × in the open menu's top-right corner.** The panel is `z-index: 40` and the toggle is an
  unpositioned sibling, so an open menu paints straight over the button that opened it — Escape and
  tapping a link were the only ways back, and the toggle's ×-animation was never visible to anyone.
  The close button sits exactly where the buried toggle is (0.9rem down, one gutter in, the same
  2.75rem target), so it reads as the hamburger becoming an ×.
- Drawn only under `[data-js]` and only below 60rem: with no script there is no menu to close, and
  at the desktop breakpoint the panel is a plain row of links. A button that does nothing is worse
  than no button — the same rule the toggle already follows.

### Fixed: the menu button vanishing after a nav link

- **`body` had `overflow-x: hidden`, which broke the sticky masthead.** Any `overflow` other than
  `visible` makes an element a scroll container, and a scroll container is what `position: sticky`
  resolves against — so the header stuck to the body's scroll box rather than the viewport and
  stopped following the page at all. Clicking a nav link jumped to the section and left the header,
  with its menu button, behind at the top of the document. It is now `overflow-x: clip`, which clips
  identically without establishing a scroll container.
- The intermittence had a cause worth recording: `overflow-x: hidden` on `body` normally propagates
  to the viewport, but **only while `html`'s overflow is `visible`**. The menu's scroll lock sets
  `overflow: hidden` on `html`, which stops that propagation and turns `body` into a real scroll
  container mid-interaction — so whether sticky broke depended on whether the menu had been opened,
  and on engine differences that show up on tablets first.
- **`scrollbar-gutter: stable` on `html`.** Locking the scroll removed the scrollbar and widened the
  layout viewport by around 15px. On a tablet sitting just under 60rem that is enough to start
  matching the desktop breakpoint while the menu is open, which sets `.masthead__toggle` to
  `display: none` — the button disappearing for a second reason, on exactly the devices where the
  first one bites. Reserving the gutter keeps the width constant whether the page is locked or not.
- A test reads the stylesheet back and fails if `body` regains a scroll-container `overflow`, or if
  the gutter reservation goes away.

### A launch offer that knocks once

- A **promotional splash** on the landing page: the $295 build, the $20 a month, the $535 first
  year, and a way through to `/pricing`. Its copy and every figure live in `src/content/pricing.ts`
  beside the price they quote, so the modal cannot advertise a number the pricing page has stopped
  charging — a test compares the two.
- It is a native `<dialog>`, served **without** the `open` attribute. That makes it closed in every
  browser, and closed permanently for a visitor with no JavaScript, who would otherwise be handed a
  modal with nothing to dismiss it. `showModal()` brings focus containment, Escape, the backdrop and
  focus restoration; none of it is hand-rolled the way `nav.js` had to for a menu.
- **It waits for a reader.** Six seconds _and_ a quarter of the page scrolled, both required, then
  remembered in `localStorage` so the same person is never interrupted twice. The scroll condition
  is the important half: Google's intrusive-interstitial guidance is aimed at popups that cover
  content on arrival from search, and this one cannot reach anybody who has not stayed to read. On a
  phone that means it is effectively scroll-triggered, which is exactly the intent.
- Two interactions worth naming. It refuses to open over the full-screen menu — that modal was
  opened deliberately and wins. And it is rendered as a **sibling of `<main>`**, because `nav.js`
  marks `main, footer` inert while the menu is open and `inert` still applies to a top-layer dialog
  nested beneath an inert ancestor; inside `<main>`, the splash would have been unclickable for
  anyone who had ever opened the menu. `layout()` gained an `overlay` slot for exactly this.
- Storage access is wrapped: Safari's private mode throws on `localStorage`, and failing closed
  there shows the offer at most once per visit rather than never.

### Real case studies, and only real ones

- **The four invented engagements are gone** — Route Ledger, Shop Scheduler, Permit Intake and
  Counter Menu, deleted outright rather than commented out or kept "for reference". They were the
  last fictional thing on a page whose whole argument is that its evidence survives checking, and a
  placeholder that lingers as a commented block is one careless uncomment from being published
  again.
- In their place, the two engagements that actually exist: **Heavenly Roofing LLC**
  (`heavenlyroofingllc.com`) and **Mercy Seat Ministries** (`msmokc.org`). Each card's title links
  to the live site, so a reader can check the claim in one click.
- **The card was reshaped for the person reading it.** "Architecture" and "Why this way" — two
  blocks written for engineers — become "What it does" and "What changed", with the technologies
  kept as a short "Built with" line rather than an unexplained row of chips. `architecture` and
  `rationale` leave the `Project` type; `href` joins it.
- Heavenly Roofing's partner follow-up board is described **generically** — every conversation in
  one place, bilingual templates, one-click drafts. What it does is worth showing; who it targets
  and how it scores them is the client's competitive strategy, and his competitors can read this
  page too.
- **`projects.ts` now has tests**, which is how four fictional studies survived this long beside a
  hero and roster that were both guarded. Entries must be complete and uniquely slugged, and every
  `href` must be a host on the roster in `live.ts` — the same rule already binding the hero
  rotation. A separate test fails if any of the four invented names ever reappears in the page.
- The work section's lede promised "a shop, a distributor or a contractor", which described the
  placeholders. It now names what is actually there.

### It says what it costs

- **A pricing page at `/pricing`.** One plan: $295 to design, build and launch on a twelve-month
  agreement, then $20 a month for care, support and hosting, with the first year of domain
  management included. The page prints the arithmetic — $295 + $240 = **$535 for the first year**,
  $240 a year after — rather than leaving a reader to work it out or text to ask. `firstYear` is
  computed in `src/content/pricing.ts` and asserted by a test, so the copy cannot drift from the
  number above it.
- **A promotional section on the landing page** making the argument that a business can own its
  software at about a tenth of what it used to cost, because there is one person instead of a firm
  and AI does the mechanical half of the work.
- **The comparison is sourced.** Published 2026 ranges — $8,000–$15,000 for a boutique-agency build,
  $3,600–$12,720 a year to keep it running, $5,000–$30,000 for an agency build elsewhere — each row
  footnoted to the page it came from, and framed as industry ranges rather than as any named firm's
  price. "About a tenth" is measured against the _cheapest_ published first year ($6,600), where the
  true multiple is about a twelfth; against the agency figures it is nearer a twentieth. A claim
  that survives being checked against the low end is the only kind worth printing.
- **An FAQ** of eight questions — what do I own, what if I leave, who fixes it, how is it this
  cheap, what is not included — on the landing page and emitted as schema.org `FAQPage` data so the
  answers can appear in search results. It joins the existing `@graph` rather than becoming a second
  `<script>`, so the Content-Security-Policy still carries one hash and no nonce.
- **New contact details**: `domingueztechsolutions@gmail.com` and **405-984-7036, text only**. The
  number links as `sms:` and is written out in full for anyone reading on a desktop, and it is in
  the structured data as a `ContactPoint` of type "text message".

### Enquiries move to Deno KV

- `src/contact/inbox.ts` becomes `src/contact/store.ts`, and enquiries are written to Deno KV
  instead of appended to `var/inbox.jsonl`. There are two doors in now — the contact form and the
  pricing page — and a lead is worth being able to read back in order and filter by kind. The
  database is a file in the same `var/` directory, so it needs no permission the service did not
  already have; `toRecord` stays pure and keeps its tests.
- Keys are `["inquiry", receivedAt, id]`: time first so a reversed list is newest first, and a
  random id last so two submissions in the same millisecond cannot overwrite each other.
- **`deno task inbox`** replaces `tail -f var/inbox.jsonl`, printing recent enquiries newest first,
  one JSON object per line, so `jq` works exactly as it did. Losing the ability to read your own
  leads would have been a regression dressed up as an upgrade.
- `--unstable-kv` is now on all four `deno.json` tasks and on the unit's `ExecStart`, and `KV_PATH`
  joins the unit's `--allow-env` allowlist. The flag and the code deploy together, so a service
  cannot come up without it. The old `var/inbox.jsonl` is left on disk and readable; nothing
  migrates it.
- A submission arriving from the pricing page carries `plan=launch-295` as a hidden field, so it is
  stored as a `pricing` enquiry rather than a `contact` one. The plan travels in the query string
  (`/?plan=launch-295#contact`) and is rendered server-side, so it survives with JavaScript off. An
  unknown or tampered value is dropped rather than turned into a validation error the visitor cannot
  see or fix.

### The page speaks to business owners

- The hero session now shows the work that is actually for sale. It was a small feature being added
  to an existing site — _"add a quote request form"_, four files, six minutes. It is now the whole
  job: _"implement a Deno web app for Heavenly Roofing LLC in Oklahoma City, Oklahoma using
  @std/http and Zod"_, followed by `deno add jsr:@std/http jsr:@zod/zod`, three files written,
  `deno task verify` green, and `sudo scripts/deploy.sh` putting it on a live address.
- And it rotates. `src/content/session.ts` is now one template, `sessionFor()`, applied to three
  subjects; each loop retypes the prompt for the next business. The same prompt and the same five
  steps building a site for a roofer, a church and a technology firm is the page's whole argument,
  made visible in the first screen instead of asserted in a paragraph below it.
- Every business named is one whose site is actually live, and a test refuses any subject whose host
  is missing from the roster in `live.ts`. An invented client would not just be one unverifiable
  claim — a visitor who checks it and finds nothing has learned that this page's evidence does not
  survive checking, and they would not stop at the invented one.
- The closing line reads `6 files · tests green · live` rather than counting minutes. Speed reads as
  competence to an engineer and as _cheap_ to someone deciding what to pay; the same fact framed as
  what the client received does not invite that question.
- The rotation reaches the browser as an escaped `data-sessions` attribute — the trick the hero
  typewriter already uses for its words — so the Content-Security-Policy still needs no nonce.
  `session.js` refuses any entry whose row count does not match the DOM and keeps looping the
  rendered session instead, because a malformed attribute must never blank the terminal. The prompt
  row now wraps (it is a sentence, not a command) and its height is measured and pinned before each
  loop, so the terminal does not collapse and grow as the text is typed.

- The hero's One/Zero/OKC figures are replaced by a **Claude Code session** — a request in plain
  English, two files written, the suite passing, the change deployed — animated with Anime.js in
  `static/js/session.js`. The transcript lives in `src/content/session.ts` as data and is rendered
  **complete** into the HTML; the script hides those lines and replays them. No JavaScript, reduced
  motion, or a thrown error all leave the finished session on screen, which is the same contract
  `typewriter.js` keeps with the rotating word. The figure is `aria-hidden` beside a one-sentence
  `visually-hidden` summary, so a screen reader hears what happened rather than every keystroke.
  Anime.js is imported only once the terminal is actually on screen — 42 KB does not belong in front
  of a hero that reads fine without it. The caption says the session is condensed, because a
  transcript that looks captured should either be captured or say that it is not.
- **`src/content/live.ts`** and a "Running right now" roster at the head of the work section: the
  four sites currently served from one box, linked by name and host, under the line that makes the
  point — _N sites · one engineer · one small server_. This is where "one person can run several web
  apps" stops being an adjective and becomes a number a visitor can click. `denogenesis.com` (502)
  and `pedromdominguez.com` (parked) were checked and left off.
- Copy across `site.ts` and `narrative.ts` moves from engineering to consequence: "local-first
  design" becomes "keeps working when the internet does not", "explicit permissions" becomes "locked
  down by default", and AI is described as doing the typing while judgment stays human. Hosting
  appears once, as the client's choice of a Contabo VPS, Deno Deploy, or their own server. Deno, the
  JSR standard library and Zod stay visible — as file names in the terminal and one line in the
  caption — without being explained at anyone.
- Fixed a horizontal scrollbar on phones. The hero title's lines were joined by `&nbsp;`, which made
  each one a single unbreakable token; at the title's clamped size that is about 430px against a
  335px content box on a 375px screen, so the tail of "Shift." hung past the right edge and the page
  scrolled sideways to reach it. Ordinary spaces now, with `text-wrap: balance` so a wrapped line
  splits evenly rather than stranding a word. A test asserts the non-breaking spaces do not come
  back.
- The live-site roster's three-column layout opened at `40rem`, where its combined track minimums
  (35rem plus gaps) exceeded what the gutter and panel padding leave — a second, narrower source of
  the same horizontal scroll, between roughly 640px and 768px. It now opens at `48rem` with smaller
  minimums.
- The vhost logs to `pedromdominguez-dev.access.log`. It shared `pedromdominguez.access.log` with
  portfolio-app's `.com` vhost, interleaving two sites in one file; the fail2ban `*access.log` glob
  still matches.

### Deployment

- Deployment now follows the layout the other Deno sites on this box use: `systemd/`, `nginx/`,
  `fail2ban/` and `scripts/` at the top level, in place of a single `deploy/` directory. The vhost
  is named after the site it serves (`nginx/pedromdominguez.dev`) rather than `nginx.conf`.
- The application runs **from the checkout** instead of a copy under `/srv/pmd-web`. There is no
  second tree to drift out of step with git; `systemctl cat pmd-web` names the directory you edit,
  and an update is `git pull` and a redeploy. The unit's `User=`, `Group=`, `WorkingDirectory=`,
  `ConditionPathExists=`, `BindReadOnlyPaths=` and `BindPaths=` are rewritten by `deploy.sh` for the
  host it runs on, so the committed file keeps one readable set of placeholder paths.
- It does not run **as** the user who owns that checkout. `pmdweb` — system account, no shell, no
  home — reaches the tree through the group, read-only, so a bug in the request path cannot rewrite
  the code that runs at the next restart; the owner keeps write access and needs no root to
  `git pull`. `var/` inverts it (`pmdweb:<owner>`, `2770`): the service writes the inbox, and the
  owner writes because `deno task verify` runs the suite there.
- `ProtectSystem=strict` and `ProtectHome=tmpfs`, with `BindReadOnlyPaths=` restoring exactly the
  checkout and `BindPaths=` restoring `var/`. The whole hierarchy is read-only to the process, every
  other home directory is an empty tmpfs, and file ownership says the same thing a second time. (An
  earlier revision of this entry claimed `strict` could not be used with a checkout under `/home`.
  That was wrong: `strict` mounts read-only, it does not hide — `ProtectHome=` is what hides.)
- `/etc/pmd-web/pmd-web.env` (`EnvironmentFile=-`), with `systemd/pmd-web.env.example` in the repo.
  Installed only when absent: it is the one file meant to diverge from git. The module cache moved
  to `/var/cache/pmd-web/deno` under `CacheDirectory=`, and the interpreter to `/usr/bin/deno`.
- The `listen` protocol options moved to `nginx/00-default-drop`, which is the first file nginx
  parses and therefore the one that gets to set them: `ssl` and `http2` describe an address:port,
  not a server block. The vhost's `listen 443;` lines are now bare and inherit both, which drops the
  "protocol options redefined for 0.0.0.0:443" warnings. The standalone `http2 on;` directive is
  gone with them — it needs nginx >= 1.25.1 and was an `unknown directive` error on anything older;
  `http2` as a listen parameter works on both.
- Box-wide hardening, tracked and installed by the same script: `nginx/snippets/deny-probes.conf`
  (444 on PHP/WordPress/dotfile probes, included by the vhost), `nginx/00-default-drop` (catch-all
  `default_server` closing the connection on any unmatched `Host`, and the distro default site
  removed), and `fail2ban/` — an `nginx-probes` jail, 3 strikes in 10 minutes, banned 24h. The jail
  needs `backend = polling` and a restart rather than a reload, both noted in the file. `jail.local`
  is installed only when absent, since the real sshd port belongs on the server and not in git.
- `scripts/deploy.sh` — the README's install flows as one idempotent script: preflight checks before
  the first change, `deno task verify` against the tree about to be put into service, the
  environment file, a module cache warmed as the service user for `--cached-only`, then unit
  install, restart, and a `/healthz` probe on the port read back out of the unit file. Nginx and
  fail2ban come last, the first only behind a passing `nginx -t`. Six flags and nine environment
  overrides for a differently laid-out host.
- Certificates are part of that script rather than a separate errand. It issues with
  `certbot certonly --webroot` before Nginx, since the vhost names its key material by absolute path
  and will not load without it; a first run breaks the ACME chicken-and-egg with a temporary
  plaintext server block serving only `/.well-known/acme-challenge/`, and a host that already holds
  the lineage renews with no downtime at all. Preflight refuses a lineage name that disagrees with
  the path in `nginx.conf`, which would otherwise install a certificate nobody renews.
  `certbot.timer` is enabled and a deploy hook reloads Nginx after renewal — otherwise Nginx serves
  the expired copy already in its memory. `--staging` rehearses against the staging CA,
  `--force-renewal` and `--skip-certbot` cover the rest.
- Default TCP port moved from `8000` to `8002`, in `src/config.ts` (`PORT` and `PUBLIC_ORIGIN`
  defaults), the systemd unit, the Nginx upstream and the README. Nothing hard-codes a port outside
  configuration, so a deployment that sets `PORT` explicitly is unaffected.

## 1.0.0 — 2026-08-08

First release: the complete site, server, and deployment.

### Server

- **Startup (`main.ts`)** — reads configuration, indexes and content-hashes the static assets,
  computes the Content-Security-Policy hash for the one inline script, then listens. Every
  dependency is constructed here and passed down; no module reaches for a global. SIGTERM and SIGINT
  drain in-flight requests.
- **Configuration (`src/config.ts`)** — eleven optional environment variables parsed by a Zod schema
  into a frozen record. Malformed values stop the process at startup. The only reader of `Deno.env`.
- **Routing (`src/http/router.ts`)** — `URLPattern` matching as a pure function returning a match, a
  method mismatch with a correct `Allow` list, or nothing. HEAD is served by GET routes; only
  GET/HEAD/POST/OPTIONS exist at all.
- **Application (`src/app.ts`)** — one `Request → Response` function that handles method screening,
  dispatch, error containment, security headers and access logging in a fixed order. Handlers know
  about none of it.
- **Logging (`src/log.ts`)** — one JSON line per event on stdout for journald. Control characters
  are flattened so a request path cannot forge a log entry; secret-looking keys are redacted by
  name; errors log their message, never a stack.

### Pages

- Single-page narrative in seven sections, answering in order: who is Pedro, what he builds, why the
  architecture matters to a business, how one developer competes with an agency, what has shipped,
  and how to start.
- Hero with a retyping discipline rotator; `/thank-you`, 404 and error pages share a narrow notice
  layout.
- Rendering is a pure function of (context, data) — no page opens a file or reads a clock beyond the
  footer's copyright year.
- Content lives in `src/content/` as plain data, separate from layout. The four portfolio entries
  are illustrative placeholders pending real engagements.

### Security

- The `html` tagged template escapes every interpolation; emitting raw markup requires an explicit
  `raw()` call.
- Content-Security-Policy of `default-src 'none'` with no `unsafe-inline`, no `unsafe-eval` and no
  wildcards. The JSON-LD block is admitted by a SHA-256 hash computed at startup over the exact
  emitted string, so policy and page cannot drift. No third-party assets: the font and Anime.js are
  vendored.
- `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` (every unused
  feature denied), both Cross-Origin policies, and HSTS with `upgrade-insecure-requests` when
  enabled.
- Contact endpoint gates cheapest-first: content type, `Origin` (a missing one is refused, not
  trusted), a 16 KB streaming cap that does not believe `Content-Length`, a bounded fixed-window
  rate limit with `Retry-After`, then the Zod schema. A filled honeypot is answered exactly like a
  success.
- Static file paths are resolved by a pure function tested against traversal, double-encoding,
  absolute paths, NUL bytes and backslashes, then re-checked after symlink resolution.
- Errors expose no exception text, stack, path or version. `/healthz` returns `{"status":"ok"}` and
  nothing else.

### Front end

- Server-rendered HTML that is complete before any script runs. Four optional, independently guarded
  ES modules: navigation, typewriter, reveal, contact.
- The contact form is a real `<form method="post">` answered with HTML (Post/Redirect/Get on
  success) and upgraded to `fetch` when JavaScript is available; the enhancement steps aside if
  anything fails.
- Anime.js drives the gold shooting stars, dynamically imported during idle time and skipped
  entirely under `prefers-reduced-motion: reduce`.
- Design system in one stylesheet: midnight-navy and gold, a vendored Fraunces variable display face
  over a system sans stack, mobile-first, fluid type.
- Assets are content-hashed at startup and served immutable for a year; everything else revalidates.

### Tests

81 tests over the pure and security-sensitive code: escaping, path resolution, routing, headers and
CSRF, body limits and content types, validation, rate limiting, log redaction, configuration, and
end-to-end request handling through `createApp` without opening a socket.

### Deployment

- `deploy/pmd-web.service` — systemd unit pairing minimal Deno permission flags with a kernel
  sandbox (`ProtectSystem=strict`, no capabilities, filtered syscalls, one writable directory),
  running `--cached-only` so the service never contacts a registry.
- `deploy/nginx.conf` — TLS, compression and connection limits only; it adds no headers that would
  duplicate and then contradict the application's.
