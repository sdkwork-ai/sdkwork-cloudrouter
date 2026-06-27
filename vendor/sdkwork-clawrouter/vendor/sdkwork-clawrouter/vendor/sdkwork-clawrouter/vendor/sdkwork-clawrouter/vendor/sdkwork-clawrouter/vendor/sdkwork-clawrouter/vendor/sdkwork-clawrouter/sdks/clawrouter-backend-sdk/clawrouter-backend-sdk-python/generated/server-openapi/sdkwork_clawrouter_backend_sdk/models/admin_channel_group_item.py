from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_capacity_pair import AdminCapacityPair
    from .admin_count_pair import AdminCountPair
    from .admin_usage_pair import AdminUsagePair


@dataclass
class AdminChannelGroupItem:
    """Persisted channel group snapshot returned by the backend."""
    account_count: AdminCountPair
    capacity: AdminCapacityPair
    group_code: str
    group_name: str
    group_type: str
    id: str
    official_price_multiplier: float
    price_reference_mode: str
    provider_code: str
    rate_multiplier: float
    resource_codes: List[str]
    resource_group_codes: List[str]
    status: str
    usage: AdminUsagePair
