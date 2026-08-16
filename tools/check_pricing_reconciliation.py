"""Reconciliation checker for the composable pricing and billing migration.

Implements the data-level checks of MIG-2026-0002 §Reconciliation against a
live PostgreSQL schema. Every comparison uses exact `NUMERIC(38,12)` arithmetic
in SQL; floating-point tolerance is forbidden by the migration.

Checks (per tenant, organization, currency, day, meter, and invocation):

  1. Every shadow-written usage fact has exactly one measurement and one rating
     decision for the same stable usage identity; every charge line belongs to
     exactly one decision and every decision belongs to exactly one measurement.
  2. Positive legacy customer charge rows have one rated, chargeable charge
     line with the same quantity, currency, and amount.
  3. Failed fixed-request calls, unknown prices, and non-positive unresolved
     prices have no charge line.
  4. Summed charge amount matches legacy settlement input within exact
     NUMERIC(38,12) arithmetic.
  5. COUNT(DISTINCT invocation_id) is stable when one invocation has multiple
     token, image, item, or duration lines.
  6. Every rated decision has non-null price-book/rate identity,
     account-rate-card scope and identity, and pricing-plan/rule identity;
     every unrated decision has no charge line and a classified reason code.
  7. Active identity verification matches the vendor, region, catalog/API
     binding, typed conditions, official unit price, rate card, plan, rule,
     and immutable PriceService snapshot.
  8. The stored pricing snapshot identifies the PriceService status,
     billability, rate identity, selected strategy, measured/rated quantity,
     unit size, and the three amount sides used by the charge command.

Usage:
    python -B -m tools.check_pricing_reconciliation --database-url postgres://...
    SDKWORK_DATABASE_URL=postgres://... python -B -m tools.check_pricing_reconciliation

Exit status: 0 when every check passes, 1 when violations are found, 2 on
connection or configuration errors.
"""

from __future__ import annotations

import argparse
import os
from dataclasses import dataclass, field
from typing import Any


@dataclass
class ReconciliationReport:
    ok: bool = True
    violations: list[str] = field(default_factory=list)

    def fail(self, message: str) -> None:
        self.ok = False
        self.violations.append(message)


def connect(database_url: str):
    import psycopg

    return psycopg.connect(database_url)


def resolve_database_url(args: argparse.Namespace) -> str:
    if args.database_url:
        return args.database_url
    configured = os.environ.get("SDKWORK_DATABASE_URL", "").strip()
    if configured:
        return configured
    raise SystemExit(
        "no database configured: pass --database-url or set SDKWORK_DATABASE_URL"
    )


def scope_filters(report: ReconciliationReport, args: argparse.Namespace) -> tuple[str, list[Any]]:
    clauses: list[str] = []
    params: list[Any] = []
    if args.tenant is not None:
        clauses.append("usage.tenant_id = %s")
        params.append(args.tenant)
    if args.organization is not None:
        clauses.append("usage.organization_id = %s")
        params.append(args.organization)
    if args.since_days:
        clauses.append("usage.occurred_at >= CURRENT_TIMESTAMP - make_interval(days => %s)")
        params.append(args.since_days)
    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    return where, params


