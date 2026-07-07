from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .page_info import PageInfo


@dataclass
class ModelRankingsPage:
    """Model rankings page schema exposed by Claw Router."""
    history: List[Dict[str, str]]
    items: List[Dict[str, str]]
    page_info: PageInfo
    source: Dict[str, str]
