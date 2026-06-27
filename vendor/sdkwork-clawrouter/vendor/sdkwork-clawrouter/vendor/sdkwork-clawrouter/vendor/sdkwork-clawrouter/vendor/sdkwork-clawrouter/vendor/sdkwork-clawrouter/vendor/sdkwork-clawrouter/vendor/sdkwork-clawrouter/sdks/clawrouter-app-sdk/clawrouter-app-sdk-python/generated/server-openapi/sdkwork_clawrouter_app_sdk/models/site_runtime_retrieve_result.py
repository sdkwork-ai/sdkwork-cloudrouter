from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .site_runtime_settings_response import SiteRuntimeSettingsResponse


@dataclass
class SiteRuntimeRetrieveResult:
    """Site runtime retrieve result schema exposed by Claw Router."""
    code: str
    data: Optional[SiteRuntimeSettingsResponse] = None
    msg: Optional[str] = None
