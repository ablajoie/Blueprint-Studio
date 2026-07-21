import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './AppShell'
import { WorkspaceHome } from '../features/workspace/WorkspaceHome'

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/workspace" replace />} />
        <Route path="workspace" element={<WorkspaceHome />} />
      </Route>
    </Routes>
  )
}
