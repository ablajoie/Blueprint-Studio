# ADR-003: Versioned Schema and Stable IDs

- Status: Accepted

## Decision

Every Blueprint file declares a semantic `schemaVersion`. Every persistent entity uses a UUID-style stable ID.

## Consequences

- Old files can be migrated.
- Solution versions can be compared reliably.
- Labels and Salesforce API names may change without breaking internal references.
