# @sdkwork/cloudrouter-pc-community

Cloud Router PC portal workspace for the sdkwork-community domain.

- `/community` — circle discovery, "my circles", recommendations, search.
- `/community/new` — create a circle.
- `/community/:circleId` — circle feed, resources, members, groups, about, and
  the free/paid join flow.
- `/community/:circleId/manage` — owner workspace: profile, members, groups,
  membership tiers, invite link.
- `/community/:circleId/post/:entryId` — deep-linkable post view.

Data, membership, and group mutations go through the community host service
(`@sdkwork/community-mobile-react-community/host`). The runtime configuration
binds the generated Community App SDK, the standard feeds stream, Drive media
upload, and sdkwork-order membership settlement.
