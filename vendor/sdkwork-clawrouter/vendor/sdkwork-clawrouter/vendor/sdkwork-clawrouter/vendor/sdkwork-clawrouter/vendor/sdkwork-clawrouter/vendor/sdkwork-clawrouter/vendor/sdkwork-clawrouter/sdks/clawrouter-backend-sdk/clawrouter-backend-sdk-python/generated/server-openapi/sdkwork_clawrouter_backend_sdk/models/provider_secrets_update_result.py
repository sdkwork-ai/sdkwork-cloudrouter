from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_provider_secret_mutation_response import AdminProviderSecretMutationResponse


@dataclass
class ProviderSecretsUpdateResult:
    """Provider secrets update result schema exposed by Claw Router."""
    code: str
    data: Optional[AdminProviderSecretMutationResponse] = None
    msg: Optional[str] = None
