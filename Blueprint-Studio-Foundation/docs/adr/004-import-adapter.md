# ADR-004: Salesforce Import as an Adapter

- Status: Accepted in principle; detailed import behavior deferred

## Decision

Salesforce import will translate org metadata into the Blueprint domain model. The rest of the application will not directly depend on Salesforce API response shapes.

## Deferred question

Whether imported metadata is editable directly, treated as a baseline, or forked into a proposed design version will be decided when the import workflow is designed.