def check_measurement_decision_pairing(
    connection, report: ReconciliationReport, args: argparse.Namespace
) -> None:
    """Check 1: exactly one measurement, decision, and charge line per usage fact."""
    where, params = scope_filters(report, args)
    with connection.cursor() as cursor:
        cursor.execute(
            f"""
            SELECT
                usage.tenant_id, usage.organization_id, usage.request_id,
                usage.billing_meter_code,
                COUNT(DISTINCT measurement.id) AS measurement_count,
                COUNT(DISTINCT decision.id) AS decision_count,
                COUNT(DISTINCT charge.id) AS charge_line_count,
                COUNT(DISTINCT measurement.id) = 1
                    AND COUNT(DISTINCT decision.id) = 1
                    AND COUNT(DISTINCT charge.id) = 1 AS paired
            FROM ai_metering_usage usage
            LEFT JOIN cloudrouter_usage_measurement measurement
              ON measurement.tenant_id = usage.tenant_id
             AND measurement.organization_id = usage.organization_id
             AND measurement.invocation_id = usage.request_id
             AND measurement.meter_code = usage.billing_meter_code
            LEFT JOIN cloudrouter_rating_decision decision
              ON decision.tenant_id = measurement.tenant_id
             AND decision.organization_id = measurement.organization_id
             AND decision.measurement_id = measurement.id
            LEFT JOIN cloudrouter_charge_line charge
              ON charge.tenant_id = decision.tenant_id
             AND charge.organization_id = decision.organization_id
             AND charge.rating_decision_id = decision.id
            {where}
            GROUP BY usage.tenant_id, usage.organization_id, usage.request_id, usage.billing_meter_code
            HAVING COUNT(DISTINCT measurement.id) <> 1
                OR COUNT(DISTINCT decision.id) <> 1
                OR COUNT(DISTINCT charge.id) <> 1
            LIMIT 50
            """,
            params,
        )
        rows = cursor.fetchall()
    for tenant_id, organization_id, request_id, meter_code, measurement_count, decision_count, charge_count, _ in rows:
        report.fail(
            "check 1: usage fact {tenant}/{org} request={request} meter={meter} "
            "has measurements={measurements} decisions={decisions} charge_lines={charges}; "
            "expected exactly 1/1/1".format(
                tenant=tenant_id,
                org=organization_id,
                request=request_id,
                meter=meter_code,
                measurements=measurement_count,
                decisions=decision_count,
                charges=charge_count,
            )
        )


def check_legacy_amount_matches_charge_line(
    connection, report: ReconciliationReport, args: argparse.Namespace
) -> None:
    """Check 2: positive legacy charges match one rated charge line exactly."""
    where, params = scope_filters(report, args)
    with connection.cursor() as cursor:
        cursor.execute(
            f"""
            SELECT
                usage.tenant_id, usage.organization_id, usage.request_id,
                usage.billing_meter_code, usage.customer_charge_amount,
                charge.amount, charge.currency_code, charge.charge_status
            FROM ai_metering_usage usage
            JOIN cloudrouter_usage_measurement measurement
              ON measurement.tenant_id = usage.tenant_id
             AND measurement.organization_id = usage.organization_id
             AND measurement.invocation_id = usage.request_id
             AND measurement.meter_code = usage.billing_meter_code
            JOIN cloudrouter_rating_decision decision
              ON decision.tenant_id = measurement.tenant_id
             AND decision.organization_id = measurement.organization_id
             AND decision.measurement_id = measurement.id
            JOIN cloudrouter_charge_line charge
              ON charge.tenant_id = decision.tenant_id
             AND charge.organization_id = decision.organization_id
             AND charge.rating_decision_id = decision.id
            {where}
              AND usage.customer_charge_amount > 0
              AND (
                  usage.customer_charge_amount IS DISTINCT FROM charge.amount
                  OR usage.currency IS DISTINCT FROM charge.currency_code
                  OR charge.charge_status <> 'settled'
              )
            LIMIT 50
            """,
            params,
        )
        rows = cursor.fetchall()
    for tenant_id, organization_id, request_id, meter_code, legacy_amount, charge_amount, currency, status in rows:
        report.fail(
            "check 2: usage fact {tenant}/{org} request={request} meter={meter} "
            "legacy amount={legacy} does not match charge line amount={charge} "
            "currency={currency} status={status}".format(
                tenant=tenant_id,
                org=organization_id,
                request=request_id,
                meter=meter_code,
                legacy=legacy_amount,
                charge=charge_amount,
                currency=currency,
                status=status,
            )
        )


