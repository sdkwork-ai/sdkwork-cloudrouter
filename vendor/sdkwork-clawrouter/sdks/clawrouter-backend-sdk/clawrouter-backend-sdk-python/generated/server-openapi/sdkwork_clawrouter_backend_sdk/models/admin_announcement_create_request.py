from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminAnnouncementCreateRequest:
    """Admin announcement create request schema exposed by Claw Router."""
    content: str
    show_as_popup: bool
    status: str
    target: str
    title: str
