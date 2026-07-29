import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  clearStoredAppSessionToken,
  storeAppSessionFromResult,
} from "./packages/sdkwork-clawroutes-pc-commons/src/app-session-token.ts";
import { resetClawRouterSdkClients } from "./packages/sdkwork-clawroutes-pc-commons/src/sdk-clients.ts";
import { RateLimitService } from "./packages/sdkwork-clawrouter-pc-admin-ratelimit/src/ratelimitService.ts";
import {
  createFirewallInputFromForm,
  createIpLimitInputFromForm,
  createModelLimitInputFromForm,
  createTokenLimitInputFromForm,
} from "./packages/sdkwork-clawrouter-pc-admin-ratelimit/src/ratelimitForm.ts";

const originalFetch = globalThis.fetch;
const originalWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");

type CapturedBackendRequest = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
};

async function withBackendSdkFetch<T>(
  handler: (url: string, init?: RequestInit) => unknown,
  fn: (captured: CapturedBackendRequest[]) => Promise<T>,
): Promise<T> {
  const captured: CapturedBackendRequest[] = [];
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    enumerable: true,
    value: {},
  });
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const body = typeof init?.body === "string" ? init.body : "";
    const headers = Object.fromEntries(new Headers(init?.headers).entries());
    captured.push({
      url,
      method: init?.method ?? "GET",
      headers,
      body,
    });
    const result = handler(url, init);
    return new Response(JSON.stringify({ code: "2000", data: result }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
  clearStoredAppSessionToken();
  storeAppSessionFromResult({
    code: "2000",
    data: { accessToken: "test-access-token", authToken: "test-auth-token" },
  });
  resetClawRouterSdkClients();

  try {
    return await fn(captured);
  } finally {
    clearStoredAppSessionToken();
    resetClawRouterSdkClients();
    globalThis.fetch = originalFetch;
    if (originalWindowDescriptor) {
      Object.defineProperty(globalThis, "window", originalWindowDescriptor);
    } else {
      delete (globalThis as { window?: Window }).window;
    }
  }
}

test("admin IP limit create input does not reuse returned rule view model", () => {
  const form = new FormData();
  form.set("ruleName", " Edge CIDR ");
  form.set("targetIp", " 10.0.0.0/24 ");
  form.set("rps", " 15 ");
  form.set("rpm", " 900 ");
  form.set("blockDuration", " 10m ");

  const input = createIpLimitInputFromForm(form);

  assert.deepEqual(input, {
    ruleName: "Edge CIDR",
    targetIp: "10.0.0.0/24",
    rps: 15,
    rpm: 900,
    blockDuration: "10m",
  });
  for (const field of ["id", "status"]) {
    assert.equal(field in input, false);
  }
});

test("admin ratelimit form rejects invalid required values instead of creating placeholder rules", () => {
  const form = new FormData();
  form.set("keyPrefix", " ");
  form.set("user", " Platform Ops ");
  form.set("rps", "not-a-number");
  form.set("rpd", "-1");
  form.set("burst", "0");

  assert.throws(
    () => createTokenLimitInputFromForm(form),
    /keyPrefix is required/,
  );

  form.set("keyPrefix", "sk-prod");
  assert.throws(
    () => createTokenLimitInputFromForm(form),
    /rps must be a positive integer/,
  );

  const ipForm = new FormData();
  ipForm.set("ruleName", "Edge CIDR");
  ipForm.set("targetIp", "10.0.0.0/24");
  ipForm.set("rps", "0");
  ipForm.set("rpm", "900");
  ipForm.set("blockDuration", "10m");
  assert.throws(
    () => createIpLimitInputFromForm(ipForm),
    /rps must be a positive integer/,
  );
  ipForm.set("rps", "12.5");
  assert.throws(
    () => createIpLimitInputFromForm(ipForm),
    /rps must be a positive integer/,
  );
  ipForm.set("rps", "12");
  ipForm.set("blockDuration", " ");
  assert.throws(
    () => createIpLimitInputFromForm(ipForm),
    /blockDuration is required/,
  );

  const modelForm = new FormData();
  modelForm.set("model", "gpt-4o-mini");
  modelForm.set("accountGroup", "enterprise");
  modelForm.set("rpm", "60");
  modelForm.set("tpm", "not-a-number");
  assert.throws(
    () => createModelLimitInputFromForm(modelForm),
    /tpm must be a positive integer/,
  );
});

test("admin ratelimit modals expose browser constraints matching backend positive integer commands", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-ratelimit/src/index.tsx", import.meta.url),
    "utf8",
  );

  for (const field of ["rps", "rpm", "burst", "rpd", "tpm"]) {
    assert.match(
      source,
      new RegExp(`name="${field}" type="number"[^>]*min="1"[^>]*step="1"`),
      `${field} should be constrained to positive integers in the UI`,
    );
  }
  assert.match(source, /name="blockDuration"/);
});