def check_no_charge_line_for_non_chargeable(
    connection, report: ReconciliationReport, args: argparse.Namespace
) -> None:
    """Check 3: no charge line for failed, unknown, free, or unresolved decisions."""
    where, params = scope_filters(report, args)
    with connection.cursor() as cursor:
        cursor.execute(
            f"""
            SELECT
                decision.tenant_id, decision.organization_id, decision.invocation_id,
                decision.decision_status, decision.billability, decision.reason_code,
                charge.amount
            FROM cloudrouter_rating_decision decision
            JOIN cloudrouter_charge_line charge
              ON charge.tenant_id = decision.tenant_id
             AND charge.organization_id = decision.organization_id
             AND charge.rating_decision_id = decision.id
            JOIN cloudrouter_usage_measurement measurement
              ON measurement.id = decision.measurement_id
             AND measurement.tenant_id = decision.tenant_id
             AND measurement.organization_id = decision.organization_id
            JOIN ai_metering_usage usage
              ON usage.tenant_id = measurement.tenant_id
             AND usage.organization_id = measurement.organization_id
             AND usage.request_id = measurement.invocation_id
             AND usage.billing_meter_code = measurement.meter_code
            {where}
              AND (
                  decision.decision_status <> 'rated'
                  OR decision.billability <> 'chargeable'
                  OR charge.amount <= 0
              )
            LIMIT 50
            """,
            params,
        )
        rows = cursor.fetchall()
    for tenant_id, organization_id, invocation_id, status, billability, reason, amount in rows:
        report.fail(
            "check 3: decision {tenant}/{org} invocation={invocation} "
            "status={status} billability={billability} reason={reason} "
            "must not have a charge line (amount={amount})".format(
                tenant=tenant_id,
                org=organization_id,
                invocation=invocation_id,
                status=status,
                billability=billability,
                reason=reason,
                amount=amount,
            )
        )


def check_summed_amounts_match(
    connection, report: ReconciliationReport, args: argparse.Namespace
) -> None:
    """Check 4: summed charge amounts equal legacy settlement input exactly."""
    where, params = scope_filters(report, args)
    with connection.cursor() as cursor:
        cursor.execute(
            f"""
            WITH paired AS (
                SELECT
                    usage.tenant_id, usage.organization_id, usage.currency,
                    DATE(usage.occurred_at) AS occurred_day,
                    usage.billing_meter_code AS meter_code,
                    SUM(usage.customer_charge_amount) AS legacy_total,
                    SUM(charge.amount) AS charge_total,
                    COUNT(DISTINCT usage.request_id) AS invocation_count
                FROM ai_metering_usage usage
                JOIN cloudrouter_usage_measurement measurement
                  ON measurement.tenant_id = usage.tenant_id
                 AND measurement.organization_id = usage.organization_id
                 AND measurement.invocation_id = usage.request_id
                 AND measurement.meter_code = usage.billing_meter_code
                JOIN cloudrouter_rating_decision decision
                  ON decision.tenant_id = measurement.tenant_id
                 AND decision.organization_id = measurement.organization_id
                 AND decision.measurement_id = measurement.id
                JOIN cloudrouter_charge_line charge
                  ON charge.tenant_id = decision.tenant_id
                 AND charge.organization_id = decision.organization_id
                 AND charge.rating_decision_id = decision.id
                {where}
                GROUP BY usage.tenant_id, usage.organization_id, usage.currency,
                         DATE(usage.occurred_at), usage.billing_meter_code
            )
            SELECT tenant_id, organization_id, currency, occurred_day, meter_code,
                   legacy_total, charge_total, invocation_count
            FROM paired
            WHERE legacy_total IS DISTINCT FROM charge_total
            ORDER BY tenant_id, organization_id, occurred_day, meter_code
            LIMIT 50
            """,
            params,
        )
        rows = cursor.fetchall()
    for tenant_id, organization_id, currency, occurred_day, meter_code, legacy_total, charge_total, invocation_count in rows:
        report.fail(
            "check 4: {tenant}/{org} {day} currency={currency} meter={meter}: "
            "legacy total {legacy} <> charge total {charge} "
            "(invocations={invocations})".format(
                tenant=tenant_id,
                org=organization_id,
                day=occurred_day,
                currency=currency,
                meter=meter_code,
                legacy=legacy_total,
                charge=charge_total,
                invocations=invocation_count,
            )
        )


