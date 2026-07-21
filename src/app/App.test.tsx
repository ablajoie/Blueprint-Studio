import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { App } from './App'

describe('App', () => {
  it('renders the application shell', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: 'Welcome to Blueprint Studio' })).toBeInTheDocument()
    expect(screen.getByLabelText('Solution Explorer')).toBeInTheDocument()
    expect(screen.getByLabelText('Inspector')).toBeInTheDocument()
  })
})
