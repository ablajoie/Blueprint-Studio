import type { BlueprintFile, Project } from './blueprint'

export interface ProjectSummary {
  project: Project
  solutionCount: number
  objectCount: number
  fieldCount: number
}

export function summarizeProject(blueprint: BlueprintFile): ProjectSummary {
  return blueprint.solutions.reduce<ProjectSummary>(
    (summary, solution) => {
      const version = solution.versions.at(-1)
      summary.objectCount += version?.metadata.objects.length ?? 0
      summary.fieldCount += version?.metadata.fields.length ?? 0
      return summary
    },
    {
      project: blueprint.project,
      solutionCount: blueprint.solutions.length,
      objectCount: 0,
      fieldCount: 0,
    },
  )
}
