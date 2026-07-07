from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .page_info import PageInfo


@dataclass
class ModelRankingRefreshJobHistoryPage:
    """Model ranking refresh job history page schema exposed by Claw Router."""
    items: List[Dict[str, str]]
    page_info: PageInfo