test("admin ratelimit page does not expose unsupported row menus and dashboard loads backend rule aggregates", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-ratelimit/src/index.tsx", import.meta.url),
    "utf8",
  );
  const querySource = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-ratelimit/src/ratelimitQueries.ts", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /MoreVertical/);
  assert.doesNotMatch(source, /<button className="text-slate-400 hover:text-red-500"/);
  assert.match(source, /useRateLimitDashboardQuery/);
  assert.match(querySource, /Promise\.all\(\[/);
  assert.match(querySource, /RateLimitService\.fetchIpLimits\(dashboardSampleFilters\)/);
  assert.match(querySource, /RateLimitService\.fetchTokenLimits\(dashboardSampleFilters\)/);
  assert.match(querySource, /RateLimitService\.fetchModelLimits\(dashboardSampleFilters\)/);
  assert.match(querySource, /RateLimitService\.fetchFirewalls\(dashboardSampleFilters\)/);
  assert.match(source, /BottomPagination/);
  assert.match(source, /activeIpLimits/);
  assert.match(source, /exhaustedTokenLimits/);
  assert.match(source, /activeModelLimits/);
  assert.match(source, /firewallRules/);
});

test("admin model limit create input does not reuse returned model limit view model", () => {
  const form = new FormData();
  form.set("model", " gpt-4o-mini ");
  form.set("accountGroup", " enterprise ");
  form.set("rpm", " 60 ");
  form.set("tpm", " 200000 ");

  const input = createModelLimitInputFromForm(form);

  assert.deepEqual(input, {
    model: "gpt-4o-mini",
    accountGroup: "enterprise",
    rpm: 60,
    tpm: 200000,
  });
  for (const field of ["id", "status"]) {
    assert.equal(field in input, false);
  }
});

test("admin firewall create input does not reuse returned firewall view model", () => {
  const form = new FormData();
  form.set("type", " IP deny ");
  form.set("value", " 203.0.113.10 ");
  form.set("reason", " Abuse ");

  const input = createFirewallInputFromForm(form);

  assert.deepEqual(input, {
    type: "IP deny",
    value: "203.0.113.10",
    reason: "Abuse",
  });
  for (const field of ["id", "time"]) {
    assert.equal(field in input, false);
  }
});

