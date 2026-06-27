from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .ranking_vendor_options_response import RankingVendorOptionsResponse


@dataclass
class ModelVendorsListResult:
    """Model vendors list result schema exposed by Claw Router."""
    code: str
    data: Optional[RankingVendorOptionsResponse] = None
    msg: Optional[str] = None
