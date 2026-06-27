from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_prompt_version_item import AdminPromptVersionItem


@dataclass
class AdminPromptVersionListResponse:
    """Admin prompt version list response schema exposed by Claw Router."""
    items: List[AdminPromptVersionItem]
