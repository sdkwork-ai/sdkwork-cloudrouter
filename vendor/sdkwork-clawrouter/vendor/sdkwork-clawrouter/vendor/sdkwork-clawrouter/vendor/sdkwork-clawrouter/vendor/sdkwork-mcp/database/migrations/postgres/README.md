# PostgreSQL migrations

Add versioned SQL files using `{version}_{name}.up.sql` and matching `{version}_{name}.down.sql`.

The MCP module currently ships baseline DDL at `ddl/baseline/postgres/0001_mcp_baseline.sql`.
