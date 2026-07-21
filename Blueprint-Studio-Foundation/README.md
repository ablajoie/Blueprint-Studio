# Blueprint Studio

Blueprint Studio keeps Salesforce solution intent, metadata design, governance, security, and documentation together.

## Alpha goal

A Salesforce professional can create a project and solution, capture discovery notes, define objects and fields, model relationships, create a basic layout, review design health, and export a portable `.blueprint` file.

## Foundation contents

- Versioned `.blueprint` JSON Schema
- TypeScript domain model
- Commercial lending example project
- Product and architecture documentation
- Architecture Decision Records

## Repository structure

```text
docs/       Product and architecture decisions
schemas/    JSON Schema for portable Blueprint files
src/domain/ TypeScript domain contracts
examples/   Valid sample Blueprint projects
```

## Validate the example

Use any JSON Schema validator supporting Draft 2020-12. The example is designed to validate against `schemas/blueprint.schema.json`.

## Current focus

Version 0.1 deliberately prioritizes Projects, Solutions, Versions, Discovery, Objects, Fields, Relationships, Global Value Sets, basic Layouts, Requirements, Decisions, and configurable Health Rules.
