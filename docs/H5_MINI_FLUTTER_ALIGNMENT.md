# H5 → Mini Program / Flutter Alignment Plan

Status: in progress (goal-driven; shipped per phase, not a one-shot rewrite).

Source of truth: `apps/sdkwork-cloudrouter-h5` (H5 renderer) and
`apps/sdkwork-cloudrouter-pc` for portal-level identity.

## 1. H5 target surface (what "aligned" means)

### Shell

- Title-only mobile navbar: centered active page title, no brand logo/name,
  no login/logout, no theme switch.
- Five bottom tabs, left to right:
  1. 首页 (`/dashboard`)
  2. 体验中心 (`/playground`)
  3. 模型与定价 (`/catalog`)
  4. 消息 (`/messages`)
  5. 我的 (`/me`)
- Usage (`/usage`) and API Key (`/api-keys`) are mounted routes reachable from
  Home primary actions, not tabs.
- Light/dark theme follows `cloud-router-theme`; primary accent `#2563eb`.

### Pages

| Page | H5 source | Key behavior |
| --- | --- | --- |
| 首页 | `ConsoleHomeScreen` | public, AI cloud hero, search, 4 primary actions, 10-service grid, announcement, promo, experience center, stats, More sheet |
| 体验中心 | `@sdkwork/agents-h5-playground` + `@sdkwork/agents-h5-conversation` | Agents chat, sessions, streaming; CloudRouter theme |
| 模型与定价 | `ConsoleCatalogScreen` | catalog/pricing |
| 消息 | `@sdkwork/cloudrouter-h5-messages` (IM SDK) | conversation inbox, search, unread, chat detail, send, read cursor |
| 我的 | `ConsoleProfileScreen` | identity/balance card (placeholder wallet), operation records, help, settings, other, privacy |
| 设置 | `@sdkwork/settings-mobile-react` | shared settings center: appearance/theme, voice, notifications, about; uses appbase defaults |
| 用量 / API Key | console packages | protected, reachable from Home |
| Membership / Recharge | shared commerce prototypes | home entry points |
| Auth | shared `@sdkwork/iam-h5-auth` | IAM login/back |

## 2. Mini-program current state (audit)

Files: `apps/sdkwork-cloudrouter-mini-program`.

- `src/app.json` declares four pages:
  `pages/dashboard`, `pages/usage`, `pages/api-keys`, `pages/catalog`.
- Tab bar is the old four-tab console order; label text is currently mojibake.
- Native dark navigation bar (`#0f172a`), not the H5 title-only light bar.
- No `首页` cloud-platform home; dashboard is a metrics overview.
- No `体验中心` / Agents conversation page.
- No `消息` / IM inbox or chat detail.
- No `我的` / profile or settings page.
- No shared appbase settings center mounted; voice settings not reachable.
- Console capability packages (`sdkwork-cloudrouter-mp-*`) exist for the four
  old tabs; shell derives `CLOUDROUTER_CONSOLE_TABS`.

## 3. Flutter current state (audit)

Files: `apps/sdkwork-cloudrouter-flutter-mobile`.

- `ConsoleShell` composes four screens:
  dashboard, usage, API keys, catalog (`consoleTabs` in the shell package).
- App bar shows the app title plus the active tab title (two lines), not the
  H5 title-only centered bar.
- No `首页` cloud-platform home; dashboard is a metrics overview.
- No `体验中心` / Agents conversation screen.
- No `消息` / IM inbox or chat detail.
- No `我的` / profile or settings screen; shared
  `sdkwork_settings_flutter` is available but not mounted.
- No voice settings entry.
- Theme is shared `buildSdkworkCloudRouterTheme()`; dark/light alignment needs
  checking against H5 tokens.

## 4. Shared building blocks (reuse, do not duplicate)

- Navigation authority: `CLOUDROUTER_CONSOLE_TABS` (console capabilities);
  H5 adds host-level `体验中心`, `消息`, `我的` and filters `usage`/`apiKeys`.
