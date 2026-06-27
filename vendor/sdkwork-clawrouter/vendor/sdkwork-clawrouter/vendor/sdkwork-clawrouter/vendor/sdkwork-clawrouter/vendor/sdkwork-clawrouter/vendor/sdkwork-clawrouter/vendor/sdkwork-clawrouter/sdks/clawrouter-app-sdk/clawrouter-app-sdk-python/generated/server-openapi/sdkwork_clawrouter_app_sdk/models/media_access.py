from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class MediaAccess:
    """Media access schema exposed by Claw Router."""
    visibility: str
    expires_at: Optional[str] = None
