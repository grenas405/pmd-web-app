/**
 * site_e2e.ts — the checks that need a browser.
 *
 * Every bug found in this project by a person rather than a test has been a
 * rendering bug: a hero wider than the phone it was on, a sticky header that
 * stopped sticking, a menu button buried under its own panel, a menu that
 * opened as a strip across the masthead. None of them are wrong in the HTML,
 * so none of them could fail in `tests/` — they only exist once a browser has
 * laid the page out. Each case below is one of those, kept so it cannot happen
 * a second time quietly.
 *
 *   deno task e2e
 *
 * Named `_e2e.ts`, not `_test.ts`, and deliberately: `deno test` with no path
 * walks the whole project, and `scripts/deploy.sh` runs `deno task verify` on
 * the VPS, where there is no browser to drive.
 *
 * One-time browser install:  deno run -A npm:playwright install chromium
 */

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { type Browser, chromium, type Page } from "npm:playwright@1.56.0";

/** Viewports: a phone, the tablet that reported the menu bug, a laptop. */
const PHONE = { width: 375, height: 812 };
const TABLET = { width: 768, height: 1024 };
const LAPTOP = { width: 1280, height: 900 };

/**
 * Playwright's own browser if it has one, otherwise whatever `playwright
 * install` left in the cache. Set CHROMIUM_PATH to override.
 */
function executablePath(): string | undefined {
  const explicit = Deno.env.get("CHROMIUM_PATH");
  if (explicit !== undefined) return explicit;

  const cache = `${Deno.env.get("HOME")}/.cache/ms-playwright`;
  try {
    const builds = [...Deno.readDirSync(cache)]
      .filter((entry) => entry.isDirectory && entry.name.startsWith("chromium-"))
      .map((entry) => entry.name)
      .sort()
      .reverse();
    for (const build of builds) {
      for (const dir of ["chrome-linux64", "chrome-linux"]) {
        const path = `${cache}/${build}/${dir}/chrome`;
        if (Deno.statSync(path).isFile) return path;
      }
    }
  } catch {
    // No cache, or nothing readable in it. Let Playwright decide.
  }
  return undefined;
}

/** A port nobody else is on, found by asking the kernel for one. */
function freePort(): number {
  const listener = Deno.listen({ port: 0, hostname: "127.0.0.1" });
  const { port } = listener.addr as Deno.NetAddr;
  listener.close();
  return port;
}

interface Harness {
  readonly origin: string;
  readonly browser: Browser;
  close: () => Promise<void>;
}