test("admin ratelimit service calls generated backend SDK paths and normalizes rule data", async () => {
  await withBackendSdkFetch(
    (url, init) => {
      const method = init?.method ?? "GET";
      if (url.startsWith("/backend/v3/api/system/rate_limits/ip") && method === "GET") {
        return {
          items: [
            {
              id: "ip-1",
              ruleName: "Edge CIDR",
              targetIp: "10.0.0.0/24",
              rps: "15",
              rpm: 900,
              blockDuration: "10m",
              status: "inactive",
            },
          ],
          pageInfo: { totalItems: 1, mode: "offset" },
        };
      }
      if (url === "/backend/v3/api/system/rate_limits/ip" && method === "POST") {
        return {
          item: {
            id: "ip-2",
            ruleName: "Created CIDR",
            targetIp: "192.0.2.0/24",
            rps: 20,
            rpm: 1200,
            blockDuration: "30m",
            status: "active",
          },
        };
      }
      if (url.startsWith("/backend/v3/api/system/rate_limits/api_keys") && method === "GET") {
        return {
          items: [
            {
              id: "token-1",
              keyPrefix: "sk-prod",
              user: "Platform Ops",
              rps: "2",
              rpd: 10000,
              burst: 8,
              status: "exhausted",
            },
          ],
          pageInfo: { totalItems: 1, mode: "offset" },
        };
      }
      if (url === "/backend/v3/api/system/rate_limits/api_keys" && method === "POST") {
        return {
          item: {
            id: "token-2",
            keyPrefix: "sk-new",
            user: "Billing",
            rps: 3,
            rpd: 20000,
            burst: 10,
            status: "active",
          },
        };
      }
      if (url.startsWith("/backend/v3/api/system/rate_limits/models") && method === "GET") {
        return {
          items: [
            {
              id: "model-limit-1",
              model: "gpt-4o-mini",
              accountGroup: "enterprise",
              accountGroupId: "group-1",
              accountGroupName: "Enterprise",
              rpm: "60",
              tpm: 200000,
              status: "inactive",
            },
          ],
          pageInfo: { totalItems: 1, mode: "offset" },
        };
      }
      if (url === "/backend/v3/api/system/rate_limits/models" && method === "POST") {
        return {
          item: {
            id: "model-limit-2",
            model: "claude-3-5-sonnet",
            accountGroup: "enterprise",
            accountGroupId: "group-1",
            accountGroupName: "Enterprise",
            rpm: 30,
            tpm: 100000,
            status: "active",
          },
        };
      }
      if (url.startsWith("/backend/v3/api/system/firewalls/rules") && method === "GET") {
        return {
          items: [
            {
              id: "firewall-1",
              type: "IP deny",
              value: "203.0.113.10",
              reason: "Abuse",
              time: "2026-05-05T08:00:00Z",
            },
          ],
          pageInfo: { totalItems: 1, mode: "offset" },
        };
      }
      if (url === "/backend/v3/api/system/firewalls/rules" && method === "POST") {
        return {
          item: {
            id: "firewall-2",
            type: "IP allow",
            value: "198.51.100.10",
            reason: "Enterprise",
            time: "2026-05-05T08:05:00Z",
          },
        };
      }
      if (url === "/backend/v3/api/system/firewalls/rules/firewall-2" && method === "DELETE") {
        return { deleted: true };
      }
      throw new Error(`Unexpected SDK request ${method} ${url}`);
    },
    async (captured) => {
      const ipLimits = await RateLimitService.fetchIpLimits({ page: 2, pageSize: 10, q: "edge" });
      const createdIp = await RateLimitService.addIpLimit({
        ruleName: "Created CIDR",
        targetIp: "192.0.2.0/24",
        rps: 20,
        rpm: 1200,
        blockDuration: "30m",
      });
      const tokenLimits = await RateLimitService.fetchTokenLimits();
      const createdToken = await RateLimitService.addTokenLimit({
        keyPrefix: "sk-new",
        user: "Billing",
        rps: 3,
        rpd: 20000,
        burst: 10,
      });
      const modelLimits = await RateLimitService.fetchModelLimits();
      const createdModel = await RateLimitService.addModelLimit({
        model: "claude-3-5-sonnet",
        accountGroup: "enterprise",
        rpm: 30,
        tpm: 100000,
      });
      const firewalls = await RateLimitService.fetchFirewalls();
      const createdFirewall = await RateLimitService.addFirewall({
        type: "IP allow",
        value: "198.51.100.10",
        reason: "Enterprise",
      });
      const removed = await RateLimitService.removeFirewall("firewall-2");

      assert.equal(ipLimits.items[0].rps, 15);
      assert.equal(ipLimits.items[0].status, "inactive");
      assert.equal(ipLimits.total, 1);
      assert.equal(createdIp.id, "ip-2");
      assert.equal(tokenLimits.items[0].status, "exhausted");
      assert.equal(createdToken.burst, 10);
      assert.equal(modelLimits.items[0].rpm, 60);
      assert.equal(createdModel.status, "active");
      assert.equal(firewalls.items[0].value, "203.0.113.10");
      assert.equal(createdFirewall.id, "firewall-2");
      assert.equal(removed, true);
      assert.match(captured[0].url, /page=2/);
      assert.match(captured[0].url, /page_size=10/);
      assert.match(captured[0].url, /q=edge/);
      assert.deepEqual(
        captured.map((request) => `${request.method} ${request.url.split("?")[0]}`),
        [
          "GET /backend/v3/api/system/rate_limits/ip",
          "POST /backend/v3/api/system/rate_limits/ip",
          "GET /backend/v3/api/system/rate_limits/api_keys",
          "POST /backend/v3/api/system/rate_limits/api_keys",
          "GET /backend/v3/api/system/rate_limits/models",
          "POST /backend/v3/api/system/rate_limits/models",
          "GET /backend/v3/api/system/firewalls/rules",
          "POST /backend/v3/api/system/firewalls/rules",
          "DELETE /backend/v3/api/system/firewalls/rules/firewall-2",
        ],
      );
      assert.deepEqual(JSON.parse(captured[1].body), {
        ruleName: "Created CIDR",
        targetIp: "192.0.2.0/24",
        rps: 20,
        rpm: 1200,
        blockDuration: "30m",
      });
      for (const request of captured) {
        assert.equal(request.headers["x-request-id"], undefined);
      }
    },
  );
});

