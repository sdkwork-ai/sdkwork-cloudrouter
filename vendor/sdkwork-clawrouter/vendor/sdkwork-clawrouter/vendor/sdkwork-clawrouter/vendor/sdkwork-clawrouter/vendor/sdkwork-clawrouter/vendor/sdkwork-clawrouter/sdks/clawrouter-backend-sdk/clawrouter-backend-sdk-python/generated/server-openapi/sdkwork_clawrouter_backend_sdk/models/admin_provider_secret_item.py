from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminProviderSecretItem:
    """Persisted provider secret account snapshot returned by the backend."""
    account_code: str
    auth_type: str
    created_at: str
    id: str
    masked_label: str
    name: str
    provider_code: str
    secret_ref: str
    status: str
    updated_at: str
