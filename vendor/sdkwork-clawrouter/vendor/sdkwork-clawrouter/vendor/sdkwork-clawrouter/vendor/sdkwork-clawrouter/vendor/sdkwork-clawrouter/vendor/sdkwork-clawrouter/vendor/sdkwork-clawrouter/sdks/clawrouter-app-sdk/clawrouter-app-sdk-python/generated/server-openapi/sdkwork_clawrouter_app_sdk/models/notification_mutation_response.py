from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class NotificationMutationResponse:
    """Notification mutation response schema exposed by Claw Router."""
    state: str
    updated: bool