test("admin ratelimit service rejects invalid commands before calling generated backend SDK", async () => {
  await withBackendSdkFetch(
    () => {
      throw new Error("backend SDK must not be called for invalid ratelimit commands");
    },
    async (captured) => {
      await assert.rejects(
        () =>
          RateLimitService.addIpLimit({
            ruleName: "",
            targetIp: "10.0.0.0/24",
            rps: 1,
            rpm: 60,
            blockDuration: "10m",
          }),
        /ruleName is required/,
      );
      await assert.rejects(
        () =>
          RateLimitService.addTokenLimit({
            keyPrefix: "sk-prod",
            user: "Ops",
            rps: 0,
            rpd: 100,
            burst: 1,
          }),
        /rps must be a positive integer/,
      );
      await assert.rejects(
        () =>
          RateLimitService.addIpLimit({
            ruleName: "Fractional CIDR",
            targetIp: "10.0.0.0/24",
            rps: 1.5,
            rpm: 60,
            blockDuration: "10m",
          }),
        /rps must be a positive integer/,
      );
      await assert.rejects(
        () =>
          RateLimitService.addModelLimit({
            model: "gpt-4o-mini",
            accountGroup: "enterprise",
            rpm: 60,
            tpm: 100.5,
          }),
        /tpm must be a positive integer/,
      );
      await assert.rejects(
        () =>
          RateLimitService.addFirewall({
            type: "IP deny",
            value: "",
            reason: "Abuse",
          }),
        /value is required/,
      );
      assert.equal(captured.length, 0);
    },
  );
});

test("admin ratelimit service rejects unsafe firewall path ids before calling generated backend SDK", async () => {
  await withBackendSdkFetch(
    () => {
      throw new Error("backend SDK must not be called for unsafe firewall path ids");
    },
    async (captured) => {
      await assert.rejects(
        () => RateLimitService.removeFirewall("firewall/2"),
        /firewallRuleId must be a safe path segment/,
      );
      assert.equal(captured.length, 0);
    },
  );
});

test("admin firewall delete follows standard 204 success semantics without a response body", async () => {
  for (const response of [{}, { deleted: false }]) {
    await withBackendSdkFetch(
      (url, init) => {
        if (url === "/backend/v3/api/system/firewalls/rules/firewall-2" && init?.method === "DELETE") {
          return response;
        }
        throw new Error(`Unexpected SDK request ${init?.method ?? "GET"} ${url}`);
      },
      async () => {
        assert.equal(await RateLimitService.removeFirewall("firewall-2"), true);
      },
    );
  }
});

test("admin IP limit list fails closed when backend omits stable rule ids", async () => {
  await withBackendSdkFetch(
    (url, init) => {
      if (url === "/backend/v3/api/system/rate_limits/ip" && (init?.method ?? "GET") === "GET") {
        return {
          items: [
            {
              ruleName: "Missing Id CIDR",
              targetIp: "10.0.0.0/24",
              rps: 15,
              rpm: 900,
              blockDuration: "10m",
              status: "active",
            },
          ],
        };
      }
      throw new Error(`Unexpected SDK request ${init?.method ?? "GET"} ${url}`);
    },
    async () => {
      await assert.rejects(
        () => RateLimitService.fetchIpLimits(),
        /IP limit id is required/,
      );
    },
  );
});

