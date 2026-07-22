# Domain Model

```text
Project
  -> Solution
      -> Solution Version
          -> Discovery Document
          -> Requirements
          -> Metadata
              -> Objects
                  -> Fields
              -> Relationships
              -> Global Value Sets
              -> Picklist Dependencies
              -> Custom Labels
              -> Custom Metadata Types
          -> Experience
              -> Layouts
                  -> Sections
                      -> Layout Items
          -> Security
          -> Decisions
          -> Health Rule Overrides
```

## Core rules

- A Field belongs to exactly one Object.
- A Relationship is implemented by exactly one relationship Field on its child Object.
- A picklist may own local values or reference one Global Value Set, but never both.
- A dependent picklist references a controlling checkbox or picklist on the same Object.
- Internal relationships use stable UUIDs rather than labels or API names.
- Salesforce metadata and Blueprint governance information coexist but remain distinguishable.
- Health results are calculated and are not authoritative stored design data.
- Unknown extension data is preserved where possible.
- Naming strategy is a project setting: Salesforce-first, business-first, or hybrid.
