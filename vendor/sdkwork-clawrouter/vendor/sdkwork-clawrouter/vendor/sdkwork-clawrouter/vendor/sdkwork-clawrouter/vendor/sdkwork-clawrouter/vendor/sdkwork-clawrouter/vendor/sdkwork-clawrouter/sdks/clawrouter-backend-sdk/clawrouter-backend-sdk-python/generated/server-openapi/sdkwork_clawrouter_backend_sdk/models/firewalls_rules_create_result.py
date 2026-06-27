from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_firewall_mutation_response import AdminFirewallMutationResponse


@dataclass
class FirewallsRulesCreateResult:
    """Firewalls rules create result schema exposed by Claw Router."""
    code: str
    data: Optional[AdminFirewallMutationResponse] = None
    msg: Optional[str] = None
