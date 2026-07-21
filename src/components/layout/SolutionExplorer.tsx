const groups = [
  'Overview',
  'Discovery',
  'Requirements',
  'Metadata',
  'Experience',
  'Security',
  'Documentation',
  'Review',
]

export function SolutionExplorer() {
  return (
    <aside
      className="overflow-auto border-r border-slate-200 bg-white p-4"
      aria-label="Solution Explorer"
    >
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
        Solution Explorer
      </p>
      <div className="mb-5 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3">
        <p className="text-sm font-medium">No project loaded</p>
        <p className="mt-1 text-xs text-slate-500">Your project structure will appear here.</p>
      </div>
      <nav aria-label="Solution sections">
        <ul className="space-y-1">
          {groups.map((group) => (
            <li key={group}>
              <button className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-600 hover:bg-blue-50 hover:text-blue-800">
                {group}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}
