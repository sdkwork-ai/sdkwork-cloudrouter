from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_firewall_rules_response import AdminFirewallRulesResponse


@dataclass
class FirewallsRulesListResult:
    """Firewalls rules list result schema exposed by Claw Router."""
    code: str
    data: Optional[AdminFirewallRulesResponse] = None
    msg: Optional[str] = None
