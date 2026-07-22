import { useState } from 'react'
import { DeleteConfirmationDialog } from '../../components/ui/DeleteConfirmationDialog'
import type { BlueprintFile, Solution } from '../../domain/blueprint'
import { getProjectDeleteImpact, getSolutionDeleteImpact } from '../../domain/blueprintLifecycle'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { DiscoveryWorkspace } from '../discovery/DiscoveryWorkspace'
import { CreateObjectDialog } from '../metadata/CreateObjectDialog'
import { MetadataWorkspace } from '../metadata/MetadataWorkspace'
import { CreateProjectDialog, ProjectDialog } from '../projects/CreateProjectDialog'
import { ProjectLibrary } from '../projects/ProjectLibrary'
import { CreateSolutionDialog, SolutionDialog } from '../solutions/CreateSolutionDialog'

type OpenDialog =
  | {
      kind:
        'project-create' | 'project-edit' | 'project-delete' | 'solution-create' | 'object-create'
    }
  | { kind: 'solution-edit' | 'solution-delete'; solutionId: string }
  | null

export function WorkspaceHome() {
  const status = useWorkspaceStore((state) => state.status)
  const blueprint = useWorkspaceStore((state) => state.blueprint)
  const selectedSolutionId = useWorkspaceStore((state) => state.selectedSolutionId)
  const activeView = useWorkspaceStore((state) => state.activeView)
  const errorMessage = useWorkspaceStore((state) => state.errorMessage)
  const clearError = useWorkspaceStore((state) => state.clearError)
  const deleteProject = useWorkspaceStore((state) => state.deleteProject)
  const deleteSolution = useWorkspaceStore((state) => state.deleteSolution)
  const duplicateSolution = useWorkspaceStore((state) => state.duplicateSolution)
  const setSolutionArchived = useWorkspaceStore((state) => state.setSolutionArchived)
  const [dialog, setDialog] = useState<OpenDialog>(null)
  const selectedSolution = blueprint?.solutions.find(
    (solution) => solution.id === selectedSolutionId,
  )
  const editedSolution =
    dialog?.kind === 'solution-edit'
      ? blueprint?.solutions.find((solution) => solution.id === dialog.solutionId)
      : undefined

  if (status === 'idle' || status === 'loading') return <LoadingWorkspace />

  return (
    <>
      {errorMessage ? (
        <div
          className="mx-8 mt-6 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          <span>{errorMessage}</span>
          <button className="font-semibold hover:underline" onClick={clearError}>
            Dismiss
          </button>
        </div>
      ) : null}

      {activeView === 'projects' || !blueprint ? (
        <ProjectLibrary
          onCreateProject={() => {
            setDialog({ kind: 'project-create' })
          }}
        />
      ) : activeView === 'metadata' && selectedSolution ? (
        <MetadataWorkspace
          solution={selectedSolution}
          onCreateObject={() => {
            setDialog({ kind: 'object-create' })
          }}
        />
      ) : activeView === 'discovery' && selectedSolution ? (
        <DiscoveryWorkspace
          key={`${selectedSolution.id}:${selectedSolution.versions.at(-1)?.id ?? 'empty'}`}
          solution={selectedSolution}
        />
      ) : activeView === 'start' && selectedSolution ? (
        <SolutionStart
          solution={selectedSolution}
          onEdit={() => {
            setDialog({ kind: 'solution-edit', solutionId: selectedSolution.id })
          }}
          onDuplicate={() => {
            void duplicateSolution(selectedSolution.id)
          }}
          onArchive={(archived) => {
            void setSolutionArchived(selectedSolution.id, archived)
          }}
          onDelete={() => {
            setDialog({ kind: 'solution-delete', solutionId: selectedSolution.id })
          }}
        />
      ) : (
        <ProjectDashboard
          blueprint={blueprint}
          onCreateSolution={() => {
            setDialog({ kind: 'solution-create' })
          }}
          onEditProject={() => {
            setDialog({ kind: 'project-edit' })
          }}
          onDeleteProject={() => {
            setDialog({ kind: 'project-delete' })
          }}
          onEditSolution={(solutionId) => {
            setDialog({ kind: 'solution-edit', solutionId })
          }}
          onDuplicateSolution={(solutionId) => {
            void duplicateSolution(solutionId)
          }}
          onArchiveSolution={(solutionId, archived) => {
            void setSolutionArchived(solutionId, archived)
          }}
          onDeleteSolution={(solutionId) => {
            setDialog({ kind: 'solution-delete', solutionId })
          }}
        />
      )}

      {dialog?.kind === 'project-create' ? (
        <CreateProjectDialog
          onClose={() => {
            setDialog(null)
          }}
        />
      ) : null}
      {dialog?.kind === 'project-edit' && blueprint ? (
        <ProjectDialog
          project={blueprint.project}
          onClose={() => {
            setDialog(null)
          }}
        />
      ) : null}
      {dialog?.kind === 'project-delete' && blueprint ? (
        <DeleteConfirmationDialog
          title={`Delete ${blueprint.project.name}?`}
          description="This permanently removes the project from this browser and cannot be undone."
          itemName={blueprint.project.name}
          {...getProjectDeleteImpact(blueprint)}
          requireName
          confirmLabel="Delete project"
          busy={status === 'saving'}
          errorMessage={errorMessage}
          onConfirm={async () => {
            await deleteProject()
            if (useWorkspaceStore.getState().status === 'ready') setDialog(null)
          }}
          onClose={() => {
            setDialog(null)
          }}
        />
      ) : null}
      {dialog?.kind === 'solution-create' ? (
        <CreateSolutionDialog
          onClose={() => {
            setDialog(null)
          }}
        />
      ) : null}
      {dialog?.kind === 'solution-edit' && editedSolution ? (
        <SolutionDialog
          solution={editedSolution}
          onClose={() => {
            setDialog(null)
          }}
        />
      ) : null}
      {dialog?.kind === 'solution-delete' && blueprint ? (
        <SolutionDeleteDialog
          blueprint={blueprint}
          solutionId={dialog.solutionId}
          busy={status === 'saving'}
          errorMessage={errorMessage}
          onConfirm={deleteSolution}
          onClose={() => {
            setDialog(null)
          }}
        />
      ) : null}
      {dialog?.kind === 'object-create' ? (
        <CreateObjectDialog
          onClose={() => {
            setDialog(null)
          }}
        />
      ) : null}
    </>
  )
}

