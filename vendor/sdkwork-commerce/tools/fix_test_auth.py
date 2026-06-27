import re
import pathlib

tests = pathlib.Path("crates/sdkwork-commerce-api-server/tests")
pattern = re.compile(
    r"Request::builder\(\)\s*"
    r'\.method\("GET"\)\s*'
    r"\.uri\(([^)]+)\)\s*"
    r"\.body\(Body::empty\(\)\)\s*"
    r'\.expect\("request"\)',
    re.S,
)
replacement = (
    r"commerce_test_request("
    r'Request::builder().method("GET").uri(\1), '
    r"Some(&commerce_standard_test_context()), Body::empty())"
)

for path in tests.glob("*.rs"):
    text = path.read_text(encoding="utf-8")
    new_text = pattern.sub(replacement, text)
    if new_text != text:
        if "sdkwork_commerce_api_server::test_http" not in new_text:
            new_text = new_text.replace(
                "use axum::body::Body;",
                "use sdkwork_commerce_api_server::test_http::{\n"
                "    commerce_standard_test_context, commerce_test_request,\n"
                "};\nuse axum::body::Body;",
                1,
            )
        path.write_text(new_text, encoding="utf-8")
        print(f"fixed {path.name}")
