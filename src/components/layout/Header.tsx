export function Header() {
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
      <button className="rounded-md border border-blue-300/40 px-3 py-1.5 text-sm hover:bg-white/10">
        Settings
      </button>
    </header>
  )
}