function LoadingWorkspace() {
  return (
    <section className="grid min-h-full place-items-center p-8" aria-label="Loading project">
      <div className="text-center">
        <div className="mx-auto size-9 animate-spin rounded-full border-4 border-blue-100 border-t-blue-700" />
        <p className="mt-4 text-sm text-slate-600">Opening your workspace…</p>
      </div>
    </section>
  )
}

function ProjectDashboard({
  blueprint,
  onCreateSolution,
  onEditProject,
  onDeleteProject,
  onEditSolution,
  onDuplicateSolution,
  onArchiveSolution,
  onDeleteSolution,
}: {
  blueprint: BlueprintFile
  onCreateSolution: () => void
  onEditProject: () => void
  onDeleteProject: () => void
  onEditSolution: (solutionId: string) => void
  onDuplicateSolution: (solutionId: string) => void
  onArchiveSolution: (solutionId: string, archived: boolean) => void
  onDeleteSolution: (solutionId: string) => void
}) {
  const selectSolution = useWorkspaceStore((state) => state.selectSolution)
  const openView = useWorkspaceStore((state) => state.openView)
  const status = useWorkspaceStore((state) => state.status)
  const busy = status === 'saving'
  const totals = blueprint.solutions.reduce(
    (counts, solution) => {
      const version = solution.versions.at(-1)
      counts.objects += version?.metadata.objects.length ?? 0
      counts.fields += version?.metadata.fields.length ?? 0
      return counts
    },
    { objects: 0, fields: 0 },
  )

  const openSolution = (id: string) => {
    selectSolution(id)
    openView('start')
  }

  return (
    <section className="mx-auto max-w-6xl p-8">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="text-sm font-semibold text-blue-700">Project overview</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
            {blueprint.project.name}
          </h1>
          <p className="mt-3 max-w-3xl text-slate-600">
            {blueprint.project.description ||
              'Add a description to preserve the project’s purpose.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="button-secondary" onClick={onEditProject} disabled={busy}>
            Edit details
          </button>
          <button
            className="rounded-lg px-3 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
            onClick={onDeleteProject}
            disabled={busy}
          >
            Delete project
          </button>
          <button className="button-primary" onClick={onCreateSolution} disabled={busy}>
            New Solution
          </button>
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-1 gap-6 rounded-xl border border-slate-200 bg-white px-6 py-5 text-sm shadow-sm xl:grid-cols-[10rem_1fr_12rem]">
        <ProjectDetail label="Status" value={blueprint.project.status} capitalize />
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Salesforce clouds
          </dt>
          <dd className="mt-2 flex flex-wrap gap-2">
            {blueprint.project.clouds.length ? (
              blueprint.project.clouds.map((cloud) => (
                <span
                  key={cloud}
                  className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800"
                >
                  {cloud}
                </span>
              ))
            ) : (
              <span className="text-slate-500">Not selected</span>
            )}
          </dd>
        </div>
        <ProjectDetail
          label="Last updated"
          value={new Date(blueprint.project.updatedAt).toLocaleDateString()}
        />
      </dl>

      <div className="mt-6 grid grid-cols-4 gap-4">
        <StatCard label="Solutions" value={blueprint.solutions.length} />
        <StatCard label="Objects" value={totals.objects} />
        <StatCard label="Fields" value={totals.fields} />
        <StatCard label="Readiness" value="Not scored" subdued />
      </div>

      <div className="mt-8 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="font-semibold text-slate-950">Solutions</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Capabilities being designed in this project.
            </p>
          </div>
        </div>
        {blueprint.solutions.length ? (
          <ul className="divide-y divide-slate-100">
            {blueprint.solutions.map((solution) => {
              const version = solution.versions.at(-1)
              const archived = version?.status === 'archived'
              return (
                <li key={solution.id} className="flex flex-wrap items-center gap-3 px-6 py-4">
                  <button
                    className="flex min-w-0 flex-1 items-center justify-between rounded-lg p-2 text-left hover:bg-slate-50"
                    onClick={() => {
                      openSolution(solution.id)
                    }}
                  >
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 font-semibold text-slate-900">
                        <span className="truncate">{solution.name}</span>
                        {archived ? (
                          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-600">
                            Archived
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-1 block text-sm text-slate-500">
                        Version {version?.number} · {version?.status}
                      </span>
                    </span>
                    <span className="text-sm font-semibold text-blue-700">Open →</span>
                  </button>
                  <div className="flex shrink-0 flex-wrap items-center gap-1 text-xs font-semibold">
                    <SolutionAction
                      label="Edit"
                      onClick={() => {
                        onEditSolution(solution.id)
                      }}
                      busy={busy}
                    />
                    <SolutionAction
                      label="Duplicate"
                      onClick={() => {
                        onDuplicateSolution(solution.id)
                      }}
                      busy={busy}
                    />
                    <SolutionAction
                      label={archived ? 'Restore' : 'Archive'}
                      onClick={() => {
                        onArchiveSolution(solution.id, !archived)
                      }}
                      busy={busy}
                    />
                    <SolutionAction
                      label="Delete"
                      onClick={() => {
                        onDeleteSolution(solution.id)
                      }}
                      busy={busy}
                      danger
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="px-6 py-12 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-xl bg-blue-50 text-xl text-blue-700">
              ◇
            </div>
            <h2 className="mt-4 text-lg font-semibold">Let’s create your first solution</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
              A solution keeps discovery, metadata, security, and documentation connected around one
              business capability.
            </p>
            <button className="button-primary mt-5" onClick={onCreateSolution}>
              New Solution
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

function SolutionStart({
  solution,
  onEdit,
  onDuplicate,
  onArchive,
  onDelete,
}: {
  solution: Solution
  onEdit: () => void
  onDuplicate: () => void
  onArchive: (archived: boolean) => void
  onDelete: () => void
}) {
  const openView = useWorkspaceStore((state) => state.openView)
  const status = useWorkspaceStore((state) => state.status)
  const version = solution.versions.at(-1)
  const archived = version?.status === 'archived'
  const busy = status === 'saving'

  return (
    <section className="mx-auto max-w-5xl p-8">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="text-sm font-semibold text-blue-700">Solution overview</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{solution.name}</h1>
          <p className="mt-3 max-w-3xl text-slate-600">
            {solution.description ||
              'Add a description to preserve this solution’s intended outcome.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="button-secondary" onClick={onEdit} disabled={busy}>
            Edit details
          </button>
          <button className="button-secondary" onClick={onDuplicate} disabled={busy}>
            Duplicate
          </button>
          <button
            className="button-secondary"
            onClick={() => {
              onArchive(!archived)
            }}
            disabled={busy}
          >
            {archived ? 'Restore' : 'Archive'}
          </button>
          <button
            className="rounded-lg px-3 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
            onClick={onDelete}
            disabled={busy}
          >
            Delete
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-4 gap-4">
        <StatCard label="Version" value={version?.number ?? '—'} />
        <StatCard label="Status" value={version?.status ?? 'Unknown'} />
        <StatCard label="Objects" value={version?.metadata.objects.length ?? 0} />
        <StatCard label="Fields" value={version?.metadata.fields.length ?? 0} />
      </div>

      <h2 className="mt-9 text-xl font-semibold text-slate-950">Continue designing</h2>
      <p className="mt-2 text-slate-600">
        Choose the path that matches where your thinking is today. Nothing is locked in.
      </p>
      <div className="mt-6 grid grid-cols-2 gap-5">
        <button
          className="group rounded-xl border border-blue-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md"
          onClick={() => {
            openView('metadata')
          }}
        >
          <span className="grid size-11 place-items-center rounded-lg bg-blue-100 text-xl text-blue-800">
            ▦
          </span>
          <span className="mt-5 block text-lg font-semibold text-slate-950">
            Start with Metadata
          </span>
          <span className="mt-2 block text-sm leading-6 text-slate-600">
            Create the objects that shape this solution, then add fields and relationships as the
            design grows.
          </span>
          <span className="mt-5 block text-sm font-semibold text-blue-700">Open Metadata →</span>
        </button>
        <button
          className="group rounded-xl border border-blue-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md"
          onClick={() => {
            openView('discovery')
          }}
        >
          <span className="grid size-11 place-items-center rounded-lg bg-blue-100 text-xl text-blue-800">
            ¶
          </span>
          <span className="mt-5 block text-lg font-semibold text-slate-950">
            Start with Discovery Notes
          </span>
          <span className="mt-2 block text-sm leading-6 text-slate-600">
            Capture workshop notes and shape them into design artifacts.
          </span>
          <span className="mt-5 block text-sm font-semibold text-blue-700">Open Discovery →</span>
        </button>
      </div>
    </section>
  )
}

function ProjectDetail({
  label,
  value,
  capitalize = false,
}: {
  label: string
  value: string
  capitalize?: boolean
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className={`mt-2 font-medium text-slate-800 ${capitalize ? 'capitalize' : ''}`}>
        {value}
      </dd>
    </div>
  )
}

function SolutionAction({
  label,
  onClick,
  busy,
  danger = false,
}: {
  label: string
  onClick: () => void
  busy: boolean
  danger?: boolean
}) {
  return (
    <button
      className={`rounded px-2 py-1.5 hover:bg-slate-100 disabled:opacity-50 ${danger ? 'text-red-700 hover:bg-red-50' : 'text-slate-600'}`}
      onClick={onClick}
      disabled={busy}
    >
      {label}
    </button>
  )
}

function SolutionDeleteDialog({
  blueprint,
  solutionId,
  busy,
  errorMessage,
  onConfirm,
  onClose,
}: {
  blueprint: BlueprintFile
  solutionId: string
  busy: boolean
  errorMessage: string | null
  onConfirm: (solutionId: string) => Promise<void>
  onClose: () => void
}) {
  const solution = blueprint.solutions.find((item) => item.id === solutionId)
  if (!solution) return null
  return (
    <DeleteConfirmationDialog
      title={`Delete ${solution.name}?`}
      description="This permanently removes the solution and every design version it contains."
      itemName={solution.name}
      {...getSolutionDeleteImpact(blueprint, solutionId)}
      confirmLabel="Delete solution"
      busy={busy}
      errorMessage={errorMessage}
      onConfirm={async () => {
        await onConfirm(solutionId)
        if (useWorkspaceStore.getState().status === 'ready') onClose()
      }}
      onClose={onClose}
    />
  )
}

function StatCard({
  label,
  value,
  subdued = false,
}: {
  label: string
  value: number | string
  subdued?: boolean
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${subdued ? 'text-slate-500' : 'text-slate-950'}`}>
        {value}
      </p>
    </div>
  )
}
