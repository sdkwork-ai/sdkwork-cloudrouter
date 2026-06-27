from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class DeleteResult:
    """Delete result schema exposed by Claw Router."""
    deleted: bool
    id: str
    object: str
