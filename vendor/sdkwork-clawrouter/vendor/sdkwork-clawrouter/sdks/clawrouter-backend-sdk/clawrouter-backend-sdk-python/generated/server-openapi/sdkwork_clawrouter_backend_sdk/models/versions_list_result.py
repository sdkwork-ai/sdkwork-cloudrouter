from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_prompt_version_list_response import AdminPromptVersionListResponse


@dataclass
class VersionsListResult:
    """Versions list result schema exposed by Claw Router."""
    code: str
    data: Optional[AdminPromptVersionListResponse] = None
    msg: Optional[str] = None
