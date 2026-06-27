from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class InstallationStatusResponse:
    """Installation status response schema exposed by Claw Router."""
    catalog_source: str
    catalog_version: str
    changed: bool
    environment: str
    external_catalog: bool
    last_catalog_refresh_status: str
    schema_version: str
    seed_profile: str
    status: str