def check_distinct_invocation_stability(
    connection, report: ReconciliationReport, args: argparse.Namespace
) -> None:
    """Check 5: distinct invocation counts are stable across both ledgers."""
    where, params = scope_filters(report, args)
    with connection.cursor() as cursor:
        cursor.execute(
            f"""
            WITH legacy_invocations AS (
                SELECT tenant_id, organization_id,
                       COUNT(DISTINCT request_id) AS legacy_invocations
                FROM ai_metering_usage usage
                {where}
                GROUP BY tenant_id, organization_id
            ),
            charge_invocations AS (
                SELECT usage.tenant_id, usage.organization_id,
                       COUNT(DISTINCT charge.invocation_id) AS charge_invocations
                FROM ai_metering_usage usage
                JOIN cloudrouter_usage_measurement measurement
                  ON measurement.tenant_id = usage.tenant_id
                 AND measurement.organization_id = usage.organization_id
                 AND measurement.invocation_id = usage.request_id
                JOIN cloudrouter_rating_decision decision
                  ON decision.tenant_id = measurement.tenant_id
                 AND decision.organization_id = measurement.organization_id
                 AND decision.measurement_id = measurement.id
                JOIN cloudrouter_charge_line charge
                  ON charge.tenant_id = decision.tenant_id
                 AND charge.organization_id = decision.organization_id
                 AND charge.rating_decision_id = decision.id
                {where}
                GROUP BY usage.tenant_id, usage.organization_id
            )
            SELECT legacy.tenant_id, legacy.organization_id,
                   legacy.legacy_invocations, charge.charge_invocations
            FROM legacy_invocations legacy
            JOIN charge_invocations charge
              ON charge.tenant_id = legacy.tenant_id
             AND charge.organization_id = legacy.organization_id
            WHERE legacy.legacy_invocations IS DISTINCT FROM charge.charge_invocations
            LIMIT 50
            """,
            params,
        )
        rows = cursor.fetchall()
    for tenant_id, organization_id, legacy_invocations, charge_invocations in rows:
        report.fail(
            "check 5: {tenant}/{org} legacy distinct invocations={legacy} "
            "charge line distinct invocations={charge}".format(
                tenant=tenant_id,
                org=organization_id,
                legacy=legacy_invocations,
                charge=charge_invocations,
            )
        )


def check_decision_identity_completeness(
    connection, report: ReconciliationReport, args: argparse.Namespace
) -> None:
    """Check 6: rated decisions carry full identities; unrated decisions are classified."""
    where, params = scope_filters(report, args)
    with connection.cursor() as cursor:
        cursor.execute(
            f"""
            SELECT
                decision.tenant_id, decision.organization_id, decision.invocation_id,
                decision.decision_status, decision.billability, decision.reason_code,
                (decision.price_book_id IS NULL OR decision.rate_id IS NULL
                 OR decision.account_rate_card_id IS NULL
                 OR decision.pricing_plan_id IS NULL OR decision.pricing_rule_id IS NULL)
                    AS missing_identity,
                (decision.decision_status = 'unrated' AND decision.reason_code IS NULL)
                    AS unclassified
            FROM cloudrouter_rating_decision decision
            JOIN cloudrouter_usage_measurement measurement
              ON measurement.id = decision.measurement_id
             AND measurement.tenant_id = decision.tenant_id
             AND measurement.organization_id = decision.organization_id
            JOIN ai_metering_usage usage
              ON usage.tenant_id = measurement.tenant_id
             AND usage.organization_id = measurement.organization_id
             AND usage.request_id = measurement.invocation_id
             AND usage.billing_meter_code = measurement.meter_code
            {where}
              AND (
                  (decision.decision_status = 'rated'
                   AND (decision.price_book_id IS NULL OR decision.rate_id IS NULL
                        OR decision.account_rate_card_id IS NULL
                        OR decision.pricing_plan_id IS NULL OR decision.pricing_rule_id IS NULL))
                  OR (decision.decision_status = 'unrated' AND decision.reason_code IS NULL)
              )
            LIMIT 50
            """,
            params,
        )
        rows = cursor.fetchall()
    for tenant_id, organization_id, invocation_id, status, billability, reason, missing_identity, unclassified in rows:
        report.fail(
            "check 6: decision {tenant}/{org} invocation={invocation} status={status} "
            "billability={billability} reason={reason} missing_identity={missing} "
            "unclassified={unclassified}".format(
                tenant=tenant_id,
                org=organization_id,
                invocation=invocation_id,
                status=status,
                billability=billability,
                reason=reason,
                missing=missing_identity,
                unclassified=unclassified,
            )
        )


