from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_provider_secret_item import AdminProviderSecretItem


@dataclass
class AdminProviderSecretMutationResponse:
    """Admin provider secret mutation response schema exposed by Claw Router."""
    item: AdminProviderSecretItem
