from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_firewall_item import AdminFirewallItem


@dataclass
class AdminFirewallMutationResponse:
    """Admin firewall mutation response schema exposed by Claw Router."""
    item: AdminFirewallItem
