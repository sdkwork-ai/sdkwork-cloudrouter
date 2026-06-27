from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_prompt_binding_list_response import AdminPromptBindingListResponse


@dataclass
class DefinitionBindingsListResult:
    """Definition bindings list result schema exposed by Claw Router."""
    code: str
    data: Optional[AdminPromptBindingListResponse] = None
    msg: Optional[str] = None
