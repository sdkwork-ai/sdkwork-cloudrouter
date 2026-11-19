# Community (circles and groups) integration

The sdkwork-community domain is integrated into the Cloud Router application
surfaces. This document is the integration map; the domain contract, backend,
and generated SDKs remain owned by `sdkwork-community`.

## Capability matrix

| Capability | PC portal | H5 | Mini program | Flutter |
| --- | --- | --- | --- | --- |
| Discover / search circles, recommended, my circles | native | native | native | native |
| Circle detail: feed, resources, members, groups, about | native | native | native | native |
| Create / edit circle, cover and avatar media | native | native | create native; edit in H5 | create native; edit in H5 |
| Posts, comments, reactions | native | native | native | native |
| Group management and join QR codes | native | native | shared H5 | shared H5 |
| Member roles and moderation | native | native | shared H5 | shared H5 |
| Post moderation queue | CloudRouter PC admin workspace | CloudRouter PC admin workspace | CloudRouter PC admin workspace | CloudRouter PC admin workspace |
| Paid membership tiers and order settlement | native | native | shared H5 | shared H5 |
| Circle cashier | shared portal cashier | native bridge | shared H5 | shared H5 |

"shared H5" means the surface opens the H5 community workspace at `/community`.
That workspace is the canonical complete implementation. The mini program and
Flutter render native discovery/detail/composer screens and open the H5
workspace for management, groups, members, tiers, and paid checkout through a
dedicated bridge page. This is the same pattern the commerce surfaces use for
membership, recharge, and orders.

## Routes

PC portal (`@sdkwork/cloudrouter-pc-community`):

- `/community`
- `/community/new`
- `/community/mine`
- `/community/:circleId`
- `/community/:circleId/manage`
- `/community/:circleId/post/:entryId`

H5 (`@sdkwork/cloudrouter-h5-community` + `@sdkwork/community-mobile-react-community`):

- `/community`, `/community/create`, `/community/mine`
- `/community/:id`, `/community/:id/profile`, and the profile sub-routes for
  groups, members, edits, tabs, QR code
- `/community/:id/post`, `/community/:id/groups/create`,
  `/community/:id/group/:groupId`
- `/community/:id/cashier/:orderId`

The H5 route catalog mirrors the community route catalog used by sdkwork-im H5.

## SDK and runtime boundaries

- H5 core owns the generated clients: Community App SDK, feeds open client,
  Drive app client. The community adapter only configures the community runtime
  ports (`runtime`, `feeds`, `media`, `order`, `auth session`).
- PC core (`@sdkwork/cloudroutes-pc-commons`) owns the generated clients and the
  token boundary. The PC community package consumes the community host service
  (`@sdkwork/community-mobile-react-community/host`) and the core clients.
- No surface constructs raw HTTP clients or manual auth headers.
- Media uploads declare `community.post_media` in each application's
  `specs/upload.declaration.json` (`DRIVE_SPEC.md` section 18).
- Circle membership orders are created through sdkwork-order
  (`memberships.orders.create`); membership activation happens only after the
  order status reports paid.

## Navigation

- PC portal navbar: `nav.community` → `/community`.
- H5 home service grid: "Circles" → `/community`.
- Mini program home service grid: "圈子社群" → `pages/community/index`.
- Flutter home service grid: "圈子社群" → `CommunityH5Screen`.

## Verification

```sh
# H5
pnpm --dir apps/sdkwork-cloudrouter-h5 typecheck
node --test apps/sdkwork-cloudrouter-h5/tests/h5-community-routes.test.mjs
pnpm --dir apps/sdkwork-cloudrouter-h5 build:dev

# PC
pnpm --dir apps/sdkwork-cloudrouter-pc typecheck
node --import tsx --test apps/sdkwork-cloudrouter-pc/community-portal-runtime.test.ts

# Mini program
pnpm --dir apps/sdkwork-cloudrouter-mini-program typecheck
pnpm --dir apps/sdkwork-cloudrouter-mini-program _sdkwork:test
pnpm --dir apps/sdkwork-cloudrouter-mini-program build:mini-program

# Flutter
flutter analyze
flutter test packages/sdkwork_cloudrouter_flutter_mobile_console_community/test
node --test apps/sdkwork-cloudrouter-flutter-mobile/tests/flutter-mobile-surface-contract.test.mjs
```

## Delivery status

Latest verified gates:

- H5: `pnpm typecheck`, `pnpm build:dev`, and the full `pnpm test` suite
  (101/101) pass.
- PC: `pnpm typecheck`, `pnpm build:test`, and the community portal suite
  (6/6) pass. The admin community suite passes 18/18; the wider admin/test
  suites pass 230 checks. The remaining PC full-suite failure is the unrelated
  commerce payment-composition assertion in `sdk-composition-standard.test.mjs`.
- Shared mobile package: 22/22 vitest cases pass, including resource review
  state, media runtime fallbacks, moderation-visible pending entries, and
  payment-sheet login behavior.
- Community route crates: 12 tests pass, including canonical snake_case query
  names and legacy camelCase aliases.
- Paid join: PC accepts every settled sdkwork-order status
  (`paid/succeeded/success/completed/fulfilled/finished`), and a pending order
  is persisted in session storage so closing and reopening the dialog resumes
  the same order instead of creating a duplicate.
- Mini program: `pnpm _sdkwork:check`, 20 contract tests, 4 App API mapping
  tests, and the 14-page runtime build pass.
- Flutter: `flutter analyze` reports no errors, the community widget/media
  tests pass, the full `flutter test` suite passes 36/36, and the surface
  contract passes 9/9.
- Repo gates: i18n, application layering, API response envelopes, upload
  declarations, and community/workspace `verify-repo` checks pass. The
  community subset of the API operation-pattern gate reports zero violations
  after the query-parameter migration.

Known delivery debt outside the circle flow:

- The community OpenAPI families now expose canonical lower_snake_case query
  parameters (`category_id`, `review_state`, `include_disabled`,
  `enabled_only`); the route extractors keep camelCase aliases so already
  deployed clients continue to work during the migration window.
- The community mobile package's vitest suite passes after the community
  workspace gained the missing appbase component-core and IAM desktop-auth
  packages; keep those workspace entries when syncing `pnpm-workspace.yaml`.
- Post moderation is an administrator operation in the CloudRouter PC admin
  community workspace (`/admin/community`); the portal/H5/native surfaces show
  the author's pending state but do not grant platform review authority. The
  admin service suite covers 18 moderation/circle/admin cases.

## Known gaps

- Mini program management, groups, members, tiers, and paid checkout use the
  complete H5 workspace through `pages/community/web/index`; the native pages
  cover discovery, detail, posting, comments, reactions, and circle creation.
  Native images resolve `drive://` references through the generated Drive App
  SDK; the deployment must whitelist the Drive download host as a WeChat
  download domain.
- Flutter management and paid checkout intentionally use the H5 workspace;
  native discovery, detail, posting, comments, reactions, and circle creation
  are implemented in `sdkwork_cloudrouter_flutter_mobile_console_community`.
- PC circle media upload covers cover/avatar and post images; group QR code
  uploads continue to be managed by the existing admin community workspace.
- New posts are submitted for moderation (`pending-review`) and appear to their
  author immediately with a pending badge; other members see them after an
  administrator approves them in the admin community moderation queue.
- The moderation queue and approve/reject actions are owned by the community
  admin workspace (`/backend/v3/api/community/moderation/queue`), not the
  portal. This keeps platform review authority in one place; circle members and
  owners use the portal/H5/native surfaces to author and read content.
