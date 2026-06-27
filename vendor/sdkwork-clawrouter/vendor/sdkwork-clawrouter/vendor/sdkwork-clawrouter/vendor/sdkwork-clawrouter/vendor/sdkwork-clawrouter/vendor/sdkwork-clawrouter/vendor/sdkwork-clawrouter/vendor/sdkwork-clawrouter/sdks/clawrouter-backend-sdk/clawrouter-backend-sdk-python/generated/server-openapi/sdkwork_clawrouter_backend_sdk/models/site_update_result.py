from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_site_mutation_response import AdminSiteMutationResponse


@dataclass
class SiteUpdateResult:
    """Site update result schema exposed by Claw Router."""
    code: str
    data: Optional[AdminSiteMutationResponse] = None
    msg: Optional[str] = None
