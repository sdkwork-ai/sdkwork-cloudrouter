# @sdkwork/cloudrouter-sdk-ports

Service ports every Cloud Router client core implements on top of its generated
app SDK. Ports return the raw generated payload so normalization stays in
`@sdkwork/cloudrouter-service` and each platform core stays a thin adapter.
