from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_prompt_item import AdminPromptItem


@dataclass
class AdminPromptListResponse:
    """Admin prompt list response schema exposed by Claw Router."""
    items: List[AdminPromptItem]
