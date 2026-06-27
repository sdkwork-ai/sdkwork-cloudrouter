from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminServiceNodeDeleteResponse:
    """Admin service node delete response schema exposed by Claw Router."""
    deleted: bool
