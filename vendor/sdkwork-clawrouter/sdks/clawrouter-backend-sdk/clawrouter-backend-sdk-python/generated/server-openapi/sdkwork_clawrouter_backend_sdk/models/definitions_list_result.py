from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_prompt_list_response import AdminPromptListResponse


@dataclass
class DefinitionsListResult:
    """Definitions list result schema exposed by Claw Router."""
    code: str
    data: Optional[AdminPromptListResponse] = None
    msg: Optional[str] = None
