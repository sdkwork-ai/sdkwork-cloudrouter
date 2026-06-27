from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_prompt_binding_item import AdminPromptBindingItem


@dataclass
class AdminPromptBindingMutationResponse:
    """Admin prompt binding mutation response schema exposed by Claw Router."""
    item: AdminPromptBindingItem
