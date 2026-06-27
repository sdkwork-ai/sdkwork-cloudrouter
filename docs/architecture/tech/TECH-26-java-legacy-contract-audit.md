> Migrated from `docs/26-java-legacy-contract-audit.md` on 2026-06-24.
> Owner: SDKWork maintainers

`tools.java_legacy_contract_audit` converts Java-owned `plus_*` contracts into a
machine-readable audit artifact without generating DDL for those tables.

## Purpose

- Keep user, account, VIP, coupon, order, payment, refund, invoice, AppCenter,
  SkillsHub, and category tables aligned with `legacy-java-plus-entity`.
- Prove that registered Java entities still map to the expected physical table
  names through `@Table(name = "...")`.
- Extract declared own columns from `@Column` and `@JoinColumn` so downstream
  design reviews can inspect Java-owned schemas without copying or forking them
  into claw-router DDL.
- Fail the quality gate if the generated audit artifact is missing or stale.

## Artifact

```text
generated/schema/legacy/java-legacy-contract-audit.json
```

The artifact currently contains each audited table, Java entity FQN, Java source
path, resolved `@Table` name, and declared entity columns.

## Commands

```bash
python -B -m tools.java_legacy_contract_audit
python -B -m tools.java_legacy_contract_audit --check
python -B -m tools.schema_quality_gate
```

`tools.schema_quality_gate` runs this audit together with Schema Guardian, DDL
freshness, domain type freshness, schema manifest freshness, OpenAPI component
freshness, and frontend field contract checks.

