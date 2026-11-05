/**
 * Real-browser smoke for the hosted SDKWork OAuth entry.
 *
 * Serves the production web build and stubs the app API with deterministic
 * responses, then verifies that `/iam/oauth/authorize` renders the IAM login in
 * place: the browser stays on the hosted route instead of navigating to the
 * API origin.
 *
 * Run after a production web build:
 *   node scripts/oauth-browser-smoke.mjs
 */
import { createServer } from "node:http";
import { readFile, readdir, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const playwrightPackage = (await readdir(join(process.cwd(), "node_modules/.pnpm")))
  .filter((entry) => entry.startsWith("playwright@"))
  .sort()
  .at(-1);
if (playwrightPackage === undefined) {
  throw new Error("playwright is not installed in node_modules/.pnpm");
}
const { chromium } = await import(
  `../node_modules/.pnpm/${playwrightPackage}/node_modules/playwright/index.mjs`
);

const webRoot = join(process.cwd(), "apps/sdkwork-cloudrouter-pc/dist/cloud/prod");
const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
};

try {
  await stat(join(webRoot, "index.html"));
} catch {
  throw new Error(
    `production web build missing at ${webRoot}; run the cloudrouter production build first`,
  );
}

const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
    let file = normalize(join(webRoot, pathname));
    if (!file.startsWith(webRoot)) {
      response.writeHead(403).end();
      return;
    }
    try {
      if ((await stat(file)).isDirectory()) file = join(file, "index.html");
    } catch {
      file = join(webRoot, "index.html");
    }
    response.writeHead(200, {
      "content-type": contentTypes[extname(file)] ?? "application/octet-stream",
    });
    response.end(await readFile(file));
  } catch (error) {
    response.writeHead(500).end(String(error));
  }
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const port = server.address().port;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const apiRequests = [];
page.on("console", (message) => {
  if (message.type() === "error") console.error("browser console error:", message.text());
});

await page.route("**/app/v3/api/**", async (route) => {
  const url = route.request().url();
  apiRequests.push(`${route.request().method()} ${url}`);
  if (url.includes("/oauth/authorizations")) {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        code: 0,
        data: {
          authorizationStateId: "state-browser-smoke",
          expiresAt: "2030-01-01T00:00:00Z",
        },
      }),
    });
    return;
  }
  if (url.includes("/system/iam/runtime")) {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        code: 0,
        data: { auth: { loginMethods: ["password"], oauthProviders: [] } },
      }),
    });
    return;
  }
  if (url.includes("/auth/sessions/current")) {
    await route.fulfill({ status: 401, contentType: "application/json", body: "{}" });
    return;
  }
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ code: 0, data: {} }),
  });
});

const authorizationStateId = "state-browser-smoke";
const url = `http://127.0.0.1:${port}/iam/oauth/authorize?client_id=app_desktop_e2e_partner&response_type=code&redirect_uri=${encodeURIComponent("sdkwork-iam://auth/callback")}&scope=openid%20profile%20email&state=${authorizationStateId}&code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM&code_challenge_method=S256`;
const failures = [];
try {
  await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
  await page.waitForTimeout(1_500);

  const finalUrl = page.url();
  const bodyText = (await page.locator("body").innerText()).replace(/\s+/g, " ");
  if (!finalUrl.includes("/iam/oauth/authorize")) {
    failures.push(`left the hosted route: ${finalUrl}`);
  }
  if (finalUrl.includes("api.birdcoder.com")) {
    failures.push(`navigated to the API origin: ${finalUrl}`);
  }
  if (!/sign in|登录|password|密码/iu.test(bodyText)) {
    failures.push(`login form not rendered: ${bodyText.slice(0, 300)}`);
  }
  if (!apiRequests.some((entry) => entry.includes("/oauth/authorizations"))) {
    failures.push("hosted authorization bootstrap was not requested");
  }
  console.log(`hosted route: ${finalUrl}`);
  console.log(`body: ${bodyText.slice(0, 240)}`);
  console.log(`api requests: ${apiRequests.length}`);
} finally {
  await browser.close();
  server.close();
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log("PASS hosted OAuth login renders in place");
}
