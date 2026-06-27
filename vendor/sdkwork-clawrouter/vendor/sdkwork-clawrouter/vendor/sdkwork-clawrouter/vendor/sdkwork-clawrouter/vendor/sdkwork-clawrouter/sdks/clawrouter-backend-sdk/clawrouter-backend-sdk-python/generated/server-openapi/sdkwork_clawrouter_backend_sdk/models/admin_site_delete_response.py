from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminSiteDeleteResponse:
    """Admin site delete response schema exposed by Claw Router."""
    deleted: bool
