from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class ListSkillVersionsItem:
    """Item module returned inside the listSkillVersions list response."""
    created: Optional[int] = None
    created_at: Optional[int] = None
    description: Optional[str] = None
    id: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None
    name: Optional[str] = None
    object: Optional[str] = None
    status: Optional[str] = None
    version: Optional[str] = None
