"""Resolve T1 capability repository SQL source paths from commerce T0 tools."""

from __future__ import annotations

from pathlib import Path

COMMERCE_ROOT = Path(__file__).resolve().parents[1]
WORKSPACE_ROOT = COMMERCE_ROOT.parent

REPOSITORIES: dict[str, tuple[str, str]] = {
    "shop": ("sdkwork-shop", "sdkwork-commerce-shop-repository-sqlx"),
    "order": ("sdkwork-order", "sdkwork-commerce-order-repository-sqlx"),
    "payment": ("sdkwork-payment", "sdkwork-commerce-payment-repository-sqlx"),
    "promotion": ("sdkwork-promotion", "sdkwork-commerce-promotion-repository-sqlx"),
}


def repository_src(capability: str, filename: str) -> Path:
    repo, crate = REPOSITORIES[capability]
    return WORKSPACE_ROOT / repo / "crates" / crate / "src" / filename


def sqlite_postgres_pair(capability: str, stem: str) -> tuple[Path, Path]:
    return (
        repository_src(capability, f"sqlite_{stem}.rs"),
        repository_src(capability, f"postgres_{stem}.rs"),
    )
