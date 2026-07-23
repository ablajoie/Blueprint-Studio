# Blueprint Studio

Blueprint Studio keeps Business [Salesforce] solution intent, metadata design, governance, security, and documentation together.

## Alpha goal

A Salesforce professional / Business Analyst / Solution Architect can create a project and solution, capture discovery notes, define objects and fields, model relationships, create a basic layout, review design health, and export a portable `.blueprint` file.

## Application foundation

The repository includes a production-oriented React application with strict TypeScript, Vite, Tailwind CSS, React Router, Zustand, Dexie, ESLint, Prettier, and Vitest. The current walking skeleton includes a local project library and switcher; project, solution, object, and field lifecycle management; a sectioned rich-text Discovery workspace with project templates and local autosave; relationship design; table and schema views of the data model; global value sets; dependent picklist mappings; connected metadata checks; and dependency-aware destructive actions. All changes persist locally and immediately update the Solution Explorer and contextual inspector.

### Local setup

Requirements: Node.js 20.19+ or 22.12+ and pnpm 11+.

```bash
git clone https://github.com/ablajoie/Blueprint-Studio.git
cd Blueprint-Studio
pnpm install
pnpm dev
```

Clone the repository once, then use that working folder for development. Future updates can be retrieved with `git pull`; downloading a new ZIP for every version is not recommended. Vite prints the local URL after startup.

On Windows systems where PowerShell blocks script wrappers, use `pnpm.cmd` in place of `pnpm` (for example, `pnpm.cmd dev`).

Project data is saved automatically in the browser on the current device. Before opening a pull request, run:

```bash
pnpm format:check
pnpm lint
pnpm test
pnpm build
pnpm validate:schema
```

### Available commands

| Command                | Purpose                                  |
| ---------------------- | ---------------------------------------- |
| `pnpm dev`             | Start the local development server       |
| `pnpm build`           | Type-check and create a production build |
| `pnpm lint`            | Run ESLint with zero warnings allowed    |
| `pnpm format`          | Format supported files with Prettier     |
| `pnpm format:check`    | Verify formatting without changing files |
| `pnpm validate:schema` | Validate the schema and example project  |
| `pnpm test`            | Run the Vitest suite once                |
| `pnpm test:watch`      | Run Vitest in watch mode                 |

## Foundation contents

- Versioned `.blueprint` JSON Schema
- TypeScript domain model
- Commercial lending example project
- Product and architecture documentation
- Brand foundation and reusable product mark
- Architecture Decision Records

## Repository structure

Product architecture and runtime code live together in a conventional repository layout. Business capabilities belong under `src/features/`; shared, domain-neutral UI belongs under `src/components/`.

```text
docs/                 Product direction, architecture, and ADRs
examples/             Valid sample Blueprint project files
schemas/              Portable `.blueprint` JSON Schema
src/
  app/                 Application composition and routing
  components/          Shared UI building blocks
  domain/              Framework-independent domain contracts
  features/            Business-capability modules
  persistence/         Local-first storage adapters
  store/               Cross-cutting client state
  styles/              Global styles and design-system entry point
  test/                Shared test configuration
index.html             Browser entry point
package.json           Dependencies and development commands
```

## Validate the example

Run `pnpm validate:schema` to validate the example project against `schemas/blueprint.schema.json` using JSON Schema Draft 2020-12.

## Current capabilities

Version 0.1 currently supports Projects, Solutions, configurable sectioned Discovery notes, Objects, Fields, Relationships, Global Value Sets, dependent picklists, and clickable schema visualization. The next vertical slices add basic Layouts, Requirements, Decisions, and configurable Health Rules.
