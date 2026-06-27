from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminRuntimeRegionSettingsResponse:
    """Admin runtime region settings response schema exposed by Claw Router."""
    current_region_code: str
    current_region_name: str
    remark: str
