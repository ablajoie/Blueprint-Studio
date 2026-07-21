import { useWorkspaceStore } from '../../store/workspaceStore'

const futureSections = [
  'Discovery',
  'Requirements',
  'Experience',
  'Security',
  'Documentation',
  'Review',
]

export function SolutionExplorer() {
  const blueprint = useWorkspaceStore((state) => state.blueprint)
  const selectedSolutionId = useWorkspaceStore((state) => state.selectedSolutionId)
  const activeView = useWorkspaceStore((state) => state.activeView)
  const openView = useWorkspaceStore((state) => state.openView)
  const selectSolution = useWorkspaceStore((state) => state.selectSolution)
  const selectArtifact = useWorkspaceStore((state) => state.selectArtifact)
  const selectedSolution = blueprint?.solutions.find(
    (solution) => solution.id === selectedSolutionId,
  )
  const objects = selectedSolution?.versions.at(-1)?.metadata.objects ?? []

  return (
    <aside
      className="overflow-auto border-r border-slate-200 bg-white p-4"
      aria-label="Solution Explorer"
    >
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
        Solution Explorer
      </p>
      {!blueprint ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3">
          <p className="text-sm font-medium">No project loaded</p>
          <p className="mt-1 text-xs text-slate-500">Your project structure will appear here.</p>
        </div>
      ) : (
        <>
          <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="truncate text-sm font-semibold text-slate-900">
              {blueprint.project.name}
            </p>
            <p className="mt-1 text-xs text-slate-500">{blueprint.solutions.length} solutions</p>
          </div>
          <nav aria-label="Project structure" className="space-y-1">
            <ExplorerButton
              label="Project overview"
              active={activeView === 'overview'}
              onClick={() => {
                openView('overview')
              }}
            />
            {blueprint.solutions.map((solution) => (
              <div key={solution.id} className="pt-2">
                <button
                  className={`w-full rounded-md px-3 py-2 text-left text-sm font-semibold ${
                    solution.id === selectedSolutionId
                      ? 'bg-blue-50 text-blue-900'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                  onClick={() => {
                    selectSolution(solution.id)
                  }}
                >
                  <span className="mr-2 text-blue-600">◇</span>
                  {solution.name}
                </button>
                {solution.id === selectedSolutionId ? (
                  <div className="ml-4 mt-1 border-l border-slate-200 pl-2">
                    <ExplorerButton
                      label="Overview"
                      active={activeView === 'start'}
                      onClick={() => {
                        openView('start')
                      }}
                    />
                    <ExplorerButton
                      label="Metadata"
                      active={activeView === 'metadata'}
                      onClick={() => {
                        openView('metadata')
                      }}
                    />
                    {objects.length ? (
                      <ul className="ml-3 border-l border-slate-100 py-1 pl-2">
                        {objects.map((object) => (
                          <li key={object.id}>
                            <button
                              className="w-full truncate rounded px-2 py-1 text-left text-xs text-slate-600 hover:bg-slate-50 hover:text-blue-800"
                              onClick={() => {
                                openView('metadata')
                                selectArtifact(object.id)
                              }}
                            >
                              {object.label}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {futureSections.map((section) => (
                      <div
                        key={section}
                        className="flex items-center justify-between px-3 py-1.5 text-xs text-slate-400"
                      >
                        <span>{section}</span>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase">
                          Soon
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </nav>
        </>
      )}
    </aside>
  )
}

function ExplorerButton({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      className={`w-full rounded-md px-3 py-1.5 text-left text-sm ${
        active ? 'bg-blue-100 font-medium text-blue-900' : 'text-slate-600 hover:bg-slate-50'
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  )
}
