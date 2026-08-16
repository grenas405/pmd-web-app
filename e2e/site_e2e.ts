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

    for (
      const [name, viewport] of [["phone", PHONE], ["tablet", TABLET], ["laptop", LAPTOP]] as const
    ) {
      await t.step(`nothing scrolls sideways (${name})`, async () => {
        await withPage(harness, viewport, async (page) => {
          for (const path of ["/", "/pricing"]) {
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
