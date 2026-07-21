# ADR-001: Portable Blueprint Project File

- Status: Accepted

## Decision

The portable `.blueprint` file is a versioned JSON document and the interoperable source of truth for a project.

## Consequences

- Projects can be backed up, shared, stored in OneDrive/SharePoint, or versioned in Git.
- Browser persistence is an editing convenience rather than a data trap.
- Schema migrations are required as the format evolves.
