# SDKWork Forum Seed

`forum-seed.json` is the install-time forum content bundle for SDKWork Claw Router.
It initializes professional tutorial discussions in the Java-compatible forum tables:

- `plus_feeds`
- `plus_comments`
- `plus_content_vote`
- `plus_favorite`

The Rust database installer is the only database writer for this bundle. Keep row ids and UUIDs
stable so first install, repair, and checksum-based refresh remain idempotent across SQLite and
PostgreSQL.