/** Start the real server and a real browser; hand back both. */
async function start(): Promise<Harness> {
  const port = freePort();
  const origin = `http://127.0.0.1:${port}`;
  const kvPath = `var/e2e-${crypto.randomUUID()}.sqlite3`;

  const server = new Deno.Command(Deno.execPath(), {
    args: [
      "run",
      "--unstable-kv",
      "--allow-net=127.0.0.1",
      "--allow-read=static,var",
      "--allow-write=var",
      "--allow-env",
      "main.ts",
    ],
    env: {
      ...Deno.env.toObject(),
      PORT: String(port),
      PUBLIC_ORIGIN: origin,
      // Its own database, so a run never sees another run's enquiries.
      KV_PATH: kvPath,
    },
    stdout: "null",
    stderr: "null",
  }).spawn();

  for (let i = 0; i < 80; i++) {
    try {
      const response = await fetch(`${origin}/healthz`);
      await response.body?.cancel();
      if (response.ok) break;
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  const browser = await chromium.launch({
    executablePath: executablePath(),
    args: ["--no-sandbox"],
  });

  return {
    origin,
    browser,
    close: async () => {
      await browser.close();
      server.kill("SIGTERM");
      await server.status;
      // Take the throwaway database with it, including SQLite's sidecars.
      for (const suffix of ["", "-shm", "-wal"]) {
        try {
          await Deno.remove(`${kvPath}${suffix}`);
        } catch {
          // Never created, or already gone.
        }
      }
    },
  };
}

/** Run `body` against a fresh page at `viewport`, then tidy up. */
async function withPage(
  harness: Harness,
  viewport: { width: number; height: number },
  body: (page: Page) => Promise<void>,
): Promise<void> {
  const context = await harness.browser.newContext({ viewport });
  const page = await context.newPage();
  try {
    await body(page);
  } finally {
    await context.close();
  }
}

Deno.test("the site behaves in a browser", async (t) => {
  const harness = await start();

  try {
    for (const [name, viewport] of [["phone", PHONE], ["tablet", TABLET]] as const) {
      await t.step(`the menu fills the screen after scrolling (${name})`, async () => {
        await withPage(harness, viewport, async (page) => {
          await page.goto(`${harness.origin}/`);

          // Past 24px the masthead gains [data-scrolled], which used to carry a
          // backdrop-filter — and a backdrop-filter makes an element the
          // containing block for its position: fixed descendants. The panel
          // then measured itself against the masthead and opened as a strip.
          await page.evaluate(() => globalThis.scrollTo(0, 600));
          await page.waitForFunction(() =>
            document.querySelector("[data-sticky]")?.hasAttribute("data-scrolled") === true
          );

          await page.click("[data-nav-toggle]");
          await page.waitForTimeout(700); // the clip-path wipe is 460ms

          const box = await page.locator("#site-nav").boundingBox();
          assert(box !== null, "the menu panel has no box");
          assert(
            box.height > viewport.height * 0.9,
            `the menu is ${Math.round(box.height)}px tall in a ${viewport.height}px viewport`,
          );

          // The layout box is not the whole story: clip-path shrinks what is
          // painted without touching it, so ask the browser what is actually
          // at the bottom of the screen. A panel clipped to a strip fails here
          // while still measuring full height.
          assert(
            await page.evaluate(() =>
              document.querySelector("#site-nav")?.contains(
                document.elementFromPoint(globalThis.innerWidth / 2, globalThis.innerHeight - 40),
              ) === true
            ),
            "the bottom of the screen is not covered by the menu",
          );
        });
      });
    }

    await t.step("the close button shuts the menu and gives focus back", async () => {
      await withPage(harness, PHONE, async (page) => {
        await page.goto(`${harness.origin}/`);
        await page.click("[data-nav-toggle]");
        await page.waitForTimeout(700);

        await page.click("[data-nav-close]");
        await page.waitForTimeout(700);

        assertEquals(
          await page.getAttribute("[data-nav-toggle]", "aria-expanded"),
          "false",
          "the menu is still open",
        );
        assert(
          await page.evaluate(() =>
            document.activeElement?.hasAttribute("data-nav-toggle") === true
          ),
          "focus did not return to the toggle",
        );
      });
    });

    await t.step("the masthead survives following a nav link", async () => {
      await withPage(harness, TABLET, async (page) => {
        await page.goto(`${harness.origin}/`);
        await page.click("[data-nav-toggle]");
        await page.waitForTimeout(700);
        await page.click('[data-nav-link][href="/#work"]');
        await page.waitForTimeout(900); // smooth scrolling

        // `overflow-x: hidden` on body made it a scroll container, and sticky
        // sticks to the nearest one — so the header stopped following the page
        // and was left behind at the top of the document.
        const top = await page.locator("[data-sticky]").boundingBox();
        assert(top !== null);
        assert(
          top.y >= -1 && top.y < 8,
          `the masthead is at y=${Math.round(top.y)} after following a link`,
        );
      });
    });

    await t.step("nav links work from a page that is not the landing page", async () => {
      await withPage(harness, LAPTOP, async (page) => {
        await page.goto(`${harness.origin}/pricing`);

        // Bare `#contact` is relative to the page being read, so on /pricing it
        // resolved to /pricing#contact and matched nothing at all.
        const href = await page.getAttribute('[data-nav-link][href*="contact"]', "href");
        assertEquals(href, "/#contact");

        await page.click('[data-nav-link][href*="contact"]');
        await page.waitForURL(/\/#contact$/);
        await page.waitForTimeout(600);

        assertStringIncludes(page.url(), "/#contact");
        assert(
          await page.locator("#contact").isVisible(),
          "the contact section is not on screen",
        );
      });
    });

    await t.step("the laptop layout is a row, with no menu button", async () => {
      await withPage(harness, LAPTOP, async (page) => {
        await page.goto(`${harness.origin}/`);
        assert(
          !(await page.locator("[data-nav-toggle]").isVisible()),
          "the menu button is drawn at laptop width",
        );
        assert(
          await page.locator('[data-nav-link][href="/#work"]').isVisible(),
          "the nav links are not laid out as a row",
        );
      });
    });

    await t.step("the layer stack finishes its reveal", async () => {
      await withPage(harness, TABLET, async (page) => {
        await page.goto(`${harness.origin}/`);
        await page.locator("[data-layers]").scrollIntoViewIfNeeded();

        // Wait for the reveal to start and then to finish. Waiting only for
        // "not playing" would pass instantly at page load, before the
        // animation had begun — which is exactly the state this is meant to
        // catch, so the test has to see the attribute arrive first.
        await page.waitForSelector("[data-layers][data-layers-playing]", { timeout: 15000 });
        await page.waitForFunction(
          () =>
            document.querySelector("[data-layers]")?.hasAttribute("data-layers-playing") === false,
          undefined,
          { timeout: 15000 },
        );

        assert(
          await page.locator("[data-layer-yours]").isVisible(),
          "the layer the business owns is not visible once the reveal is done",
        );

        // The counter must land on the cited figure, not on a rounded frame of
        // the count-up it happened to stop in.
        const counted = await page.locator("[data-layers-count]").textContent();
        assertEquals(counted?.trim(), "1,500×", "the counter did not finish on the cited figure");

        const opacity = await page.evaluate(() =>
          [...document.querySelectorAll("[data-layer-name]")]
            .map((el) => Number(getComputedStyle(el).opacity))
        );
        assert(opacity.every((value) => value > 0.95), `a layer was left faded: ${opacity}`);
      });
    });

    await t.step("changing language does not move the hero", async () => {
      await withPage(harness, PHONE, async (page) => {
        await page.goto(harness.origin);
        await page.locator(".hero__tagline-text").waitFor();

        // Every translation, not whichever two the rotation happens to reach.
        // The first version of this step waited for the text to change once and
        // passed by luck: the two it saw wrapped to the same number of rows, and
        // it never noticed the 15px the title moved on the ones that did not.
        const tops = await page.evaluate(() => {
          const host = document.querySelector("[data-mode='fade']") as HTMLElement | null;
          const text = document.querySelector(".hero__tagline-text");
          const title = document.querySelector(".hero__title");
          if (host === null || text === null || title === null) return null;

          const words = JSON.parse(host.dataset.words ?? "[]") as { text: string }[];
          const measured: Record<string, number> = {};
          const restore = text.textContent;
          for (const word of words) {
            text.textContent = word.text;
            measured[word.text] = title.getBoundingClientRect().top;
          }
          text.textContent = restore;
          return measured;
        });

        assert(tops !== null, "the rotating tagline was not found");
        const entries = Object.entries(tops);
        assert(entries.length >= 2, "there is nothing to rotate through");

        const [, first] = entries[0]!;
        for (const [text, top] of entries) {
          assert(
            Math.abs(top - first) <= 1,
            `"${text}" moves the hero title ${(top - first).toFixed(1)}px`,
          );
        }
      });
    });

    await t.step("the rotating slogan never resizes its box", async () => {
      await withPage(harness, PHONE, async (page) => {
        await page.goto(harness.origin);
        await page.locator(".typewriter [data-typewriter-text]").waitFor();

        // Every slogan, not whichever two the rotation reaches. The slogans run
        // 31 to 43 characters, so on a phone the long ones wrap and the short
        // ones do not — without the reserved sizer the buttons below would move
        // every few seconds.
        const tops = await page.evaluate(() => {
          const host = document.querySelector("[data-mode='scramble']") as HTMLElement | null;
          const text = document.querySelector(".typewriter [data-typewriter-text]");
          const actions = document.querySelector(".hero__actions");
          if (host === null || text === null || actions === null) return null;

          const words = JSON.parse(host.dataset.words ?? "[]") as string[];
          const measured: Record<string, number> = {};
          const restore = text.textContent;
          for (const word of words) {
            text.textContent = word;
            measured[word] = actions.getBoundingClientRect().top;
          }
          text.textContent = restore;
          return measured;
        });

        assert(tops !== null, "the rotating slogan was not found");
        const entries = Object.entries(tops);
        assert(entries.length >= 2, "there is nothing to rotate through");

        const [, first] = entries[0]!;
        for (const [word, top] of entries) {
          assert(
            Math.abs(top - first) <= 1,
            `"${word}" moves the buttons ${(top - first).toFixed(1)}px`,
          );
        }
      });
    });

    await t.step("the slogan always settles on real words", async () => {
      await withPage(harness, LAPTOP, async (page) => {
        await page.goto(harness.origin);
        const text = page.locator(".typewriter [data-typewriter-text]");
        await text.waitFor();

        const slogans = await page.evaluate(() => {
          const host = document.querySelector("[data-mode='scramble']") as HTMLElement;
          return JSON.parse(host.dataset.words ?? "[]") as string[];
        });

        // Watch two full transitions. Leftover noise on the hero is a worse
        // failure than no animation, so what matters is where it comes to rest.
        for (let i = 0; i < 2; i++) {
          const before = await text.textContent();
          await page.waitForFunction(
            (was) =>
              document.querySelector(".typewriter [data-typewriter-text]")?.textContent !== was,
            before,
            { timeout: 15000 },
          );
          // Long enough for the scramble to finish and the hold to begin.
          await page.waitForFunction(
            (words) =>
              words.includes(
                document.querySelector(".typewriter [data-typewriter-text]")?.textContent ?? "",
              ),
            slogans,
            { timeout: 15000 },
          );
          const settled = await text.textContent();
          assert(
            slogans.includes(settled ?? ""),
            `the line settled on "${settled}", which is not one of the slogans`,
          );
        }
      });
    });

    await t.step("the rotated tagline carries its language", async () => {
      await withPage(harness, PHONE, async (page) => {
        await page.goto(harness.origin);
        const text = page.locator(".hero__tagline-text");
        await text.waitFor();

        const before = await text.textContent();
        await page.waitForFunction(
          (was) => document.querySelector(".hero__tagline-text")?.textContent !== was,
          before,
          { timeout: 15000 },
        );

        // Without this a screen reader reads "Une Personne" with English
        // phonemes, which is worse than not translating at all.
        const lang = await text.getAttribute("lang");
        assert(lang !== null && /^[a-z]{2}$/.test(lang), `lang was ${lang}`);
      });
    });

    await t.step("the name is painted, whatever the browser does with gradients", async () => {
      await withPage(harness, PHONE, async (page) => {
        await page.goto(harness.origin);

        // The failure this guards against: `color: transparent` is how text is
        // clipped to a gradient, and it is also how text becomes invisible. The
        // two are indistinguishable in the markup, so assert the invariant
        // directly — transparent is only ever allowed when something else is
        // demonstrably doing the painting.
        const paint = await page.evaluate(() => {
          const title = document.querySelector(".hero__title");
          if (title === null) return null;
          const style = globalThis.getComputedStyle(title);
          return {
            color: style.color,
            clip: style.webkitBackgroundClip || style.backgroundClip,
            image: style.backgroundImage,
          };
        });

        assert(paint !== null, "there is no hero title");
        const transparent = paint.color === "rgba(0, 0, 0, 0)" || paint.color === "transparent";
        if (transparent) {
          assertEquals(paint.clip, "text", "the name is transparent and nothing is clipped to it");
          assert(paint.image !== "none", "the name is transparent with no gradient behind it");
        }

        // A letter must never be permanently promoted to its own layer: WebKit
        // does not reliably paint a parent's clipped gradient onto one, and the
        // result is a heading that is simply not there.
        const promoted = await page.evaluate(() =>
          [...document.querySelectorAll(".hero__letter")]
            .filter((letter) => globalThis.getComputedStyle(letter).willChange !== "auto").length
        );
        assertEquals(promoted, 0, "letters carry will-change, which can cost them their gradient");
      });
    });

    await t.step("the name fits the narrowest phone, and finishes its reveal", async () => {
      await withPage(harness, PHONE, async (page) => {
        await page.goto(harness.origin);

        // boundingBox() cannot see a clip, which is how the last hero shipped
        // with its final letters cut off. Ask the document instead: every letter
        // must sit inside the viewport it is being read in.
        const spill = await page.evaluate(() => {
          const letters = [...document.querySelectorAll(".hero__letter")];
          return letters.reduce((worst, letter) => {
            const box = letter.getBoundingClientRect();
            return Math.max(worst, box.right - globalThis.innerWidth, -box.left);
          }, 0);
        });
        assert(spill <= 1, `the name spills ${spill}px past the viewport at ${PHONE.width}px`);

        // And it must end visible. The reveal hides the letters before it plays
        // them back, so a reveal that stops halfway leaves the page headless.
        //
        // Waiting for the attribute to appear first is not ceremony: waiting
        // only for it to be absent passes instantly at page load, before the
        // reveal has begun, and asserts nothing at all.
        await page.waitForFunction(
          () => document.querySelector(".hero")?.hasAttribute("data-hero-playing"),
          { timeout: 8000 },
        );
        await page.waitForFunction(
          () => !document.querySelector(".hero")?.hasAttribute("data-hero-playing"),
          { timeout: 8000 },
        );
        const faded = await page.evaluate(() =>
          [...document.querySelectorAll(".hero__letter")]
            .map((letter) => Number(globalThis.getComputedStyle(letter).opacity))
            .filter((value) => value < 0.95).length
        );
        assertEquals(faded, 0, "letters were left faded out after the reveal");
      });
    });

    for (
      const [name, viewport] of [["phone", PHONE], ["tablet", TABLET], ["laptop", LAPTOP]] as const
    ) {
      await t.step(`nothing scrolls sideways (${name})`, async () => {
        await withPage(harness, viewport, async (page) => {
          for (const path of ["/", "/thesis", "/pricing"]) {
            await page.goto(`${harness.origin}${path}`);
            const overflow = await page.evaluate(() =>
              document.documentElement.scrollWidth - globalThis.innerWidth
            );
            assert(
              overflow <= 1,
              `${path} overflows by ${overflow}px at ${viewport.width}px`,
            );
          }
        });
      });
    }
  } finally {
    await harness.close();
  }
});
