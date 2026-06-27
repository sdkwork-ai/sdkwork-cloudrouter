from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminModelCatalogSyncRequest:
    """Admin model catalog sync request schema exposed by Claw Router."""
    catalog_root: Optional[str] = None
    catalog_version: Optional[str] = None
    force: Optional[bool] = None
    mode: Optional[str] = None
    source: Optional[str] = None
    vendor_codes: Optional[List[str]] = None