- Settings: `@sdkwork/settings-core` + platform centers
  (`settings-mobile-react`, `settings-pc-react`,
  `settings-mini-program`, `sdkwork_settings_flutter`). Voice is now in the
  shared default catalog (`voice.enabled`, `voice.speaker`, `voice.rate`).
- Agents: H5 `agents-h5-conversation`; mini `agents-mp-conversation`; Flutter
  `agents_flutter_mobile_conversation`.
- IM: H5 uses `@sdkwork/im-sdk`; mini `im-mp-chat`; Flutter
  `im_flutter_mobile_chat`.
- Auth: IAM per-platform packages; do not create local credential forms.
- SDK clients/token managers are constructed in the app composition roots and
  injected into capability packages.

## 5. Phases and acceptance criteria

### Phase 0 — Shared contracts and audit (this document)

- [x] Inventory H5, mini, Flutter.
- [x] Confirm shared settings/voice availability.
- [x] Record gap matrix.
- Acceptance: this document committed in `docs/`.

### Phase 1 — Shell/navigation alignment

Mini:

- Fix `app.json` labels (UTF-8), title-only custom or light nav bar.
- Introduce five tab descriptors matching H5 order; keep `/usage` and
  `/api-keys` as non-tab routes.
- Add tab pages: 首页, 体验中心, 模型与定价, 消息, 我的 (real pages, no stubs).
- Acceptance: WeChat devtools opens; tab order matches; Node contract tests
  assert the tab descriptors; `pnpm typecheck`/`build:mini-program` pass.

Flutter:

- Replace the four-tab shell descriptor with the five H5 tabs; remove the
  double app-bar title (centered active title only).
- Add real screens for 首页, 体验中心, 消息, 我的; keep usage/API key as
  stacked routes.
- Acceptance: `flutter analyze`/`flutter test` (toolchain pending) and the
  Flutter surface contract test; visual check against H5 screenshots.

### Phase 2 — 首页 parity

- Public AI-cloud home: hero, search, four primary actions (会员中心/快速充值/
  API 密钥/用量账单), ten-service grid, announcement, promo, experience center,
  stats, More sheet.
- Mini/Flutter render with platform-native widgets; navigation targets match H5.
- Acceptance: every Home entry leads to the same logical destination/action;
  theme tokens match H5 (`#2563eb`, slate/neutral surfaces); screenshots.

### Phase 3 — Settings/profile parity

- 我的: identity, balance/coupon/invoice placeholders, operation records, help,
  settings, other, privacy; guest state.
- 设置: shared platform settings center; appearance/voice/notifications/about;
  voice switch; theme persistence.
- Acceptance: voice setting visible and persisted; theme switch applies;
  settings entry returns to 我的; shared settings packages used (no local copy).

### Phase 4 — 消息 (IM) parity

- Conversation inbox: list, search, pinned/muted, unread, refresh; chat detail:
  history, send text, mark read.
- Reuse `im-mp-chat` / `im_flutter_mobile_chat`; inject the platform SDK client
  and token manager; no raw HTTP.
- Acceptance: inbox request hits the IM API; chat opens by conversation id;
  send/read work against backend; empty/error/loading states match H5.

### Phase 5 — 体验中心 (Agents) parity

- Agents conversation screen, sessions, streaming, retry/error states.
- Reuse `agents-mp-conversation` / `agents_flutter_mobile_conversation`; inject
  the platform Agents SDK client; CloudRouter theme.
- Acceptance: conversation screen renders; sessions/turns use the Agents SDK;
  same default assistant behavior as H5.

### Phase 6 — Auth/commerce/theme regression

- IAM sign-in used by protected tabs/routes; back affordance from other pages.
- Membership/recharge/orders entries from Home.
- Light/dark theme parity; title-only nav; no brand/theme/login in navbar.
- Acceptance matrix below is green.

## 6. Regression matrix

| Surface | Typecheck/build | Tests | Visual |
| --- | --- | --- | --- |
| H5 | `pnpm typecheck`, `pnpm build:dev` | `pnpm test` (79) | Playwright screenshots |
| Mini | `pnpm typecheck`, `pnpm build:mini-program` | `node --test tests/*.test.mjs` | WeChat devtools |
| Flutter | `flutter analyze` (toolchain pending) | `flutter test` (toolchain pending), Node Flutter surface test | Flutter run/screenshots |

