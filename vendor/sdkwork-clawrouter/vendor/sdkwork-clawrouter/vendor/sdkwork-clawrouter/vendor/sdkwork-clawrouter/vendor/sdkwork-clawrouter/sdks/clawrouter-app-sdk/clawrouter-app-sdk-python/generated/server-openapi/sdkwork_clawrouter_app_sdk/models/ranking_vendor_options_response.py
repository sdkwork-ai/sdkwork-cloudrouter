from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .ranking_vendor_option import RankingVendorOption


@dataclass
class RankingVendorOptionsResponse:
    """Ranking vendor options response schema exposed by Claw Router."""
    items: List[RankingVendorOption]
