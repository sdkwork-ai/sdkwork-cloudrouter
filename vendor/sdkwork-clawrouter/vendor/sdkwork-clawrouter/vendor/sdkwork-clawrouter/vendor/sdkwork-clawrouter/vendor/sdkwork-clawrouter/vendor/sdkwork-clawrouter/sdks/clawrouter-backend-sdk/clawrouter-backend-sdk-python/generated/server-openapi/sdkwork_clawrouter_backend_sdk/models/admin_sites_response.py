from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_site_item import AdminSiteItem


@dataclass
class AdminSitesResponse:
    """Admin sites response schema exposed by Claw Router."""
    items: List[AdminSiteItem]
