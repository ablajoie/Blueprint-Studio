import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { App } from './App'
import { useWorkspaceStore } from '../store/workspaceStore'

describe('App', () => {
  it('renders the application shell', () => {
    useWorkspaceStore.setState({
      status: 'ready',
      blueprint: null,
      selectedSolutionId: null,
      selectedArtifactId: null,
      activeView: 'overview',
      errorMessage: null,
    })
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: 'Welcome to Blueprint Studio' })).toBeInTheDocument()
    expect(screen.getByLabelText('Solution Explorer')).toBeInTheDocument()
    expect(screen.getByLabelText('Inspector')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New Project' })).toBeEnabled()
  })
})
