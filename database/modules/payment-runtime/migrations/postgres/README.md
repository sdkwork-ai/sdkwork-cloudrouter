# payment-runtime module migrations

Expand-contract PostgreSQL migrations for the Cloud Router payment runtime
tables. The baseline creates the full runtime shape; add migrations here only
for post-baseline changes, numbered from `0001`, each with a matching `.down.sql`.
