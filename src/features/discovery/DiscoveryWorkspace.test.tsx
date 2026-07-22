import { act, fireEvent, render, screen } from '@testing-library/react'
import { addSolution, createBlueprint } from '../../domain/blueprintFactory'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { DiscoveryWorkspace } from './DiscoveryWorkspace'

describe('DiscoveryWorkspace', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('autosaves sanitized workshop notes after the user pauses', async () => {
    const project = createBlueprint({ name: 'Lending', description: '', clouds: [] })
    const result = addSolution(project, { name: 'Core model', description: '' })
    const solution = result.blueprint.solutions[0]
    expect(solution).toBeDefined()
    if (!solution) return
    const updateDiscovery = vi.fn().mockResolvedValue(undefined)
    useWorkspaceStore.setState({ status: 'ready', errorMessage: null, updateDiscovery })

    render(
      <DiscoveryWorkspace
        solution={solution}
        settings={result.blueprint.settings}
        onConfigureSections={vi.fn()}
      />,
    )
    const editor = screen.getByLabelText('Overview discovery section')
    editor.innerHTML = '<h2>Problem</h2><p onclick="bad()">Manual lending process</p>'
    fireEvent.input(editor)
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(800)
    })

    expect(updateDiscovery).toHaveBeenCalledWith(
      expect.objectContaining({
        'discovery-overview': '<h2>Problem</h2><p>Manual lending process</p>',
      }),
    )
    expect(screen.getByText('Saved locally')).toBeInTheDocument()
  })

  it('applies toolbar formatting to the current selection', () => {
    const project = createBlueprint({ name: 'Lending', description: '', clouds: [] })
    const result = addSolution(project, { name: 'Core model', description: '' })
    const solution = result.blueprint.solutions[0]
    expect(solution).toBeDefined()
    if (!solution) return
    useWorkspaceStore.setState({
      status: 'ready',
      errorMessage: null,
      updateDiscovery: vi.fn().mockResolvedValue(undefined),
    })

    render(
      <DiscoveryWorkspace
        solution={solution}
        settings={result.blueprint.settings}
        onConfigureSections={vi.fn()}
      />,
    )
    const editor = screen.getByLabelText('Overview discovery section')
    editor.innerHTML = '<p>Workshop notes</p>'
    const text = editor.querySelector('p')?.firstChild
    expect(text).not.toBeNull()
    if (!text) return
    const range = document.createRange()
    range.setStart(text, 0)
    range.setEnd(text, 8)
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
    fireEvent.mouseUp(editor)

    fireEvent.click(screen.getByRole('button', { name: 'Bold' }))

    expect(editor.innerHTML).toBe('<p><strong>Workshop</strong> notes</p>')
  })

  it('indents and outdents list items with Tab and Shift+Tab', () => {
    const project = createBlueprint({ name: 'Lending', description: '', clouds: [] })
    const result = addSolution(project, { name: 'Core model', description: '' })
    const solution = result.blueprint.solutions[0]
    expect(solution).toBeDefined()
    if (!solution) return
    useWorkspaceStore.setState({
      status: 'ready',
      errorMessage: null,
      updateDiscovery: vi.fn().mockResolvedValue(undefined),
    })

    render(
      <DiscoveryWorkspace
        solution={solution}
        settings={result.blueprint.settings}
        onConfigureSections={vi.fn()}
      />,
    )
    const editor = screen.getByLabelText('Overview discovery section')
    editor.innerHTML = '<ul><li>Parent</li><li>Child</li></ul>'
    const childText = editor.querySelectorAll('li')[1]?.firstChild
    expect(childText).not.toBeNull()
    if (!childText) return
    const range = document.createRange()
    range.setStart(childText, 2)
    range.collapse(true)
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)

    fireEvent.keyDown(editor, { key: 'Tab' })
    expect(editor.innerHTML).toBe('<ul><li>Parent<ul><li>Child</li></ul></li></ul>')

    fireEvent.keyDown(editor, { key: 'Tab', shiftKey: true })
    expect(editor.innerHTML).toBe('<ul><li>Parent</li><li>Child</li></ul>')
  })

  it('orders table, image, and link tools as requested', () => {
    const project = createBlueprint({ name: 'Lending', description: '', clouds: [] })
    const result = addSolution(project, { name: 'Core model', description: '' })
    const solution = result.blueprint.solutions[0]
    expect(solution).toBeDefined()
    if (!solution) return
    useWorkspaceStore.setState({ status: 'ready', errorMessage: null })

    render(
      <DiscoveryWorkspace
        solution={solution}
        settings={result.blueprint.settings}
        onConfigureSections={vi.fn()}
      />,
    )
    const toolbar = screen.getByRole('toolbar', { name: 'Discovery formatting' })
    const labels = Array.from(toolbar.querySelectorAll('button')).map((button) =>
      button.getAttribute('aria-label'),
    )

    expect(labels.indexOf('Insert table')).toBeLessThan(labels.indexOf('Insert image'))
    expect(labels.indexOf('Insert image')).toBeLessThan(labels.indexOf('Add link'))
    expect(screen.getByRole('button', { name: 'Underline' })).toBeInTheDocument()
  })
})
