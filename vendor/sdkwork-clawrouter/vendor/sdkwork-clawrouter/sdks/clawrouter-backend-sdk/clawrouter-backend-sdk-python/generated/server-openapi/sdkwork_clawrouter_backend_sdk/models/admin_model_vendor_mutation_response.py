from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_model_vendor_item import AdminModelVendorItem


@dataclass
class AdminModelVendorMutationResponse:
    """Admin model vendor mutation response schema exposed by Claw Router."""
    item: AdminModelVendorItem
