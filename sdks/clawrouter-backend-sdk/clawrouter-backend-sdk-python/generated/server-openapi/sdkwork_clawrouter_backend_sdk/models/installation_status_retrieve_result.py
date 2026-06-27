from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .installation_status_response import InstallationStatusResponse


@dataclass
class InstallationStatusRetrieveResult:
    """Installation status retrieve result schema exposed by Claw Router."""
    code: str
    data: Optional[InstallationStatusResponse] = None
    msg: Optional[str] = None
