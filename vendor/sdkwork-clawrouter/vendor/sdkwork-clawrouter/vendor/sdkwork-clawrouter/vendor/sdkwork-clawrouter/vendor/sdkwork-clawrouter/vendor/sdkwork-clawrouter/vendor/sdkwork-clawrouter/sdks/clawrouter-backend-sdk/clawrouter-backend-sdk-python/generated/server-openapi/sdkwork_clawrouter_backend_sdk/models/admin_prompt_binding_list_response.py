from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_prompt_binding_item import AdminPromptBindingItem


@dataclass
class AdminPromptBindingListResponse:
    """Admin prompt binding list response schema exposed by Claw Router."""
    items: List[AdminPromptBindingItem]
