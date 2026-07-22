# Architecture

## Style

Blueprint Studio is a local-first browser application with a metadata-driven domain model.

```text
Salesforce Metadata API (future)
          |
      Import Adapter
          |
Blueprint Domain Model
     /           \
User Interface   Portable .blueprint file
```

Importers, exporters, health checks, documentation generators, and UI workspaces operate against the Blueprint domain model rather than Salesforce API responses directly.

## Initial technology direction

- React
- TypeScript
- Vite
- IndexedDB through Dexie
- Zustand for lightweight application state
- JSON Schema for portable file validation

## Application shell

```text
Solution Explorer | Main Workspace | Inspector
```

The selected artifact controls the main workspace and inspector while preserving context.

## Versioning

Projects contain solutions. Solutions contain one or more immutable-or-draft design versions. Stable UUIDs persist across copied versions so comparisons can identify added, removed, and changed artifacts.

## Discovery documents

Each project owns an ordered Discovery section template while each solution version owns the content entered in those sections. This keeps reusable guidance at the project level and solution-specific personas, questions, requirements, security notes, risks, and scope boundaries with the design they describe.

The editor stores sanitized semantic HTML in a versioned section map and autosaves it with the local project. Legacy single-document HTML is preserved in the first visible section. Embedded raster images are size-limited and stored as data URLs for the local-first alpha; portable export can migrate them into packaged assets without changing the Discovery document boundary.
