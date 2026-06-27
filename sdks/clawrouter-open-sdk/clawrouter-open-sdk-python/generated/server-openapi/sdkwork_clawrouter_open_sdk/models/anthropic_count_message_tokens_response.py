from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AnthropicCountMessageTokensResponse:
    """Anthropic Claude anthropic count message tokens response schema exposed by Claw Router vendor routing."""
    input_tokens: int