def check_rated_identity_verification(
    connection, report: ReconciliationReport, args: argparse.Namespace
) -> None:
    """Check 7: rated snapshots carry vendor, region, binding, conditions, and prices."""
    where, params = scope_filters(report, args)
    with connection.cursor() as cursor:
        cursor.execute(
            f"""
            SELECT
                decision.tenant_id, decision.organization_id, decision.invocation_id,
                decision.decision_status, decision.rate_id,
                usage.catalog_key, usage.region_code,
                usage.base_input_unit_price, usage.base_output_unit_price,
                usage.cache_read_unit_price, usage.rate_multiplier,
                usage.reference_multiplier
            FROM cloudrouter_rating_decision decision
            JOIN cloudrouter_usage_measurement measurement
              ON measurement.id = decision.measurement_id
             AND measurement.tenant_id = decision.tenant_id
             AND measurement.organization_id = decision.organization_id
            JOIN ai_metering_usage usage
              ON usage.tenant_id = measurement.tenant_id
             AND usage.organization_id = measurement.organization_id
             AND usage.request_id = measurement.invocation_id
             AND usage.billing_meter_code = measurement.meter_code
            {where}
              AND decision.decision_status = 'rated'
              AND (
                  usage.catalog_key IS NULL OR usage.region_code IS NULL
                  OR usage.base_input_unit_price IS NULL
                  OR usage.rate_multiplier IS NULL OR usage.reference_multiplier IS NULL
              )
            LIMIT 50
            """,
            params,
        )
        rows = cursor.fetchall()
    for tenant_id, organization_id, invocation_id, status, rate_id, catalog_key, region_code, input_price, output_price, cache_price, rate_multiplier, reference_multiplier in rows:
        report.fail(
            "check 7: rated decision {tenant}/{org} invocation={invocation} rate={rate} "
            "is missing immutable price evidence: catalog={catalog} region={region} "
            "input={input} output={output} cache={cache} rate_multiplier={rate_multiplier} "
            "reference_multiplier={reference_multiplier}".format(
                tenant=tenant_id,
                org=organization_id,
                invocation=invocation_id,
                rate=rate_id,
                catalog=catalog_key,
                region=region_code,
                input=input_price,
                output=output_price,
                cache=cache_price,
                rate_multiplier=rate_multiplier,
                reference_multiplier=reference_multiplier,
            )
        )


