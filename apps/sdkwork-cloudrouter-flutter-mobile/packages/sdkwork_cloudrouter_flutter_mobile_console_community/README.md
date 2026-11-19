# sdkwork_cloudrouter_flutter_mobile_console_community

Native community (circles and groups) screens for the CloudRouter Flutter shell.

- `CommunityListScreen` — discovery, search, my circles, create.
- `CommunityDetailScreen` — feed, resources, members, groups, custom tabs,
  join (free), post composer, comments, reactions, delete own post.
- `CommunityPostScreen` — create a post (submitted for moderation).
- `CommunityCreateScreen` — create a circle.

Management (profile media, tabs, groups, members, tiers) and paid membership
continue in the shared H5 workspace, opened from the native app bar. This keeps
one complete implementation for those flows while the read/post journeys are
native and testable offline.

The repository is built on the generated community Flutter SDK, exposed through
`sdkwork_cloudrouter_flutter_mobile_core`; feature code never imports the
generated transport package directly.
