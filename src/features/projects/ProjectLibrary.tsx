import { useEffect, useState } from 'react'
import { BrandMark } from '../../components/brand/BrandMark'
import { DeleteConfirmationDialog } from '../../components/ui/DeleteConfirmationDialog'
import type { ProjectSummary } from '../../domain/projectSummary'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { ProjectDialog } from './CreateProjectDialog'

export function ProjectLibrary({ onCreateProject }: { onCreateProject: () => void }) {
  const projects = useWorkspaceStore((state) => state.projects)
  const currentProjectId = useWorkspaceStore((state) => state.blueprint?.project.id)
  const status = useWorkspaceStore((state) => state.status)
  const errorMessage = useWorkspaceStore((state) => state.errorMessage)
  const refreshProjects = useWorkspaceStore((state) => state.refreshProjects)
  const openProject = useWorkspaceStore((state) => state.openProject)
  const updateStoredProject = useWorkspaceStore((state) => state.updateStoredProject)
  const deleteProject = useWorkspaceStore((state) => state.deleteProject)
  const [editing, setEditing] = useState<ProjectSummary | null>(null)
  const [deleting, setDeleting] = useState<ProjectSummary | null>(null)
  const busy = status === 'saving' || status === 'loading'

  useEffect(() => {
    void refreshProjects()
  }, [refreshProjects])

  return (
    <section className="mx-auto max-w-6xl p-8">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-sm font-semibold text-blue-700">Your workspace</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Projects</h1>
          <p className="mt-3 max-w-2xl text-slate-600">
            Open an existing Salesforce initiative or give a new one a clear home.
          </p>
        </div>
        {projects.length ? (
          <button className="button-primary" onClick={onCreateProject} disabled={busy}>
            New Project
          </button>
        ) : null}
      </div>

      {projects.length ? (
        <div className="mt-8 grid gap-5 xl:grid-cols-2">
          {projects.map((summary) => {
            const isCurrent = summary.project.id === currentProjectId
            return (
              <article
                key={summary.project.id}
                className={`rounded-xl border bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                  isCurrent ? 'border-blue-300 ring-2 ring-blue-100' : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-lg font-semibold text-slate-950">
                        {summary.project.name}
                      </h2>
                      {isCurrent ? (
                        <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-blue-800">
                          Open
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-slate-600">
                      {summary.project.description || 'No project description added yet.'}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize text-slate-600">
                    {summary.project.status}
                  </span>
                </div>

                <dl className="mt-5 grid grid-cols-3 gap-3 rounded-lg bg-slate-50 p-4 text-center">
                  <ProjectMetric label="Solutions" value={summary.solutionCount} />
                  <ProjectMetric label="Objects" value={summary.objectCount} />
                  <ProjectMetric label="Fields" value={summary.fieldCount} />
                </dl>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                  <p className="text-xs text-slate-500">
                    Updated {formatProjectDate(summary.project.updatedAt)}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      className="rounded px-2.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                      onClick={() => {
                        setEditing(summary)
                      }}
                      disabled={busy}
                    >
                      Edit
                    </button>
                    <button
                      className="rounded px-2.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                      onClick={() => {
                        setDeleting(summary)
                      }}
                      disabled={busy}
                    >
                      Delete
                    </button>
                    <button
                      className={isCurrent ? 'button-secondary' : 'button-primary'}
                      onClick={() => {
                        if (isCurrent) useWorkspaceStore.getState().openView('overview')
                        else void openProject(summary.project.id)
                      }}
                      disabled={busy}
                    >
                      {isCurrent ? 'Return to project' : 'Open project'}
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="mt-10 rounded-2xl border border-dashed border-blue-200 bg-white px-8 py-14 text-center shadow-sm">
          <BrandMark size="large" />
          <h2 className="mt-6 text-2xl font-semibold tracking-tight text-slate-950">
            Let’s create your first project
          </h2>
          <p className="mx-auto mt-3 max-w-lg leading-7 text-slate-600">
            Projects keep related solutions, metadata, and design decisions together without mixing
            separate initiatives.
          </p>
          <button className="button-primary mt-7" onClick={onCreateProject}>
            New Project
          </button>
          <p className="mt-4 text-xs text-slate-500">Your work is saved locally on this device.</p>
        </div>
      )}

      {editing ? (
        <ProjectDialog
          project={editing.project}
          onSave={(input) => updateStoredProject(editing.project.id, input)}
          onClose={() => {
            setEditing(null)
          }}
        />
      ) : null}
      {deleting ? (
        <DeleteConfirmationDialog
          title={`Delete ${deleting.project.name}?`}
          description="This permanently removes the project from this browser and cannot be undone."
          itemName={deleting.project.name}
          blockers={[]}
          consequences={projectConsequences(deleting)}
          requireName
          confirmLabel="Delete project"
          busy={status === 'saving'}
          errorMessage={errorMessage}
          onConfirm={async () => {
            await deleteProject(deleting.project.id)
            if (useWorkspaceStore.getState().status === 'ready') setDeleting(null)
          }}
          onClose={() => {
            setDeleting(null)
          }}
        />
      ) : null}
    </section>
  )
}

function ProjectMetric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 text-lg font-semibold text-slate-900">{value}</dd>
    </div>
  )
}

function formatProjectDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value))
}

function projectConsequences(summary: ProjectSummary) {
  return [
    [summary.solutionCount, 'solution'],
    [summary.objectCount, 'object'],
    [summary.fieldCount, 'field'],
  ]
    .filter(([count]) => Number(count) > 0)
    .map(([count, label]) => `${String(count)} ${String(label)}${count === 1 ? '' : 's'}`)
}
