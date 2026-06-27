from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_announcements_response import AdminAnnouncementsResponse


@dataclass
class AnnouncementsListResult:
    """Announcements list result schema exposed by Claw Router."""
    code: str
    data: Optional[AdminAnnouncementsResponse] = None
    msg: Optional[str] = None
