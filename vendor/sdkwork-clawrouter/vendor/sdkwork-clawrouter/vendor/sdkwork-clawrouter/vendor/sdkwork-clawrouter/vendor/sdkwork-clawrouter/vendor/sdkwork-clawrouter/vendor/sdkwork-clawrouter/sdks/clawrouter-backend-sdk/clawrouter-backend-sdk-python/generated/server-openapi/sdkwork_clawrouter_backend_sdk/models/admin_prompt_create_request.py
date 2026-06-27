from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminPromptCreateRequest:
    """Admin prompt create request schema exposed by Claw Router."""
    name: str
    prompt_key: str
    category_id: Optional[str] = None
    description: Optional[str] = None
    prompt_type: Optional[str] = None
    tags: Optional[List[str]] = None
    visibility: Optional[str] = None
