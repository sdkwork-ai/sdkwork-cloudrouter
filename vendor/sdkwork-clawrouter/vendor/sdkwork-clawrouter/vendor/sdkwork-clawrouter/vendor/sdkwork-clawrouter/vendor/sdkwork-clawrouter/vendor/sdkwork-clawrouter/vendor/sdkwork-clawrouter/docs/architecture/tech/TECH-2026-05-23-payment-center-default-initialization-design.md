> Migrated from `docs/superpowers/specs/2026-05-23-payment-center-default-initialization-design.md` on 2026-06-24.
> Owner: SDKWork maintainers

## Goal

Install a complete payment-center configuration baseline for a new Claw Router deployment. The baseline must expose every standard payment method, provider, provider account placeholder, payment channel, and routing rule needed by the admin payment center, while keeping every runtime payment path disabled until an administrator explicitly edits credentials and enables the records.

## Scope

This work is limited to appbase commerce payment configuration initialization:

- payment methods
- payment providers
- provider account placeholders
- payment channels
- route rules
- installer repair checks for missing seed data

It does not change payment callback security, real gateway integrations, wallet ledgers, membership package behavior, or frontend layouts.

## Architecture

The canonical appbase commerce storage migration owns the missing payment configuration tables. The commerce bootstrap package owns the standard payment seed catalog. The membership SQLx seed installer writes the catalog during install and startup repair because that path already imports the reusable commerce experience seed.

All seed rows use tenant `0` and organization `0` so the admin payment center has a global baseline. Seed rows are inserted with status `inactive`. Runtime recharge and checkout code continues to require `active` rows, so a fresh install cannot accidentally process real payment attempts.

## Standard Catalog

Payment methods:

- `wechat_pay`
- `alipay`
- `paypal`
- `card`
- `apple_pay`
- `google_pay`
- `wallet_balance`

Payment providers:

- `wechat_pay`
- `alipay`
- `paypal`
- `stripe`
- `apple_pay`
- `google_pay`

Provider account placeholders:

- one inactive sandbox placeholder per provider
- deterministic ids and account numbers
- placeholder `merchant_id` and `secret_ref` values so admin forms can render and be edited
- seed repair must not overwrite existing merchant ids, secret refs, webhook refs, certificate refs, environment, country, currency, rotated timestamp, or active status

Payment channels:

- one inactive channel for each provider-backed method and checkout scene combination
- scenes: `checkout`, `membership_purchase`, `points_recharge`, `wallet_recharge`, `subscription`, `invoice`
- `card` channels route through the Stripe provider account
- `wallet_balance` stays as a method only because it is an internal balance instrument, not an external payment channel

Route rules:

- one inactive route rule for each seeded channel
- rules point to channels by id and use the channel scene/country/currency as match fields
- fallback behavior is not introduced in this task because the current appbase table contract does not model fallback channel fields

## Data Safety

Fresh seed rows are inactive. Existing edited rows keep their operator-owned fields. Seed repair may refresh catalog-owned fields such as display names, supported method lists, supported countries, supported currencies, channel priorities, and timestamps. Seed repair must not force active records back to inactive.

## Verification

Tests must prove:

- the bootstrap catalog contains the full standard provider/method/channel/rule set
- the appbase migration declares every payment configuration table and query index
- the installer writes inactive defaults on fresh install
- deleting a payment-center seed row makes installer status require repair
- running repair restores missing seed rows
- edited provider account credentials and active statuses are preserved

