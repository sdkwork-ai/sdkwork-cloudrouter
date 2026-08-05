"""One-off contract update: app invite endpoints for the invite-code registration gate.

Run: python -B _tmp_update_invite_app_contract.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
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


def string_prop(desc, max_len=64, enum=None):
    prop = {"description": desc, "type": "string"}
    if max_len:
        prop["maxLength"] = max_len
    if enum:
        prop["enum"] = enum
    return prop


def bool_prop(desc):
    return {"description": desc, "type": "boolean"}


with APP.open(encoding="utf-8") as f:
    app = json.load(f)

schemas = app["components"]["schemas"]
paths = app["paths"]

# Schemas
schemas["AppInvitePolicyResponse"] = {
    "additionalProperties": False,
    "description": "App invite policy schema exposed by Cloud Router.",
    "properties": {
        "loginRequired": bool_prop("loginRequired field on app invite policy."),
        "registerRequired": bool_prop("registerRequired field on app invite policy."),
    },
    "required": ["registerRequired", "loginRequired"],
    "type": "object",
}
schemas["InvitePolicyRetrieveResult"] = {
    "allOf": [
        {"$ref": "#/components/schemas/SdkWorkApiResponse"},
        {
            "additionalProperties": False,
            "description": "Object schema used by invite policy retrieve result.",
            "properties": {
                "data": {
                    "allOf": [{"$ref": "#/components/schemas/AppInvitePolicyResponse"}],
                    "description": "Typed AppInvitePolicyResponse response data.",
                }
            },
            "required": ["data"],
            "type": "object",
        },
    ],
    "description": "Invite policy retrieve result schema exposed by Cloud Router.",
    "x-operation-id": "iam.invite.policy.retrieve",
}
schemas["AppInviteValidateRequest"] = {
    "additionalProperties": False,
    "description": "AppInviteValidateRequest contract.",
    "properties": {
        "inviteCode": string_prop("inviteCode field on AppInviteValidateRequest.", 32)
    },
    "required": ["inviteCode"],
    "type": "object",
}
schemas["AppInviteValidateResponse"] = {
    "additionalProperties": False,
    "description": "App invite validate response schema exposed by Cloud Router.",
    "properties": {
        "message": string_prop("message field on app invite validate response.", 256),
        "valid": bool_prop("valid field on app invite validate response."),
    },
    "required": ["valid", "message"],
    "type": "object",
}
schemas["InviteValidateResult"] = {
    "allOf": [
        {"$ref": "#/components/schemas/SdkWorkApiResponse"},
        {
            "additionalProperties": False,
            "description": "Object schema used by invite validate result.",
            "properties": {
                "data": {
                    "allOf": [{"$ref": "#/components/schemas/AppInviteValidateResponse"}],
                    "description": "Typed AppInviteValidateResponse response data.",
                }
            },
            "required": ["data"],
            "type": "object",
        },
    ],
    "description": "Invite validate result schema exposed by Cloud Router.",
    "x-operation-id": "iam.invites.validate",
}
schemas["AppInviteCodeResponse"] = {
    "additionalProperties": False,
    "description": "App invite code response schema exposed by Cloud Router.",
    "properties": {
        "inviteCode": string_prop("inviteCode field on app invite code response.", 32)
    },
    "required": ["inviteCode"],
    "type": "object",
}
schemas["InviteIssueResult"] = {
    "allOf": [
        {"$ref": "#/components/schemas/SdkWorkApiResponse"},
        {
            "additionalProperties": False,
            "description": "Object schema used by invite issue result.",
            "properties": {
                "data": {
                    "allOf": [{"$ref": "#/components/schemas/AppInviteCodeResponse"}],
                    "description": "Typed AppInviteCodeResponse response data.",
                }
            },
            "required": ["data"],
            "type": "object",
        },
    ],
    "description": "Invite issue result schema exposed by Cloud Router.",
    "x-operation-id": "iam.invites.issue",
}
schemas["AppInviteClaimRequest"] = {
    "additionalProperties": False,
    "description": "AppInviteClaimRequest contract.",
    "properties": {
        "inviteCode": string_prop("inviteCode field on AppInviteClaimRequest.", 32)
    },
    "required": ["inviteCode"],
    "type": "object",
}
schemas["AppInviteClaimResponse"] = {
    "additionalProperties": False,
    "description": "App invite claim response schema exposed by Cloud Router.",
    "properties": {
        "rewardStatus": string_prop("rewardStatus field on app invite claim response.", 16)
    },
    "required": ["rewardStatus"],
    "type": "object",
}
schemas["InviteClaimResult"] = {
    "allOf": [
        {"$ref": "#/components/schemas/SdkWorkApiResponse"},
        {
            "additionalProperties": False,
            "description": "Object schema used by invite claim result.",
            "properties": {
                "data": {
                    "allOf": [{"$ref": "#/components/schemas/AppInviteClaimResponse"}],
                    "description": "Typed AppInviteClaimResponse response data.",
                }
            },
            "required": ["data"],
            "type": "object",
        },
    ],
    "description": "Invite claim result schema exposed by Cloud Router.",
    "x-operation-id": "iam.invites.claim",
}

# Paths
paths["/app/v3/api/iam/invite/policy"] = {
    "get": {
        "description": "List invite code policy. Reads ops_config_snapshot. Writes none. File targets none.",
        "operationId": "iam.invite.policy.retrieve",
        "parameters": [
            {
                "description": "Tenant code query parameter.",
                "in": "query",
                "name": "tenant_code",
                "required": False,
                "schema": {"maxLength": 64, "type": "string"},
            },
            {
                "description": "Organization code query parameter.",
                "in": "query",
                "name": "organization_code",
                "required": False,
                "schema": {"maxLength": 64, "type": "string"},
            },
        ],
        "responses": base_responses("InvitePolicyRetrieveResult"),
        "security": [],
        "summary": "List invite code policy",
        "tags": ["iam"],
        "x-contract-kind": "read",
        "x-file-targets": [],
        "x-read-sources": ["ops_config_snapshot"],
        "x-route-scope": "public",
        "x-sdk-domain": "iam",
    }
}
paths["/app/v3/api/iam/invites/validate"] = {
    "post": {
        "description": "Validate invite code. Reads ops_referral_invite_code. Writes none. File targets none.",
        "operationId": "iam.invites.validate",
        "parameters": [],
        "requestBody": {
            "content": {
                "application/json": {
                    "schema": {"$ref": "#/components/schemas/AppInviteValidateRequest"}
                }
            },
            "required": True,
        },
        "responses": base_responses("InviteValidateResult"),
        "security": [],
        "summary": "Validate invite code",
        "tags": ["iam"],
        "x-contract-kind": "command",
        "x-file-targets": [],
        "x-read-sources": ["ops_referral_invite_code"],
        "x-route-scope": "public",
        "x-sdk-domain": "iam",
    }
}
paths["/app/v3/api/iam/invites/issue"] = {
    "post": {
        "description": "Issue personal invite code. Reads ops_referral_invite_code. Writes ops_referral_invite_code. File targets none.",
        "operationId": "iam.invites.issue",
        "parameters": [],
        "responses": base_responses("InviteIssueResult"),
        "security": [{"AccessToken": [], "AuthToken": []}],
        "summary": "Issue personal invite code",
        "tags": ["iam"],
        "x-contract-kind": "command",
        "x-file-targets": [],
        "x-read-sources": ["ops_referral_invite_code"],
        "x-route-scope": "user",
        "x-sdk-domain": "iam",
        "x-write-targets": ["ops_referral_invite_code"],
    }
}
paths["/app/v3/api/iam/invites/claim"] = {
    "post": {
        "description": "Claim invite relation after registration. Reads ops_referral_invite_code, ops_referral_relation. Writes ops_referral_relation. File targets none.",
        "operationId": "iam.invites.claim",
        "parameters": [],
        "requestBody": {
            "content": {
                "application/json": {
                    "schema": {"$ref": "#/components/schemas/AppInviteClaimRequest"}
                }
            },
            "required": True,
        },
        "responses": base_responses("InviteClaimResult"),
        "security": [{"AccessToken": [], "AuthToken": []}],
        "summary": "Claim invite relation",
        "tags": ["iam"],
        "x-contract-kind": "command",
        "x-file-targets": [],
        "x-read-sources": ["ops_referral_invite_code", "ops_referral_relation"],
        "x-route-scope": "user",
        "x-sdk-domain": "iam",
        "x-write-targets": ["ops_referral_relation"],
    }
}

with APP.open("w", encoding="utf-8") as f:
    json.dump(app, f, ensure_ascii=False, indent=2)
print("app openapi updated")
