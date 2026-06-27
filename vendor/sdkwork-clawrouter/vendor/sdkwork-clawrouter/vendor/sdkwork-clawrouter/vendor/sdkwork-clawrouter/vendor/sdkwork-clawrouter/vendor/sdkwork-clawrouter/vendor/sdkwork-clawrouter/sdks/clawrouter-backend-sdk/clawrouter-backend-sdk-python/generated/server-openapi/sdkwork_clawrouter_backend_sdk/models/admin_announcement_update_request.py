from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminAnnouncementUpdateRequest:
    """Admin announcement update request schema exposed by Claw Router."""
    content: Optional[str] = None
    show_as_popup: Optional[bool] = None
    status: Optional[str] = None
    target: Optional[str] = None
    title: Optional[str] = None