Known constraints:

- The Flutter/Dart toolchain is not installed in this workspace. Flutter
  changes cannot be fully verified until it is available; Node contract tests
  remain mandatory.
- The mini-program runtime pages are generated/handwritten WXML/JS; the shared
  TS packages are consumed through the runtime bundle and page controllers.
- Static H5 preview has no backend; Settings/theme can be verified without one;
  IM/Agents/payment need the corresponding backend.

## 7. Non-goals

- Do not redefine settings in mini/Flutter; consume appbase centers.
- Do not copy H5 React screens into mini/Flutter; compose platform-native
  packages with the same information architecture and behavior.
- Do not add cloudrouter-specific settings definitions; extend the shared
  appbase catalog when a setting is missing.

## 8. Progress log

- 2026-11-13: Phase 0 audit completed.
- Mini: fixed `app.json` UTF-8 tab labels (首页/用量/API Key/模型与定价);
  typecheck + 12 contract tests + runtime build pass.
- Flutter: title-only centered app bar; added the fifth Profile tab with
  `ConsoleProfileScreen`; profile opens the shared Flutter settings center
  (appearance/voice/notifications/about) with voice settings; shared Flutter
  settings list now has a back affordance; `flutter test` 24/24, analyze has no
  errors (20 pre-existing infos), Node contract 9/9.
- Mini: added the fifth 我的 tab (`pages/profile`) and `pages/settings`; both
  consume the shared appbase settings binding bootstrapped into
  `globalData.settingsBinding`; the shared settings-mini-program projection now
  carries slider constraints and renders the voice rate slider. Mini typecheck
  passes, 15/15 contract tests pass, and `pnpm build:mini-program` emits 6 pages;
  appbase settings-mini-program 5/5 tests pass.
- Home parity started on both mobile roots: Flutter `ConsoleHomeScreen` and the
  mini `pages/dashboard` now render the H5 structure (hero/search, four primary
  actions, ten-service grid, announcement, promotion, experience center, stats).
  Flutter `flutter test` 25/25; mini 16/16 and build passes. Unsupported service
  destinations still show an alignment notice (membership/recharge/playground).
- Flutter IAM sign-in implemented through the generated IAM app SDK
  (`sdkwork_iam_app_sdk`) instead of the previous `UnsupportedError` transport
  gap; tokens are written back to the CloudRouter app SDK client so console
  ports use the signed-in identity. `flutter analyze` has no errors and
  `flutter test` 25/25.
- Flutter 消息 landed: a real IM inbox + conversation screen
  (`sdkwork_cloudrouter_flutter_mobile_console_messages`) consumes the generated
  IM app SDK through the signed-in session; API Key is no longer a tab and opens
  as a stacked route from 首页. Tab sequence is now
  首页 / 用量 / 消息 / 模型与定价 / 我的. `flutter test` 26/26; Node contract 9/9.
  Real-time push and read-cursor parity are still pending.
- Flutter 体验中心 landed: the tab mounts the shared Agents Flutter conversation
  capability and a signed-in generated Agents SDK client; the shell sequence is
  now the H5 order **首页 / 体验中心 / 模型与定价 / 消息 / 我的**. Usage and API
  Key are stacked routes from 首页. `flutter test` 27/27; `flutter analyze` has
  no errors; Node contract 9/9.
- Mini-program shell sequence now also matches H5:
  **首页 / 体验中心 / 模型与定价 / 消息 / 我的**. Usage and API Key are retained
  as non-tab pages. WeChat web-view fills the whole page and overlays the native
  tab bar, so a web-view cannot be the content of a tabBar page; 体验中心/消息
  are native tab entry pages that auto-open the non-tab
  `pages/h5/index?route=...` bridge on first show (with a manual button as
  fallback). The H5 surface renders its own five-tab shell, so the user still
  gets the full H5 playground/messages experience; the native tab bar is restored
  on back. Native mini IM/Agents remains the next step for inline tab content.
  Mini typecheck passes, 18/18 tests pass, build emits 9 pages.
