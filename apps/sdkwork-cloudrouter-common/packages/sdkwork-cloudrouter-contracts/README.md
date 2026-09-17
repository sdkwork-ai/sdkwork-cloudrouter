# @sdkwork/cloudrouter-contracts

Architecture-neutral Cloud Router client contracts shared by the `-h5` and `-mini-program` roots.

It owns route identity, capability descriptors, permission scope policy, and the view-model DTOs every
Cloud Router client renders. It has no UI runtime dependency and must not import generated SDKs.
