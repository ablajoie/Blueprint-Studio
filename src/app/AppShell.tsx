import { Outlet } from 'react-router-dom'
import { Header } from '../components/layout/Header'
import { Inspector } from '../components/layout/Inspector'
import { SolutionExplorer } from '../components/layout/SolutionExplorer'

export function AppShell() {
  return (
    <div className="grid min-h-screen grid-rows-[4rem_1fr] bg-slate-50 text-slate-900">
      <Header />
      <div className="grid min-h-0 grid-cols-[17rem_minmax(0,1fr)_19rem]">
        <SolutionExplorer />
        <main className="min-w-0 overflow-auto" aria-label="Main workspace">
          <Outlet />
        </main>
        <Inspector />
      </div>
    </div>
  )
}
