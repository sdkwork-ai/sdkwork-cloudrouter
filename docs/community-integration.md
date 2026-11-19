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
| Post moderation queue | community admin workspace | community admin workspace | community admin workspace | community admin workspace |
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
  (6/6) pass. The admin/test suites pass 230 checks; one unrelated trade-route
  count assertion remains outside the community surface.
- Mini program: `pnpm _sdkwork:check`, 20 contract tests, 4 App API mapping
  tests, and the 14-page runtime build pass.
- Flutter: `flutter analyze` reports no errors, the community widget/media
  tests pass, the full `flutter test` suite passes 36/36, and the surface
  contract passes 9/9.
- Repo gates: i18n, application layering, API response envelopes, upload
  declarations, and community/workspace `verify-repo` checks pass.

Known delivery debt outside the circle flow:

- The community OpenAPI families still expose pre-existing camelCase query
  parameter names (`categoryId`, `reviewState`, `includeDisabled`), which the
  API operation-pattern gate flags. Correcting them is a versioned public
  contract migration, not a silent rename.
- The community mobile package's vitest suite requires that repository's
  devDependencies to be installed; this workspace currently verifies it through
  the H5 typecheck and runtime build instead.
- Post moderation remains an admin-workspace operation; the portal/native
  surfaces show the author's pending state but do not grant platform review
  authority.

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
