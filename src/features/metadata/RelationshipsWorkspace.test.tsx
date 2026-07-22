import { fireEvent, render, screen } from '@testing-library/react'
import { addObject, addSolution, createBlueprint } from '../../domain/blueprintFactory'
import { addRelationship } from '../../domain/connectedMetadata'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { RelationshipsWorkspace } from './ConnectedMetadataWorkspaces'

describe('relationships workspace', () => {
  it('explains field-backed relationships and opens the underlying field', () => {
    let blueprint = createBlueprint({ name: 'Lending', description: '', clouds: [] })
    const solutionResult = addSolution(blueprint, { name: 'Core model', description: '' })
    blueprint = solutionResult.blueprint
    const accountResult = addObject(blueprint, solutionResult.solutionId, {
      label: 'Account',
      pluralLabel: 'Accounts',
      apiName: 'Account',
      kind: 'standard',
      description: '',
    })
    blueprint = accountResult.blueprint
    const facilityResult = addObject(blueprint, solutionResult.solutionId, {
      label: 'Facility',
      pluralLabel: 'Facilities',
      apiName: 'Facility__c',
      kind: 'custom',
      description: '',
    })
    blueprint = facilityResult.blueprint
    const relationshipResult = addRelationship(blueprint, solutionResult.solutionId, {
      childObjectId: facilityResult.objectId,
      parentObjectId: accountResult.objectId,
      type: 'lookup',
      fieldLabel: 'Borrower',
      fieldApiName: 'Borrower__c',
      relationshipName: 'Borrower',
      description: '',
      required: false,
    })
    blueprint = relationshipResult.blueprint
    const solution = blueprint.solutions.find((item) => item.id === solutionResult.solutionId)
    expect(solution).toBeDefined()
    if (!solution) return

    useWorkspaceStore.setState({
      blueprint,
      selectedSolutionId: solution.id,
      selectedObjectId: null,
      selectedArtifactId: null,
      activeView: 'metadata',
      metadataSection: 'relationships',
      status: 'ready',
      errorMessage: null,
    })

    render(<RelationshipsWorkspace solution={solution} />)

    expect(screen.getByText('Relationships are fields.')).toBeInTheDocument()
    expect(screen.getByText(/Junction objects are modeled as custom objects/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Open field' }))

    expect(useWorkspaceStore.getState()).toMatchObject({
      metadataSection: 'objects',
      selectedObjectId: facilityResult.objectId,
      selectedArtifactId: relationshipResult.fieldId,
    })
  })
})
