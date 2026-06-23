import { chromium, type Browser, type BrowserContext } from "playwright";
import { config } from "./config.js";

/*
  Shared hardened browser launcher for both crawlers (Maps + SERP).

  Google fingerprints headless Chromium aggressively, so before any page
  script runs we:
    - launch *real* Chrome (channel "chrome") when it's installed — its
      fingerprint matches a genuine desktop install — and fall back to the
      bundled Chromium if Chrome isn't present.
    - drop the "--enable-automation" flag and the AutomationControlled blink
      feature, the two switches that announce "I'm a bot".
    - strip the obvious JS tells (navigator.webdriver, the missing chrome
      runtime, empty plugins/languages, the SwiftShader WebGL vendor) via an
      init script that runs before the page's own scripts.
    - present a consistent, real-looking locale / timezone / UA / headers.

  This is best-effort: it lowers how often Google serves a CAPTCHA, it does
  NOT make the crawler undetectable. IP reputation and request volume still
  dominate, so pacing — and eventually residential proxies — remain the real
  defence. Tune at runtime with HEADFUL=1 and BROWSER_CHANNEL.
*/

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export async function launchStealth(): Promise<{
  browser: Browser;
  context: BrowserContext;
}> {
  const browser = await launchBrowser();

  const context = await browser.newContext({
    locale: "en-US",
    timezoneId: "Europe/Istanbul",
    viewport: { width: 1366, height: 900 },
    userAgent: UA,
    extraHTTPHeaders: { "Accept-Language": "en-US,en;q=0.9" },
  });

  // tsx transpiles every page.evaluate / init-script callback through esbuild,
  // whose `keepNames` wraps named functions in a `__name(...)` helper. Playwright
  // serializes the callback and runs it in the browser, where that helper is
  // undefined → "ReferenceError: __name is not defined". Define it as identity
  // first so the stealth script below *and* the crawlers' page.evaluate callbacks
  // (e.g. seo.ts) run. Passed as a string so esbuild leaves it untouched — a
  // function arg would get the same __name treatment and reintroduce the bug.
  await context.addInitScript(
    "globalThis.__name = globalThis.__name || ((fn) => fn);"
  );

  // Runs in every page before its own scripts — patches the headless tells.
  // `g` casts to the browser's globals (the worker's tsconfig is Node-only,
  // so DOM types aren't in scope — same cast convention as the crawlers'
  // page.evaluate callbacks).
  await context.addInitScript(() => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const g = globalThis as any;
    // The single biggest giveaway.
    Object.defineProperty(g.navigator, "webdriver", { get: () => undefined });
    // Headless reports an empty languages/plugins set; real Chrome doesn't.
    Object.defineProperty(g.navigator, "languages", { get: () => ["en-US", "en"] });
    Object.defineProperty(g.navigator, "plugins", { get: () => [1, 2, 3, 4, 5] });
    // window.chrome.runtime exists in real Chrome, missing in headless.
    g.chrome = { runtime: {} };
    // Notification permission is "denied" under automation — make it "prompt".
    const query = g.navigator.permissions.query.bind(g.navigator.permissions);
    g.navigator.permissions.query = (params: any) =>
      params && params.name === "notifications"
        ? Promise.resolve({ state: g.Notification.permission })
        : query(params);
    // Headless WebGL reports "Google Inc."/"SwiftShader"; spoof a real GPU.
    const getParameter = g.WebGLRenderingContext.prototype.getParameter;
    g.WebGLRenderingContext.prototype.getParameter = function (param: number) {
      if (param === 37445) return "Intel Inc."; // UNMASKED_VENDOR_WEBGL
      if (param === 37446) return "Intel Iris OpenGL Engine"; // UNMASKED_RENDERER_WEBGL
      return getParameter.call(this, param);
    };
  });

  return { browser, context };
}

/* Prefer real Chrome; fall back to bundled Chromium when it isn't installed. */
async function launchBrowser(): Promise<Browser> {
  const opts = {
    headless: config.headless,
    // Removes the "Chrome is being controlled by automated software" switch.
    ignoreDefaultArgs: ["--enable-automation"],
    args: ["--disable-blink-features=AutomationControlled"],
  };

  if (config.browserChannel) {
    try {
      return await chromium.launch({ ...opts, channel: config.browserChannel });
    } catch (err) {
      console.warn(
        `[browser] channel "${config.browserChannel}" unavailable (${
          (err as Error).message
        }); falling back to bundled Chromium`
      );
    }
  }
  return chromium.launch(opts);
}
