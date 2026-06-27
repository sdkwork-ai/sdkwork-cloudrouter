from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_site_delete_response import AdminSiteDeleteResponse


@dataclass
class SiteDeleteResult:
    """Site delete result schema exposed by Claw Router."""
    code: str
    data: Optional[AdminSiteDeleteResponse] = None
    msg: Optional[str] = None
