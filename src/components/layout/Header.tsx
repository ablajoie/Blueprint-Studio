import { BrandMark } from '../brand/BrandMark'
import { useWorkspaceStore } from '../../store/workspaceStore'

export function Header() {
  const project = useWorkspaceStore((state) => state.blueprint?.project)
  const projects = useWorkspaceStore((state) => state.projects)
  const status = useWorkspaceStore((state) => state.status)
  const openView = useWorkspaceStore((state) => state.openView)
  const openProject = useWorkspaceStore((state) => state.openProject)

  return (
    <header className="flex items-center justify-between border-b border-[#071a30] bg-[#0B2341] px-6 text-white">
      <div className="flex items-center gap-3">
        <BrandMark />
        <div>
          <p className="text-sm font-semibold leading-tight">Blueprint Studio</p>
          <p className="text-xs text-cyan-100/80">Salesforce solution design workspace</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {status === 'saving' ? (
          <span className="flex items-center gap-2 text-xs text-blue-200" role="status">
            <span className="size-2 animate-pulse rounded-full bg-sky-300" /> Saving
          </span>
        ) : null}
        <button
          className="rounded-md px-3 py-1.5 text-sm font-semibold text-blue-100 hover:bg-white/10"
          onClick={() => {
            openView('projects')
          }}
        >
          All projects
        </button>
        <select
          aria-label="Switch project"
          className="max-w-64 rounded-md border border-blue-300/40 bg-blue-950/30 px-3 py-1.5 text-sm text-white outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-300/30 disabled:opacity-50"
          value={project?.id ?? ''}
          onChange={(event) => {
            if (event.target.value) void openProject(event.target.value)
          }}
          disabled={!projects.length || status === 'saving' || status === 'loading'}
        >
          <option value="" disabled>
            Select a project
          </option>
          {projects.map((summary) => (
            <option key={summary.project.id} value={summary.project.id} className="text-slate-950">
              {summary.project.name}
            </option>
          ))}
        </select>
        <button
          className="rounded-md border border-blue-300/40 px-3 py-1.5 text-sm hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => {
            openView('overview')
          }}
          disabled={!project}
        >
          Project overview
        </button>
      </div>
    </header>
  )
}
