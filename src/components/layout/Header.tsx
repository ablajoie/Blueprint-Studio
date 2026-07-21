import { useWorkspaceStore } from '../../store/workspaceStore'

export function Header() {
  const projectName = useWorkspaceStore((state) => state.blueprint?.project.name)
  const status = useWorkspaceStore((state) => state.status)
  const openView = useWorkspaceStore((state) => state.openView)

  return (
    <header className="flex items-center justify-between border-b border-blue-950 bg-[#032d60] px-6 text-white">
      <div className="flex items-center gap-3">
        <div className="grid size-9 place-items-center rounded-lg bg-sky-400 font-bold text-blue-950">
          B
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">Blueprint Studio</p>
          <p className="text-xs text-blue-200">Salesforce solution design workspace</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {projectName ? <span className="text-sm text-blue-100">{projectName}</span> : null}
        {status === 'saving' ? (
          <span className="flex items-center gap-2 text-xs text-blue-200" role="status">
            <span className="size-2 animate-pulse rounded-full bg-sky-300" /> Saving
          </span>
        ) : null}
        <button
          className="rounded-md border border-blue-300/40 px-3 py-1.5 text-sm hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => {
            openView('overview')
          }}
          disabled={!projectName}
        >
          Project overview
        </button>
      </div>
    </header>
  )
}
