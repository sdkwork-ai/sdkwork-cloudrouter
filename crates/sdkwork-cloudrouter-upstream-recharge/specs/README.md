# sdkwork-cloudrouter-upstream-recharge

Decoupled relay-recharge capability of Cloud Router. It owns three things and
nothing else:

1. The wire contract a relay exposes through its API-key Open API
   (`/v1/recharge/balance`, `/v1/recharge/options`, `/v1/recharge/orders`).
2. The API-key HTTP client Cloud Router uses to call a relay's recharge
   surface (balance, option catalog, order creation, order status).
3. The base-URL normalization that turns an upstream supplier endpoint
   (`https://api.sdkwork.com/v1`) into the relay recharge origin
   (`https://api.sdkwork.com`).

It has no database access, no credential storage, and no knowledge of the
admin console: callers pass a `RechargeConnection { base_url, api_key }` and
receive typed values or typed errors. The management API resolves the API key
from the supplier account credential and the open API serves the same contract
for relays that are Cloud Router deployments themselves.

Authority: `sdkwork-cloudrouter-upstream-recharge` owns the recharge DTOs; the
Cloud Router Open API (`/v1/recharge/*`) and the admin supplier recharge
endpoints both consume them.
