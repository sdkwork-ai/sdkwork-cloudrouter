from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_site_settings_response import AdminSiteSettingsResponse


@dataclass
class SiteSettingsUpdateResult:
    """Site settings update result schema exposed by Claw Router."""
    code: str
    data: Optional[AdminSiteSettingsResponse] = None
    msg: Optional[str] = None
