# @sdkwork/cloudrouter-h5-community

Cloud Router H5 host binding for the sdkwork-community mobile UI.

- `bootstrapCommunityH5()` configures the community App SDK port, the feeds
  open stream port, Drive media upload/preview, circle membership order
  settlement, and the IAM session projection.
- `CommunityRoutes` mounts the complete community route catalog (circles,
  posts, comments, members, groups, QR codes, membership tiers, and the circle
  cashier bridge) under `/community/*`.

The community pages themselves live in
`@sdkwork/community-mobile-react-community`; this package must not duplicate
them.