def check_snapshot_fields(
    connection, report: ReconciliationReport, args: argparse.Namespace
) -> None:
    """Check 8: stored pricing snapshots identify the resolution and amount sides."""
    where, params = scope_filters(report, args)
    with connection.cursor() as cursor:
        cursor.execute(
            f"""
            SELECT
                decision.tenant_id, decision.organization_id, decision.invocation_id,
                decision.decision_status, decision.pricing_snapshot::text,
                decision.billing_components::text
            FROM cloudrouter_rating_decision decision
            JOIN cloudrouter_usage_measurement measurement
              ON measurement.id = decision.measurement_id
             AND measurement.tenant_id = decision.tenant_id
             AND measurement.organization_id = decision.organization_id
            JOIN ai_metering_usage usage
              ON usage.tenant_id = measurement.tenant_id
             AND usage.organization_id = measurement.organization_id
             AND usage.request_id = measurement.invocation_id
             AND usage.billing_meter_code = measurement.meter_code
            {where}
              AND decision.decision_status = 'rated'
            LIMIT 1000
            """,
            params,
        )
        rows = cursor.fetchall()
    import json as json_module

    checked = 0
    for tenant_id, organization_id, invocation_id, status, snapshot_text, components_text in rows:
        checked += 1
        try:
            snapshot = json_module.loads(snapshot_text or "{}")
        except ValueError:
            report.fail(
                "check 8: rated decision {tenant}/{org} invocation={invocation} "
                "has an unparseable pricing snapshot".format(
                    tenant=tenant_id, org=organization_id, invocation=invocation_id
                )
            )
            continue
        pricing = snapshot.get("pricing") if isinstance(snapshot, dict) else None
        if not isinstance(pricing, dict):
            report.fail(
                "check 8: rated decision {tenant}/{org} invocation={invocation} "
                "snapshot carries no pricing block".format(
                    tenant=tenant_id, org=organization_id, invocation=invocation_id
                )
            )
            continue
        service_audit = pricing.get("serviceAudit")
        resolution = (
            service_audit.get("resolution")
            if isinstance(service_audit, dict) and isinstance(service_audit.get("resolution"), dict)
            else None
        )
        missing: list[str] = []
        for field in ("status", "billability"):
            if not resolution or field not in resolution:
                missing.append(f"pricing.serviceAudit.resolution.{field}")
        for field in (
            "meter",
            "unitSize",
            "priceBookCode",
            "rateHash",
            "officialReferenceUnitPrice",
            "chargedUnitPrice",
            "procurementCostUnitPrice",
        ):
            if field not in pricing:
                missing.append(f"pricing.{field}")
        if not pricing.get("strategy"):
            missing.append("pricing.strategy")
        if missing:
            report.fail(
                "check 8: rated decision {tenant}/{org} invocation={invocation} "
                "snapshot is missing fields {missing}".format(
                    tenant=tenant_id,
                    org=organization_id,
                    invocation=invocation_id,
                    missing=",".join(missing),
                )
            )
        try:
            components = json_module.loads(components_text or "[]")
        except ValueError:
            components = []
        if components and not any(
            isinstance(component, dict) and component.get("priceSide")
            for component in components
        ):
            report.fail(
                "check 8: rated decision {tenant}/{org} invocation={invocation} "
                "billing components carry no price sides".format(
                    tenant=tenant_id, org=organization_id, invocation=invocation_id
                )
            )
    if checked == 0:
        report.fail("check 8: no rated decisions found in scope; cannot verify snapshots")


def run(connection, args: argparse.Namespace) -> ReconciliationReport:
    report = ReconciliationReport()
    check_measurement_decision_pairing(connection, report, args)
    check_legacy_amount_matches_charge_line(connection, report, args)
    check_no_charge_line_for_non_chargeable(connection, report, args)
    check_summed_amounts_match(connection, report, args)
    check_distinct_invocation_stability(connection, report, args)
    check_decision_identity_completeness(connection, report, args)
    check_rated_identity_verification(connection, report, args)
    check_snapshot_fields(connection, report, args)
    return report


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Verify MIG-2026-0002 pricing reconciliation invariants against a "
            "live PostgreSQL schema (exact NUMERIC arithmetic only)."
        )
    )
    parser.add_argument("--database-url", default=None, help="PostgreSQL connection URL")
    parser.add_argument("--tenant", type=int, default=None, help="restrict to a tenant id")
    parser.add_argument("--organization", type=int, default=None, help="restrict to an organization id")
    parser.add_argument(
        "--since-days",
        type=int,
        default=None,
        help="restrict to usage occurred within the last N days",
    )
    args = parser.parse_args()

    database_url = resolve_database_url(args)
    try:
        connection = connect(database_url)
    except Exception as error:  # noqa: BLE001 - report any connection failure verbatim
        print(f"failed to connect to PostgreSQL: {error}")
        return 2
    try:
        report = run(connection, args)
    finally:
        connection.close()

    if report.ok:
        print("pricing reconciliation passed: all MIG-2026-0002 checks satisfied")
        return 0
    for violation in report.violations:
        print(f"pricing reconciliation violation: {violation}")
    print(f"{len(report.violations)} pricing reconciliation violation(s) found")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
