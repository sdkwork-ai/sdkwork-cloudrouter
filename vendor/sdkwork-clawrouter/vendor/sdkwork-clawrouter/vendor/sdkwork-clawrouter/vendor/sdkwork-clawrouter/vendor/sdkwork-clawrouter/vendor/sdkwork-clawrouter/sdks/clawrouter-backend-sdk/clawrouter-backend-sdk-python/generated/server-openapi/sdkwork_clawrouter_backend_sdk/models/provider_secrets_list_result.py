from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_provider_secrets_response import AdminProviderSecretsResponse


@dataclass
class ProviderSecretsListResult:
    """Provider secrets list result schema exposed by Claw Router."""
    code: str
    data: Optional[AdminProviderSecretsResponse] = None
    msg: Optional[str] = None
