from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_runtime_region_settings_response import AdminRuntimeRegionSettingsResponse


@dataclass
class RuntimeRegionSettingsUpdateResult:
    """Runtime region settings update result schema exposed by Claw Router."""
    code: str
    data: Optional[AdminRuntimeRegionSettingsResponse] = None
    msg: Optional[str] = None
