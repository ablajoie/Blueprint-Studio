import { addSolution, createBlueprint } from './blueprintFactory'
import {
  createDefaultDiscoverySections,
  readDiscoverySectionContent,
  resolveDiscoverySections,
  updateDiscoverySectionSettings,
} from './discoveryTemplate'

describe('Discovery section templates', () => {
  it('creates a practical ordered project template and starter tables', () => {
    const blueprint = createBlueprint({ name: 'Lending', description: '', clouds: [] })
    const definitions = resolveDiscoverySections(blueprint.settings)
    const result = addSolution(blueprint, { name: 'Origination', description: '' })
    const document = result.blueprint.solutions[0]?.versions[0]?.discovery

    expect(definitions.map((section) => section.title)).toEqual([
      'Overview',
      'Personas',
      'Workflow',
      'Data',
      'Requirements',
      'Security',
      'Risks & Dependencies',
      'Questions',
      'Out of Scope',
    ])
    expect(document?.format).toBe('json-rich-text')
    if (!document) return
    expect(readDiscoverySectionContent(document, definitions)['discovery-questions']).toContain(
      '<th>Question</th>',
    )
  })

  it('preserves legacy notes in the first visible section', () => {
    const definitions = createDefaultDiscoverySections()
    const content = readDiscoverySectionContent(
      { format: 'html', content: '<p>Existing workshop notes</p>', assetIds: [] },
      definitions,
    )

    expect(content['discovery-overview']).toBe('<p>Existing workshop notes</p>')
    expect(content['discovery-requirements']).toContain('<table>')
  })

  it('saves project-level order, visibility, and help text', () => {
    const blueprint = createBlueprint({ name: 'Lending', description: '', clouds: [] })
    const sections = createDefaultDiscoverySections()
    const questions = sections.find((section) => section.id === 'discovery-questions')
    expect(questions).toBeDefined()
    if (!questions) return
    questions.enabled = false
    questions.description = 'Updated help text'
    const reordered = [questions, ...sections.filter((section) => section.id !== questions.id)]

    const updated = updateDiscoverySectionSettings(blueprint, reordered)

    expect(updated.settings.discoverySections?.[0]).toMatchObject({
      id: 'discovery-questions',
      enabled: false,
      description: 'Updated help text',
    })
  })
})