test("admin IP limit list fails closed when backend returns malformed rows", async () => {
  await withBackendSdkFetch(
    (url, init) => {
      if (url === "/backend/v3/api/system/rate_limits/ip" && (init?.method ?? "GET") === "GET") {
        return {
          items: [
            {
              id: "ip-1",
              ruleName: "Edge CIDR",
              targetIp: "10.0.0.0/24",
              rps: 15,
              rpm: 900,
              blockDuration: "10m",
              status: "active",
            },
            "malformed-ip-limit-row",
          ],
        };
      }
      throw new Error(`Unexpected SDK request ${init?.method ?? "GET"} ${url}`);
    },
    async () => {
      await assert.rejects(
        () => RateLimitService.fetchIpLimits(),
        /IP limit record is required/,
      );
    },
  );
});

test("admin IP limit list fails closed when backend omits positive thresholds", async () => {
  await withBackendSdkFetch(
    (url, init) => {
      if (url === "/backend/v3/api/system/rate_limits/ip" && (init?.method ?? "GET") === "GET") {
        return {
          items: [
            {
              id: "ip-1",
              ruleName: "Edge CIDR",
              targetIp: "10.0.0.0/24",
              rpm: 900,
              blockDuration: "10m",
              status: "active",
            },
          ],
        };
      }
      throw new Error(`Unexpected SDK request ${init?.method ?? "GET"} ${url}`);
    },
    async () => {
      await assert.rejects(
        () => RateLimitService.fetchIpLimits(),
        /IP limit rps is required/,
      );
    },
  );
});

test("admin IP limit list fails closed when backend omits or corrupts status", async () => {
  for (const [patch, message] of [
    [{ status: undefined }, /IP limit status is required/],
    [{ status: "paused" }, /Unsupported IP limit status: paused/],
  ] as const) {
    await withBackendSdkFetch(
      (url, init) => {
        if (url === "/backend/v3/api/system/rate_limits/ip" && (init?.method ?? "GET") === "GET") {
          const rule = {
            id: "ip-1",
            ruleName: "Edge CIDR",
            targetIp: "10.0.0.0/24",
            rps: 15,
            rpm: 900,
            blockDuration: "10m",
            status: "active",
            ...patch,
          } as Record<string, unknown>;
          if (patch.status === undefined) {
            delete rule.status;
          }
          return { items: [rule] };
        }
        throw new Error(`Unexpected SDK request ${init?.method ?? "GET"} ${url}`);
      },
      async () => {
        await assert.rejects(
          () => RateLimitService.fetchIpLimits(),
          message,
        );
      },
    );
  }
});

test("admin token limit list fails closed when backend returns malformed rows", async () => {
  await withBackendSdkFetch(
    (url, init) => {
      if (url === "/backend/v3/api/system/rate_limits/api_keys" && (init?.method ?? "GET") === "GET") {
        return {
          items: ["malformed-token-limit-row"],
        };
      }
      throw new Error(`Unexpected SDK request ${init?.method ?? "GET"} ${url}`);
    },
    async () => {
      await assert.rejects(
        () => RateLimitService.fetchTokenLimits(),
        /Token limit record is required/,
      );
    },
  );
});

test("admin token limit list fails closed when backend omits or corrupts status", async () => {
  for (const [patch, message] of [
    [{ status: undefined }, /Token limit status is required/],
    [{ status: "disabled" }, /Unsupported token limit status: disabled/],
  ] as const) {
    await withBackendSdkFetch(
      (url, init) => {
        if (url === "/backend/v3/api/system/rate_limits/api_keys" && (init?.method ?? "GET") === "GET") {
          const rule = {
            id: "token-1",
            keyPrefix: "sk-prod",
            user: "Platform Ops",
            rps: 2,
            rpd: 10000,
            burst: 8,
            status: "active",
            ...patch,
          } as Record<string, unknown>;
          if (patch.status === undefined) {
            delete rule.status;
          }
          return { items: [rule] };
        }
        throw new Error(`Unexpected SDK request ${init?.method ?? "GET"} ${url}`);
      },
      async () => {
        await assert.rejects(
          () => RateLimitService.fetchTokenLimits(),
          message,
        );
      },
    );
  }
});

