from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class UpdateSettingsResponse:
    """Update settings response schema exposed by Claw Router."""
    success: bool
