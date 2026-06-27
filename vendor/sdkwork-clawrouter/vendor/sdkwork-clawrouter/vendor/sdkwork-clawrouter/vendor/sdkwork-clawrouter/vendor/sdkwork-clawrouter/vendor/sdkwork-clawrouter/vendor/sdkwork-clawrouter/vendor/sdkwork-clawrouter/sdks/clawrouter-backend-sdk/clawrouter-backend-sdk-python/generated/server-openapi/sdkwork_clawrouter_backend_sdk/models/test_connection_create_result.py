from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_site_connection_check_response import AdminSiteConnectionCheckResponse


@dataclass
class TestConnectionCreateResult:
    """Test connection create result schema exposed by Claw Router."""
    code: str
    data: Optional[AdminSiteConnectionCheckResponse] = None
    msg: Optional[str] = None
