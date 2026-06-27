from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_site_channels_response import AdminSiteChannelsResponse


@dataclass
class SiteChannelsListResult:
    """Site channels list result schema exposed by Claw Router."""
    code: str
    data: Optional[AdminSiteChannelsResponse] = None
    msg: Optional[str] = None
