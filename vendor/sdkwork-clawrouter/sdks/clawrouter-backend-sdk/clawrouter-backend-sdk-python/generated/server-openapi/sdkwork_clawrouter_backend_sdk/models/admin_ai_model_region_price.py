from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminAiModelRegionPrice:
    """Regional official reference pricing returned by admin AI model payloads."""
    currency: str
    price_in: str
    price_out: str
    region_code: str
    cache_read_price: Optional[str] = None
    cache_write_price: Optional[str] = None
