from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiCertificateActivationRequest:
    """OpenAI-compatible request to activate or deactivate certificates."""
    certificate_ids: List[str]
