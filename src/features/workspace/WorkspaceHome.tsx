export function WorkspaceHome() {
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
        <button className="mt-7 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-800">
          New Project
        </button>
      </div>
    </section>
  )
}
