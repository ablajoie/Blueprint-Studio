export function Inspector() {
  return (
    <aside className="overflow-auto border-l border-slate-200 bg-white p-5" aria-label="Inspector">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Inspector</p>
      <div className="mt-6 text-center">
        <div className="mx-auto grid size-10 place-items-center rounded-full bg-slate-100 text-slate-400">
          i
        </div>
        <p className="mt-3 text-sm font-medium">Nothing selected</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Select an item to view its properties.
        </p>
      </div>
    </aside>
  )
}
