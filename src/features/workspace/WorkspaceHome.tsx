import { useState } from 'react'
import type { BlueprintFile, Solution } from '../../domain/blueprint'
import { CreateObjectDialog } from '../metadata/CreateObjectDialog'
import { MetadataWorkspace } from '../metadata/MetadataWorkspace'
import { CreateProjectDialog } from '../projects/CreateProjectDialog'
import { CreateSolutionDialog } from '../solutions/CreateSolutionDialog'
import { useWorkspaceStore } from '../../store/workspaceStore'

type OpenDialog = 'project' | 'solution' | 'object' | null

export function WorkspaceHome() {
  const status = useWorkspaceStore((state) => state.status)
  const blueprint = useWorkspaceStore((state) => state.blueprint)
  const selectedSolutionId = useWorkspaceStore((state) => state.selectedSolutionId)
  const activeView = useWorkspaceStore((state) => state.activeView)
  const errorMessage = useWorkspaceStore((state) => state.errorMessage)
  const clearError = useWorkspaceStore((state) => state.clearError)
  const [dialog, setDialog] = useState<OpenDialog>(null)
  const selectedSolution = blueprint?.solutions.find(
    (solution) => solution.id === selectedSolutionId,
  )

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

      {!blueprint ? (
        <WelcomeWorkspace
          onCreateProject={() => {
            setDialog('project')
          }}
        />
      ) : activeView === 'metadata' && selectedSolution ? (
        <MetadataWorkspace
          solution={selectedSolution}
          onCreateObject={() => {
            setDialog('object')
          }}
        />
      ) : activeView === 'start' && selectedSolution ? (
        <SolutionStart solution={selectedSolution} />
      ) : (
        <ProjectDashboard
          blueprint={blueprint}
          onCreateSolution={() => {
            setDialog('solution')
          }}
        />
      )}

      {dialog === 'project' ? (
        <CreateProjectDialog
          onClose={() => {
            setDialog(null)
          }}
        />
      ) : null}
      {dialog === 'solution' ? (
        <CreateSolutionDialog
          onClose={() => {
            setDialog(null)
          }}
        />
      ) : null}
      {dialog === 'object' ? (
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

function WelcomeWorkspace({ onCreateProject }: { onCreateProject: () => void }) {
  return (
    <section className="grid min-h-full place-items-center p-8">
      <div className="max-w-lg text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-blue-100 text-2xl font-bold text-blue-900">
          B
        </div>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">Welcome to Blueprint Studio</h1>
        <p className="mt-3 leading-7 text-slate-600">
          Design Salesforce solutions with their intent, metadata, and documentation together.
        </p>
        <button className="button-primary mt-7" onClick={onCreateProject}>
          New Project
        </button>
        <p className="mt-4 text-xs text-slate-500">Your work is saved locally on this device.</p>
      </div>
    </section>
  )
}

function ProjectDashboard({
  blueprint,
  onCreateSolution,
}: {
  blueprint: BlueprintFile
  onCreateSolution: () => void
}) {
  const selectSolution = useWorkspaceStore((state) => state.selectSolution)
  const openView = useWorkspaceStore((state) => state.openView)
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
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-sm font-semibold text-blue-700">Project overview</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
            {blueprint.project.name}
          </h1>
          {blueprint.project.description ? (
            <p className="mt-3 max-w-3xl text-slate-600">{blueprint.project.description}</p>
          ) : null}
        </div>
        <button className="button-primary" onClick={onCreateSolution}>
          New Solution
        </button>
      </div>

      <div className="mt-8 grid grid-cols-4 gap-4">
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
              return (
                <li key={solution.id}>
                  <button
                    className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-slate-50"
                    onClick={() => {
                      openSolution(solution.id)
                    }}
                  >
                    <span>
                      <span className="block font-semibold text-slate-900">{solution.name}</span>
                      <span className="mt-1 block text-sm text-slate-500">
                        Version {version?.number} · {version?.status}
                      </span>
                    </span>
                    <span className="text-sm font-semibold text-blue-700">Open →</span>
                  </button>
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

function SolutionStart({ solution }: { solution: Solution }) {
  const openView = useWorkspaceStore((state) => state.openView)

  return (
    <section className="mx-auto max-w-5xl p-8">
      <p className="text-sm font-semibold text-blue-700">{solution.name}</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">How would you like to start?</h1>
      <p className="mt-3 text-slate-600">
        Choose the path that matches where your thinking is today. Nothing is locked in.
      </p>
      <div className="mt-8 grid grid-cols-2 gap-5">
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
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-left opacity-75">
          <span className="grid size-11 place-items-center rounded-lg bg-white text-xl text-slate-500">
            ¶
          </span>
          <span className="mt-5 block text-lg font-semibold text-slate-800">
            Start with Discovery Notes
          </span>
          <span className="mt-2 block text-sm leading-6 text-slate-500">
            Capture workshop notes and shape them into design artifacts.
          </span>
          <span className="mt-5 inline-flex rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600">
            Coming next
          </span>
        </div>
      </div>
    </section>
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
