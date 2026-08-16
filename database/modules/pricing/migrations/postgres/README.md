# migrations/postgres

Versioned reusable-pricing migrations. The initial installation is owned by
`ddl/baseline/postgres/0001_pricing_baseline.sql`; future changes use paired
`{version}_{name}.up.sql` and `{version}_{name}.down.sql` files.