- Flutter settings catalog is now localized through a CloudRouter projection of
  the shared appbase defaults (section/setting titles, descriptions, and option
  labels are Chinese); the shared Flutter catalog gained `copyWith` so apps can
  localize without duplicating setting IDs/defaults/validators. `flutter test`
  27/27; appbase settings Flutter tests 6/6.
- Mini native console pages (usage, API keys, catalog) moved to the H5 light
  theme (white surfaces, slate text, tech-blue actions); the dark shell colors
  are gone. Mini typecheck passes, 18/18 tests pass, build emits 8 pages.
- Flutter IM now advances the read cursor after loading a conversation
  (best-effort; a failed PATCH is logged and never hides the transcript). Real
  time push still requires the IM websocket/realtime service.
- Flutter theme moved from deep navy to the H5 light tech-blue system:
  `#f5f7fb` canvas, white app bar/navigation/cards, `#2563eb` primary,
  `#64748b` muted text, `#e2e8f0` outline, `#dbeafe` nav indicator. A theme test
  asserts the palette; `flutter test` 28/28.
- Home commerce entries now open the shared H5 commerce routes instead of a
  placeholder: Flutter uses an in-app `webview_flutter` bridge for
  `/#/membership`, `/#/recharge`, `/#/orders`; the mini program uses one generic
  `pages/h5/index?route=...` bridge for the same routes. The H5 surface owns the
  commerce implementation and its IAM session.
- Flutter appearance setting is live: `appearance.theme` maps to
  `ThemeMode.system/light/dark`, the app now has both H5 light and dark themes,
  and the profile settings listener updates the app immediately. The choice is
  persisted to `shared_preferences` (`cloud-router-theme`) and restored before
  `runApp`. `flutter test` 29/29.
- H5 bridge origins are now materialized correctly: both non-vite surfaces bind
  `SDKWORK_CLOUDROUTER_ROUTER_WEB_PUBLIC_HTTP_URL` from the web ingress
  (`VITE_...APPLICATION_PUBLIC_HTTP_URL`, 4734 in standalone dev) instead of
  reusing the API gateway origin. Mini runtime pages read `webPublicHttpUrl`;
  Flutter `resolveCloudRouterWebPublicHttpUrl()` feeds the web-view bridge.
- Flutter settings now persist through the shared
  `SdkworkSharedPreferencesSettingsStore` (one JSON document per
  app/scope/tenant/user namespace), so voice, notifications, and appearance
  survive relaunches; theme is also restored before `runApp`.
- Added the cross-platform alignment contract
  `tests/h5-mini-flutter-alignment.test.mjs`: both mobile roots must keep the
  five-tab order, the light tech-blue palette, the voice settings on all roots,
  and the materialized web ingress. `node --test` 4/4.
- Flutter profile exposes host-owned sign-out (confirmation dialog, clears the
  app SDK tokens, auth gate rebuilds the sign-in tree), matching the H5 profile
  session action. `flutter test` 30/30.
- Flutter sign-in now uses the shared IAM Flutter auth screen
  (`sdkwork_iam_flutter_mobile_auth`) and its ARB copy, with a CloudRouter IAM
  data source backed by the generated IAM app SDK. The custom host form remains
  only as an asset-loading fallback.
- Mini native pages now follow `appearance.theme`: the root adds `theme-dark`,
  shared overrides cover home/profile/console/settings/bridge surfaces, and
  navigation/tab chrome is reapplied per page. The profile exposes a
  登录 / 注册 entry that opens the H5 IAM sign-in page.
- Flutter gained a home golden baseline (`test/visual_home_test.dart`) and the
  first visual review caught/fixed a Hero header overflow at 390px. `flutter
  test` 31/31; mini 19/19.
- Remaining in Phase 1: native mini inline IM/Agents (the user accepted the H5
  full-screen bridge), and finish visual parity review with goldens/screenshots
  for profile, settings, messages, and playground.

