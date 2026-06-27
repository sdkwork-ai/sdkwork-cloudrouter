from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminRuntimeRegionSettingsUpdateRequest:
    """Admin runtime region settings update request schema exposed by Claw Router."""
    current_region_code: Optional[str] = None
    current_region_name: Optional[str] = None
    remark: Optional[str] = None
