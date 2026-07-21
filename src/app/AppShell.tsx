import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from '../components/layout/Header'
import { Inspector } from '../components/layout/Inspector'
import { SolutionExplorer } from '../components/layout/SolutionExplorer'
import { useWorkspaceStore } from '../store/workspaceStore'

export function AppShell() {
  const status = useWorkspaceStore((state) => state.status)
  const hydrate = useWorkspaceStore((state) => state.hydrate)
  const inspectorOpen = useWorkspaceStore((state) => {
    if (state.activeView !== 'metadata' || !state.selectedArtifactId) return false
    const solution = state.blueprint?.solutions.find(
      (candidate) => candidate.id === state.selectedSolutionId,
    )
    const version = solution?.versions.at(-1)
    return Boolean(
      version?.metadata.objects.some((object) => object.id === state.selectedArtifactId) ||
      version?.metadata.fields.some((field) => field.id === state.selectedArtifactId),
    )
  })

  useEffect(() => {
    if (status === 'idle') void hydrate()
  }, [hydrate, status])

  return (
    <div className="grid min-h-screen grid-rows-[4rem_1fr] bg-slate-50 text-slate-900">
      <Header />
      <div
        className={`grid min-h-0 ${
          inspectorOpen
            ? 'grid-cols-[17rem_minmax(0,1fr)_19rem]'
            : 'grid-cols-[17rem_minmax(0,1fr)]'
        }`}
      >
        <SolutionExplorer />
        <main className="min-w-0 overflow-auto" aria-label="Main workspace">
          <Outlet />
        </main>
        {inspectorOpen ? <Inspector /> : null}
      </div>
    </div>
  )
}
