"""One-off contract update: add invite-code policy + referral relations/strategies + app invite endpoints.

Run: python -B _tmp_update_invite_contract.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BACKEND = ROOT / "apis/backend-api/cloudrouter/cloudrouter-backend-api.openapi.json"
APP = ROOT / "apis/app-api/cloudrouter/cloudrouter-app-api.openapi.json"

PROBLEM_RESPONSE = {
    "content": {
        "application/problem+json": {"schema": {"$ref": "#/components/schemas/ProblemDetail"}}
    },
    "description": "Bad Request",
}


def ok_response(ref: str, description: str = "OK"):
    return {
        "content": {
            "application/json": {
                "schema": {"$ref": f"#/components/schemas/{ref}"}
            }
        },
        "description": description,
    }


def base_responses(ok_ref: str, ok_desc: str = "OK"):
    return {
        "200": ok_response(ok_ref, ok_desc),
        "400": PROBLEM_RESPONSE,
        "401": {
            "content": {
                "application/problem+json": {
                    "schema": {"$ref": "#/components/schemas/ProblemDetail"}
                }
            },
            "description": "Unauthorized",
        },
        "500": {
            "content": {
                "application/problem+json": {
                    "schema": {"$ref": "#/components/schemas/ProblemDetail"}
                }
            },
            "description": "Server Error",
        },
        "default": {
            "content": {
                "application/problem+json": {
                    "schema": {"$ref": "#/components/schemas/ProblemDetail"}
                }
            },
            "description": "Error response.",
        },
    }


def page_query_parameters(extra=None):
    params = [
        {
            "description": "Page query parameter.",
            "in": "query",
            "name": "page",
            "required": False,
            "schema": {"minimum": 1, "type": "integer"},
        },
        {
            "description": "Page size query parameter.",
            "in": "query",
            "name": "page_size",
            "required": False,
            "schema": {"maximum": 200, "minimum": 1, "type": "integer"},
        },
    ]
    if extra:
        params.extend(extra)
    return params


def admin_security():
    return [{"AccessToken": [], "AuthToken": []}]


def string_prop(desc, max_len=64, pattern=None, enum=None, format=None):
    prop = {"description": desc, "type": "string"}
    if max_len:
        prop["maxLength"] = max_len
    if pattern:
        prop["pattern"] = pattern
    if enum:
        prop["enum"] = enum
    if format:
        prop["format"] = format
    return prop


def int64_string_prop(desc):
    return {
        "description": desc,
        "format": "int64",
        "pattern": "^[0-9]+$",
        "type": "string",
        "x-sdkwork-int64-string": True,
        "x-sdkwork-rust-type": "i64",
    }


def bool_prop(desc):
    return {"description": desc, "type": "boolean"}


# ---------------------------------------------------------------------------
# Backend openapi
# ---------------------------------------------------------------------------
with BACKEND.open(encoding="utf-8") as f:
    backend = json.load(f)

schemas = backend["components"]["schemas"]
paths = backend["paths"]

# 1. Auth settings invite code policy schemas
schemas["AdminAuthInviteCodePolicy"] = {
    "additionalProperties": False,
    "description": "AdminAuthInviteCodePolicy contract.",
    "properties": {
        "loginRequired": bool_prop("loginRequired field on AdminAuthInviteCodePolicy."),
        "registerRequired": bool_prop("registerRequired field on AdminAuthInviteCodePolicy."),
    },
    "required": ["registerRequired", "loginRequired"],
    "type": "object",
}
schemas["AdminAuthInviteCodePolicyUpdateRequest"] = {
    "additionalProperties": False,
    "description": "AdminAuthInviteCodePolicyUpdateRequest contract.",
    "properties": {
        "loginRequired": bool_prop("loginRequired field on AdminAuthInviteCodePolicyUpdateRequest."),
        "registerRequired": bool_prop(
            "registerRequired field on AdminAuthInviteCodePolicyUpdateRequest."
        ),
    },
    "type": "object",
}

# 2. Extend auth settings schemas
for schema_name, prop_desc in (
    ("AdminAuthSettingsResponse", "inviteCodePolicy field on AdminAuthSettingsResponse."),
    ("AdminAuthSettingsUpdateRequest", "inviteCodePolicy field on AdminAuthSettingsUpdateRequest."),
):
    target = "AdminAuthInviteCodePolicy" if "Response" in schema_name else "AdminAuthInviteCodePolicyUpdateRequest"
    schemas[schema_name]["properties"]["inviteCodePolicy"] = {
        "allOf": [{"$ref": f"#/components/schemas/{target}"}],
        "description": prop_desc,
    }

# 3. Referral relation + strategy schemas
schemas["AdminReferralRelation"] = {
    "additionalProperties": False,
    "description": "Admin referral relation schema exposed by Cloud Router.",
    "properties": {
        "claimedAt": string_prop("Claimed at field on admin referral relation.", 64),
        "id": string_prop("Id field on admin referral relation.", 32),
        "inviteCode": string_prop("Invite code field on admin referral relation.", 32),
        "invitee": string_prop("Invitee field on admin referral relation.", 320),
        "inviter": string_prop("Inviter field on admin referral relation.", 320),
        "rewardStatus": string_prop("Reward status field on admin referral relation.", 16),
        "source": string_prop("Source field on admin referral relation.", 16),
    },
    "required": [
        "id",
        "inviter",
        "invitee",
        "inviteCode",
        "source",
        "rewardStatus",
        "claimedAt",
    ],
    "type": "object",
}
schemas["AdminReferralRelationListResponse"] = {
    "additionalProperties": False,
    "description": "Admin referral relation list response schema exposed by Cloud Router.",
    "name": "AdminReferralRelationListResponse",
    "properties": {
        "items": {
            "description": "Items field on admin referral relation list response.",
            "items": {"$ref": "#/components/schemas/AdminReferralRelation"},
            "type": "array",
        },
        "pageInfo": {
            "allOf": [{"$ref": "#/components/schemas/PageInfo"}],
            "description": "Page info field on admin referral relation list response.",
        },
    },
    "required": ["items", "pageInfo"],
    "type": "object",
}
schemas["ReferralRelationListResult"] = {
    "allOf": [
        {"$ref": "#/components/schemas/SdkWorkApiResponse"},
        {
            "additionalProperties": False,
            "description": "Object schema used by referral relation list result.",
            "properties": {
                "data": {
                    "allOf": [{"$ref": "#/components/schemas/AdminReferralRelationListResponse"}],
                    "description": "Data field on referral relation list result.",
                }
            },
            "required": ["data"],
            "type": "object",
        },
    ],
    "description": "Referral relation list result schema exposed by Cloud Router.",
    "x-operation-id": "referralRelations.list",
}
schemas["AdminReferralStrategy"] = {
    "additionalProperties": False,
    "description": "Admin referral strategy schema exposed by Cloud Router.",
    "properties": {
        "description": string_prop("Description field on admin referral strategy.", 512),
        "endsAt": string_prop("Ends at field on admin referral strategy.", 64),
        "id": string_prop("Id field on admin referral strategy.", 32),
        "maxRewardsPerInviter": int64_string_prop(
            "Max rewards per inviter field on admin referral strategy."
        ),
        "name": string_prop("Name field on admin referral strategy.", 128),
        "rewardTarget": string_prop("Reward target field on admin referral strategy.", 16),
        "rewardType": string_prop("Reward type field on admin referral strategy.", 16),
        "rewardValue": string_prop("Reward value field on admin referral strategy.", 64),
        "startsAt": string_prop("Starts at field on admin referral strategy.", 64),
        "status": string_prop("Status field on admin referral strategy.", 16),
        "triggerEvent": string_prop("Trigger event field on admin referral strategy.", 16),
        "updatedAt": string_prop("Updated at field on admin referral strategy.", 64),
    },
    "required": [
        "id",
        "name",
        "description",
        "status",
        "rewardType",
        "rewardValue",
        "rewardTarget",
        "triggerEvent",
        "maxRewardsPerInviter",
        "startsAt",
        "endsAt",
        "updatedAt",
    ],
    "type": "object",
}
schemas["AdminReferralStrategyListResponse"] = {
    "additionalProperties": False,
    "description": "Admin referral strategy list response schema exposed by Cloud Router.",
    "name": "AdminReferralStrategyListResponse",
    "properties": {
        "items": {
            "description": "Items field on admin referral strategy list response.",
            "items": {"$ref": "#/components/schemas/AdminReferralStrategy"},
            "type": "array",
        },
        "pageInfo": {
            "allOf": [{"$ref": "#/components/schemas/PageInfo"}],
            "description": "Page info field on admin referral strategy list response.",
        },
    },
    "required": ["items", "pageInfo"],
    "type": "object",
}
schemas["ReferralStrategiesListResult"] = {
    "allOf": [
        {"$ref": "#/components/schemas/SdkWorkApiResponse"},
        {
            "additionalProperties": False,
            "description": "Object schema used by referral strategies list result.",
            "properties": {
                "data": {
                    "allOf": [{"$ref": "#/components/schemas/AdminReferralStrategyListResponse"}],
                    "description": "Data field on referral strategies list result.",
                }
            },
            "required": ["data"],
            "type": "object",
        },
    ],
    "description": "Referral strategies list result schema exposed by Cloud Router.",
    "x-operation-id": "referralStrategies.list",
}
schemas["ReferralStrategyRetrieveResult"] = {
    "allOf": [
        {"$ref": "#/components/schemas/SdkWorkApiResponse"},
        {
            "additionalProperties": False,
            "description": "Object schema used by referral strategy retrieve result.",
            "properties": {
                "data": {
                    "allOf": [{"$ref": "#/components/schemas/AdminReferralStrategy"}],
                    "description": "Typed AdminReferralStrategy response data.",
                }
            },
            "required": ["data"],
            "type": "object",
        },
    ],
    "description": "Referral strategy retrieve result schema exposed by Cloud Router.",
    "x-operation-id": "referralStrategies.retrieve",
}
schemas["ReferralStrategyCreateResult"] = {
    "allOf": [
        {"$ref": "#/components/schemas/SdkWorkApiResponse"},
        {
            "additionalProperties": False,
            "description": "Object schema used by referral strategy create result.",
            "properties": {
                "data": {
                    "allOf": [{"$ref": "#/components/schemas/AdminReferralStrategy"}],
                    "description": "Typed AdminReferralStrategy response data.",
                }
            },
            "required": ["data"],
            "type": "object",
        },
    ],
    "description": "Referral strategy create result schema exposed by Cloud Router.",
    "x-operation-id": "referralStrategies.create",
}
schemas["AdminReferralStrategyMutationRequest"] = {
    "additionalProperties": False,
    "description": "AdminReferralStrategyMutationRequest contract.",
    "properties": {
        "description": string_prop("description field on AdminReferralStrategyMutationRequest.", 512),
        "endsAt": string_prop("endsAt field on AdminReferralStrategyMutationRequest.", 64),
        "maxRewardsPerInviter": {
            "anyOf": [
                {"format": "int64", "pattern": "^[0-9]+$", "type": "string", "x-sdkwork-int64-string": True, "x-sdkwork-rust-type": "i64"},
                {"minimum": 0, "type": "integer"},
            ],
            "description": "maxRewardsPerInviter field on AdminReferralStrategyMutationRequest.",
        },
        "name": string_prop("name field on AdminReferralStrategyMutationRequest.", 128),
        "rewardTarget": string_prop("rewardTarget field on AdminReferralStrategyMutationRequest.", 16),
        "rewardType": string_prop("rewardType field on AdminReferralStrategyMutationRequest.", 16),
        "rewardValue": string_prop("rewardValue field on AdminReferralStrategyMutationRequest.", 64),
        "startsAt": string_prop("startsAt field on AdminReferralStrategyMutationRequest.", 64),
        "status": string_prop("status field on AdminReferralStrategyMutationRequest.", 16),
        "triggerEvent": string_prop("triggerEvent field on AdminReferralStrategyMutationRequest.", 16),
    },
    "type": "object",
}


def strategy_path_common():
    return {
        "description": "Reads ops_referral_strategy. Writes none. File targets none.",
        "responses": base_responses("ReferralStrategiesListResult"),
        "security": admin_security(),
        "tags": ["billing"],
        "x-contract-kind": "read",
        "x-file-targets": [],
        "x-read-sources": ["ops_referral_strategy"],
        "x-route-scope": "admin",
        "x-sdk-domain": "billing",
    }


# 4. New paths
paths["/backend/v3/api/billing/referrals/relations"] = {
    "get": {
        **strategy_path_common(),
        "operationId": "referralRelations.list",
        "parameters": page_query_parameters(),
        "summary": "List referral relations",
        "x-read-sources": ["ops_referral_relation"],
    }
}
paths["/backend/v3/api/billing/referral_strategies"] = {
    "get": {
        **strategy_path_common(),
        "operationId": "referralStrategies.list",
        "parameters": page_query_parameters(
            [
                {
                    "description": "Status query parameter.",
                    "in": "query",
                    "name": "status",
                    "required": False,
                    "schema": {"enum": ["active", "disabled"], "type": "string"},
                }
            ]
        ),
        "summary": "List referral strategies",
    },
    "post": {
        "description": "Create referral strategy. Reads ops_referral_strategy. Writes ops_referral_strategy. File targets none.",
        "operationId": "referralStrategies.create",
        "parameters": [],
        "requestBody": {
            "content": {
                "application/json": {
                    "schema": {"$ref": "#/components/schemas/AdminReferralStrategyMutationRequest"}
                }
            },
            "required": True,
        },
        "responses": {
            "201": ok_response("ReferralStrategyCreateResult", "Created"),
            "400": PROBLEM_RESPONSE,
            "401": {
                "content": {
                    "application/problem+json": {
                        "schema": {"$ref": "#/components/schemas/ProblemDetail"}
                    }
                },
                "description": "Unauthorized",
            },
            "500": {
                "content": {
                    "application/problem+json": {
                        "schema": {"$ref": "#/components/schemas/ProblemDetail"}
                    }
                },
                "description": "Server Error",
            },
            "default": {
                "content": {
                    "application/problem+json": {
                        "schema": {"$ref": "#/components/schemas/ProblemDetail"}
                    }
                },
                "description": "Error response.",
            },
        },
        "security": admin_security(),
        "summary": "Create referral strategy",
        "tags": ["billing"],
        "x-contract-kind": "command",
        "x-file-targets": [],
        "x-read-sources": ["ops_referral_strategy"],
        "x-route-scope": "admin",
        "x-sdk-domain": "billing",
        "x-write-targets": ["ops_referral_strategy"],
    },
}
paths["/backend/v3/api/billing/referral_strategies/{strategy_id}"] = {
    "get": {
        **strategy_path_common(),
        "operationId": "referralStrategies.retrieve",
        "parameters": [
            {
                "description": "Strategy id path parameter.",
                "in": "path",
                "name": "strategy_id",
                "required": True,
                "schema": {"maxLength": 64, "type": "string"},
            }
        ],
        "responses": base_responses("ReferralStrategyRetrieveResult"),
        "summary": "Retrieve referral strategy",
    },
    "patch": {
        "description": "Update referral strategy. Reads ops_referral_strategy. Writes ops_referral_strategy. File targets none.",
        "operationId": "referralStrategies.update",
        "parameters": [
            {
                "description": "Strategy id path parameter.",
                "in": "path",
                "name": "strategy_id",
                "required": True,
                "schema": {"maxLength": 64, "type": "string"},
            }
        ],
        "requestBody": {
            "content": {
                "application/json": {
                    "schema": {"$ref": "#/components/schemas/AdminReferralStrategyMutationRequest"}
                }
            },
            "required": True,
        },
        "responses": base_responses("ReferralStrategyRetrieveResult"),
        "security": admin_security(),
        "summary": "Update referral strategy",
        "tags": ["billing"],
        "x-contract-kind": "command",
        "x-file-targets": [],
        "x-read-sources": ["ops_referral_strategy"],
        "x-route-scope": "admin",
        "x-sdk-domain": "billing",
        "x-write-targets": ["ops_referral_strategy"],
    },
    "delete": {
        "description": "Delete referral strategy. Reads ops_referral_strategy. Writes ops_referral_strategy. File targets none.",
        "operationId": "referralStrategies.delete",
        "parameters": [
            {
                "description": "Strategy id path parameter.",
                "in": "path",
                "name": "strategy_id",
                "required": True,
                "schema": {"maxLength": 64, "type": "string"},
            }
        ],
        "responses": {
            "204": {"description": "No Content"},
            "400": PROBLEM_RESPONSE,
            "401": {
                "content": {
                    "application/problem+json": {
                        "schema": {"$ref": "#/components/schemas/ProblemDetail"}
                    }
                },
                "description": "Unauthorized",
            },
            "500": {
                "content": {
                    "application/problem+json": {
                        "schema": {"$ref": "#/components/schemas/ProblemDetail"}
                    }
                },
                "description": "Server Error",
            },
            "default": {
                "content": {
                    "application/problem+json": {
                        "schema": {"$ref": "#/components/schemas/ProblemDetail"}
                    }
                },
                "description": "Error response.",
            },
        },
        "security": admin_security(),
        "summary": "Delete referral strategy",
        "tags": ["billing"],
        "x-contract-kind": "command",
        "x-file-targets": [],
        "x-read-sources": ["ops_referral_strategy"],
        "x-route-scope": "admin",
        "x-sdk-domain": "billing",
        "x-write-targets": ["ops_referral_strategy"],
    },
}

with BACKEND.open("w", encoding="utf-8") as f:
    json.dump(backend, f, ensure_ascii=False, indent=2)
print("backend openapi updated")
