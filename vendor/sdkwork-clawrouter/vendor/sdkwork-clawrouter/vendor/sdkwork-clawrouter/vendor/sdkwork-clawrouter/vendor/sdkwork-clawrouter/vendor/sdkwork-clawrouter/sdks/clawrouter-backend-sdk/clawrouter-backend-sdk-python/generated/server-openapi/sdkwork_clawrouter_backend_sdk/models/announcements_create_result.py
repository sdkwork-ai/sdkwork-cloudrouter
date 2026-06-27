from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_announcement_mutation_response import AdminAnnouncementMutationResponse


@dataclass
class AnnouncementsCreateResult:
    """Announcements create result schema exposed by Claw Router."""
    code: str
    data: Optional[AdminAnnouncementMutationResponse] = None
    msg: Optional[str] = None
