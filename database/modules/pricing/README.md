# pricing

Reusable commerce pricing module. It owns products, operations, meters,
immutable price-book versions, rates, rate conditions, and import evidence.

`sdkwork-models` is an official source. Cloud Router imports a catalog version
into a staged price book, validates every rate and condition, then activates the
version atomically. Missing rates and zero prices never imply that an operation
is free or chargeable.

Application-specific customer plans, measurements, rating decisions, charge
lines, settlement, and reporting are outside this module.
