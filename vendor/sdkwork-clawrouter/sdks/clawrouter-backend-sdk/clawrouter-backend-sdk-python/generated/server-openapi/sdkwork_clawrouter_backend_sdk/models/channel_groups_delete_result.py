from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_delete_response import AdminDeleteResponse


@dataclass
class ChannelGroupsDeleteResult:
    """Channel groups delete result schema exposed by Claw Router."""
    code: str
    data: Optional[AdminDeleteResponse] = None
    msg: Optional[str] = None