test("admin model limit list fails closed when backend omits stable rule ids", async () => {
  await withBackendSdkFetch(
    (url, init) => {
      if (url === "/backend/v3/api/system/rate_limits/models" && (init?.method ?? "GET") === "GET") {
        return {
          items: [
            {
              model: "gpt-4o-mini",
              accountGroup: "enterprise",
              rpm: 60,
              tpm: 200000,
              status: "active",
            },
          ],
        };
      }
      throw new Error(`Unexpected SDK request ${init?.method ?? "GET"} ${url}`);
    },
    async () => {
      await assert.rejects(
        () => RateLimitService.fetchModelLimits(),
        /Model limit id is required/,
      );
    },
  );
});

test("admin model limit list fails closed when backend omits or corrupts status", async () => {
  for (const [patch, message] of [
    [{ status: undefined }, /Model limit status is required/],
    [{ status: "paused" }, /Unsupported model limit status: paused/],
  ] as const) {
    await withBackendSdkFetch(
      (url, init) => {
        if (url === "/backend/v3/api/system/rate_limits/models" && (init?.method ?? "GET") === "GET") {
          const rule = {
            id: "model-limit-1",
            model: "gpt-4o-mini",
            accountGroup: "enterprise",
            rpm: 60,
            tpm: 200000,
            status: "active",
            ...patch,
          } as Record<string, unknown>;
          if (patch.status === undefined) {
            delete rule.status;
          }
          return { items: [rule] };
        }
        throw new Error(`Unexpected SDK request ${init?.method ?? "GET"} ${url}`);
      },
      async () => {
        await assert.rejects(
          () => RateLimitService.fetchModelLimits(),
          message,
        );
      },
    );
  }
});

test("admin firewall list fails closed when backend omits stable rule ids", async () => {
  await withBackendSdkFetch(
    (url, init) => {
      if (url === "/backend/v3/api/system/firewalls/rules" && (init?.method ?? "GET") === "GET") {
        return {
          items: [
            {
              type: "IP deny",
              value: "203.0.113.10",
              reason: "Abuse",
              time: "2026-05-05T08:00:00Z",
            },
          ],
        };
      }
      throw new Error(`Unexpected SDK request ${init?.method ?? "GET"} ${url}`);
    },
    async () => {
      await assert.rejects(
        () => RateLimitService.fetchFirewalls(),
        /Firewall rule id is required/,
      );
    },
  );
});

test("admin firewall list fails closed when backend returns malformed rows", async () => {
  await withBackendSdkFetch(
    (url, init) => {
      if (url === "/backend/v3/api/system/firewalls/rules" && (init?.method ?? "GET") === "GET") {
        return {
          items: [
            {
              id: "firewall-1",
              type: "IP deny",
              value: "203.0.113.10",
              reason: "Abuse",
              time: "2026-05-05T08:00:00Z",
            },
            "malformed-firewall-row",
          ],
        };
      }
      throw new Error(`Unexpected SDK request ${init?.method ?? "GET"} ${url}`);
    },
    async () => {
      await assert.rejects(
        () => RateLimitService.fetchFirewalls(),
        /Firewall rule record is required/,
      );
    },
  );
});

test("admin firewall list fails closed when backend omits firewall values", async () => {
  await withBackendSdkFetch(
    (url, init) => {
      if (url === "/backend/v3/api/system/firewalls/rules" && (init?.method ?? "GET") === "GET") {
        return {
          items: [
            {
              id: "firewall-1",
              type: "IP deny",
              reason: "Abuse",
              time: "2026-05-05T08:00:00Z",
            },
          ],
        };
      }
      throw new Error(`Unexpected SDK request ${init?.method ?? "GET"} ${url}`);
    },
    async () => {
      await assert.rejects(
        () => RateLimitService.fetchFirewalls(),
        /Firewall rule value is required/,
      );
    },
  );
});

test("admin ratelimit tables use adaptive admin table shells", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-clawrouter-pc-admin-ratelimit/src/index.tsx", import.meta.url),
    "utf8",
  );

  for (const expected of [
    "AdminTableShell",
    "data-admin-ratelimit-table-card",
    "data-admin-ratelimit-table-viewport",
    "flex h-full min-h-0 w-full flex-col",
    "className=\"flex-1 min-h-0 rounded-lg shadow-none\"",
    "viewportClassName=\"min-h-0 flex-1 relative\"",
    "sticky top-0 z-10",
  ]) {
    assert.ok(source.includes(expected), `missing adaptive admin ratelimit table marker: ${expected}`);
  }
});
