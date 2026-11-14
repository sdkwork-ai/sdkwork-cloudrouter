import assert from "node:assert/strict";
import test from "node:test";

import { resolvePublicApiHostname } from "./packages/sdkwork-cloudrouter-pc-admin-payments/src/services/payment-domain-defaults.ts";

test("callback default resolves the public API host from the console host", () => {
  // The production console is platform.birdcoder.com; PSP webhooks must target
  // the API gateway host, not the console.
  assert.equal(resolvePublicApiHostname("platform.birdcoder.com"), "api.birdcoder.com");
  assert.equal(resolvePublicApiHostname("platform.sdkwork.com"), "api.sdkwork.com");
  assert.equal(resolvePublicApiHostname("www.birdcoder.com"), "api.birdcoder.com");
  assert.equal(resolvePublicApiHostname("admin.birdcoder.com"), "api.birdcoder.com");
  // Nested brand domains keep their full base domain.
  assert.equal(resolvePublicApiHostname("platform.birdcoder.com.cn"), "api.birdcoder.com.cn");
});

test("callback default never rewrites an API host, loopback, or IP literal", () => {
  assert.equal(resolvePublicApiHostname("api.birdcoder.com"), "api.birdcoder.com");
  assert.equal(resolvePublicApiHostname("localhost"), "localhost");
  assert.equal(resolvePublicApiHostname("127.0.0.1"), "127.0.0.1");
  assert.equal(resolvePublicApiHostname("pay.example.com"), "pay.example.com");
  assert.equal(resolvePublicApiHostname(""), "");
});
