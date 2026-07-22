import { useState, type ReactNode } from 'react'
import { DeleteConfirmationDialog } from '../../components/ui/DeleteConfirmationDialog'
import type {
  GlobalValueSet,
  ObjectRelationship,
  Solution,
  SolutionVersion,
} from '../../domain/blueprint'
import {
  getGlobalValueSetDeleteDependencies,
  getRelationshipDeleteDependencies,
} from '../../domain/connectedMetadata'
import { getMetadataHealthIssues } from '../../domain/metadataHealth'
import { useWorkspaceStore, type MetadataSection } from '../../store/workspaceStore'
import { GlobalValueSetDialog } from './GlobalValueSetDialog'
import { RelationshipDialog } from './RelationshipDialog'

export function MetadataTabs({ active }: { active: MetadataSection }) {
  const showObjectList = useWorkspaceStore((state) => state.showObjectList)
  const showRelationships = useWorkspaceStore((state) => state.showRelationships)
  const showGlobalValueSets = useWorkspaceStore((state) => state.showGlobalValueSets)
  return (
    <nav className="mt-7 flex gap-6 border-b border-slate-200 text-sm font-semibold">
      <MetadataTab label="Objects" active={active === 'objects'} onClick={showObjectList} />
      <MetadataTab
        label="Relationships"
        active={active === 'relationships'}
        onClick={showRelationships}
      />
      <MetadataTab
        label="Global value sets"
        active={active === 'global-value-sets'}
        onClick={showGlobalValueSets}
      />
    </nav>
  )
}

export function RelationshipsWorkspace({ solution }: { solution: Solution }) {
  const blueprint = useWorkspaceStore((state) => state.blueprint)
  const selectedArtifactId = useWorkspaceStore((state) => state.selectedArtifactId)
  const selectArtifact = useWorkspaceStore((state) => state.selectArtifact)
  const deleteRelationship = useWorkspaceStore((state) => state.deleteRelationship)
  const status = useWorkspaceStore((state) => state.status)
  const errorMessage = useWorkspaceStore((state) => state.errorMessage)
  const clearError = useWorkspaceStore((state) => state.clearError)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<ObjectRelationship | null>(null)
  const [deleting, setDeleting] = useState<ObjectRelationship | null>(null)
  const version = solution.versions.at(-1)
  const objects = version?.metadata.objects ?? []
  const fields = version?.metadata.fields ?? []
  const relationships = version?.metadata.relationships ?? []
  const selected = relationships.find((relationship) => relationship.id === selectedArtifactId)
  const busy = status === 'saving'

  return (
    <>
      <section className="mx-auto max-w-6xl p-8">
        <WorkspaceHeading
          solution={solution}
          title="Relationships"
          description="Connect objects through the Salesforce fields that implement each relationship."
          actionLabel="New Relationship"
          actionDisabled={objects.length === 0 || busy}
          onAction={() => {
            if (status === 'error') clearError()
            setCreating(true)
          }}
        />
        <MetadataTabs active="relationships" />
        {version ? <MetadataChecks version={version} /> : null}
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <ListHeader
            title="Object relationships"
            description={`${String(relationships.length)} modeled in this design version`}
          >
            {selected ? (
              <ArtifactActions
                label={relationshipLabel(selected, objects)}
                busy={busy}
                onEdit={() => {
                  setEditing(selected)
                }}
                onDelete={() => {
                  setDeleting(selected)
                }}
              />
            ) : null}
          </ListHeader>
          {relationships.length ? (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-6 py-3 font-semibold">Relationship field</th>
                  <th className="px-6 py-3 font-semibold">Child object</th>
                  <th className="px-6 py-3 font-semibold">Related object</th>
                  <th className="px-6 py-3 font-semibold">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {relationships.map((relationship) => {
                  const field = fields.find((item) => item.id === relationship.fieldId)
                  const child = objects.find((item) => item.id === relationship.childObjectId)
                  const parent = objects.find((item) => item.id === relationship.parentObjectId)
                  return (
                    <tr
                      key={relationship.id}
                      aria-selected={relationship.id === selectedArtifactId}
                      className={
                        relationship.id === selectedArtifactId
                          ? 'cursor-pointer bg-blue-50'
                          : 'cursor-pointer hover:bg-slate-50'
                      }
                      onClick={() => {
                        selectArtifact(relationship.id)
                      }}
                    >
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-900">
                          {field?.label ?? 'Missing field'}
                        </p>
                        <p className="mt-1 font-mono text-xs text-slate-500">{field?.apiName}</p>
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        {child?.label ?? 'Missing object'}
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        {parent?.label ?? 'Missing object'}
                      </td>
                      <td className="px-6 py-4 capitalize text-slate-600">
                        {relationship.type.replaceAll('-', ' ')}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <EmptyState
              title="Let's connect your objects"
              description="Add a lookup, master-detail, external lookup, or indirect lookup and Blueprint will create the underlying field with it."
              action="New Relationship"
              disabled={objects.length === 0}
              onAction={() => {
                setCreating(true)
              }}
            />
          )}
        </div>
      </section>
      {creating ? (
        <RelationshipDialog
          objects={objects}
          fields={fields}
          onClose={() => {
            setCreating(false)
          }}
        />
      ) : null}
      {editing ? (
        <RelationshipDialog
          objects={objects}
          fields={fields}
          relationship={editing}
          onClose={() => {
            setEditing(null)
          }}
        />
      ) : null}
      {deleting && blueprint ? (
        <DeleteConfirmationDialog
          title={`Delete ${relationshipLabel(deleting, objects)}?`}
          description="This permanently removes the relationship and its underlying Salesforce field."
          itemName={relationshipLabel(deleting, objects)}
          blockers={getRelationshipDeleteDependencies(blueprint, solution.id, deleting.id)}
          consequences={['1 relationship field']}
          confirmLabel="Delete relationship"
          busy={busy}
          errorMessage={errorMessage}
          onConfirm={async () => {
            await deleteRelationship(deleting.id)
            if (useWorkspaceStore.getState().status === 'ready') setDeleting(null)
          }}
          onClose={() => {
            setDeleting(null)
          }}
        />
      ) : null}
    </>
  )
}

export function GlobalValueSetsWorkspace({ solution }: { solution: Solution }) {
  const blueprint = useWorkspaceStore((state) => state.blueprint)
  const selectedArtifactId = useWorkspaceStore((state) => state.selectedArtifactId)
  const selectArtifact = useWorkspaceStore((state) => state.selectArtifact)
  const deleteGlobalValueSet = useWorkspaceStore((state) => state.deleteGlobalValueSet)
  const status = useWorkspaceStore((state) => state.status)
  const errorMessage = useWorkspaceStore((state) => state.errorMessage)
  const clearError = useWorkspaceStore((state) => state.clearError)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<GlobalValueSet | null>(null)
  const [deleting, setDeleting] = useState<GlobalValueSet | null>(null)
  const version = solution.versions.at(-1)
  const valueSets = version?.metadata.globalValueSets ?? []
  const fields = version?.metadata.fields ?? []
  const selected = valueSets.find((valueSet) => valueSet.id === selectedArtifactId)
  const busy = status === 'saving'

  return (
    <>
      <section className="mx-auto max-w-6xl p-8">
        <WorkspaceHeading
          solution={solution}
          title="Global Value Sets"
          description="Govern shared picklist values once and reuse them across the solution."
          actionLabel="New Value Set"
          actionDisabled={busy}
          onAction={() => {
            if (status === 'error') clearError()
            setCreating(true)
          }}
        />
        <MetadataTabs active="global-value-sets" />
        {version ? <MetadataChecks version={version} /> : null}
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <ListHeader
            title="Shared picklist values"
            description={`${String(valueSets.length)} available in this design version`}
          >
            {selected ? (
              <ArtifactActions
                label={selected.label}
                busy={busy}
                onEdit={() => {
                  setEditing(selected)
                }}
                onDelete={() => {
                  setDeleting(selected)
                }}
              />
            ) : null}
          </ListHeader>
          {valueSets.length ? (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-6 py-3 font-semibold">Value set</th>
                  <th className="px-6 py-3 font-semibold">Values</th>
                  <th className="px-6 py-3 font-semibold">Used by</th>
                  <th className="px-6 py-3 font-semibold">Order</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {valueSets.map((valueSet) => (
                  <tr
                    key={valueSet.id}
                    aria-selected={valueSet.id === selectedArtifactId}
                    className={
                      valueSet.id === selectedArtifactId
                        ? 'cursor-pointer bg-blue-50'
                        : 'cursor-pointer hover:bg-slate-50'
                    }
                    onClick={() => {
                      selectArtifact(valueSet.id)
                    }}
                  >
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-900">{valueSet.label}</p>
                      <p className="mt-1 font-mono text-xs text-slate-500">{valueSet.apiName}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-700">{valueSet.values.length}</td>
                    <td className="px-6 py-4 text-slate-700">
                      {fields.filter((field) => field.globalValueSetId === valueSet.id).length}{' '}
                      fields
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {valueSet.sorted ? 'Alphabetical' : 'Defined order'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState
              title="Let's create a reusable value set"
              description="Use one governed list when multiple picklists should share the same values."
              action="New Value Set"
              onAction={() => {
                setCreating(true)
              }}
            />
          )}
        </div>
      </section>
      {creating ? (
        <GlobalValueSetDialog
          onClose={() => {
            setCreating(false)
          }}
        />
      ) : null}
      {editing ? (
        <GlobalValueSetDialog
          valueSet={editing}
          onClose={() => {
            setEditing(null)
          }}
        />
      ) : null}
      {deleting && blueprint ? (
        <DeleteConfirmationDialog
          title={`Delete ${deleting.label}?`}
          description="This permanently removes the shared value set from this design version."
          itemName={deleting.label}
          blockers={getGlobalValueSetDeleteDependencies(blueprint, solution.id, deleting.id)}
          consequences={[`${String(deleting.values.length)} picklist values`]}
          confirmLabel="Delete value set"
          busy={busy}
          errorMessage={errorMessage}
          onConfirm={async () => {
            await deleteGlobalValueSet(deleting.id)
            if (useWorkspaceStore.getState().status === 'ready') setDeleting(null)
          }}
          onClose={() => {
            setDeleting(null)
          }}
        />
      ) : null}
    </>
  )
}

export function MetadataChecks({ version }: { version: SolutionVersion }) {
  const issues = getMetadataHealthIssues(version)
  if (!issues.length) {
    return (
      <div className="mt-5 flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        <span className="grid size-6 place-items-center rounded-full bg-emerald-100 font-bold">
          ✓
        </span>
        Connected metadata checks are passing.
      </div>
    )
  }
  return (
    <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
      <p className="text-sm font-semibold text-amber-900">
        {issues.length} connected metadata {issues.length === 1 ? 'issue' : 'issues'}
      </p>
      <ul className="mt-2 space-y-1 text-sm text-amber-800">
        {issues.slice(0, 3).map((issue) => (
          <li key={issue.id}>• {issue.message}</li>
        ))}
      </ul>
    </div>
  )
}

function MetadataTab({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      className={
        active
          ? 'border-b-2 border-blue-700 px-1 pb-3 text-blue-800'
          : 'px-1 pb-3 text-slate-500 hover:text-slate-800'
      }
      onClick={onClick}
    >
      {label}
    </button>
  )
}

function WorkspaceHeading({
  solution,
  title,
  description,
  actionLabel,
  actionDisabled,
  onAction,
}: {
  solution: Solution
  title: string
  description: string
  actionLabel: string
  actionDisabled: boolean
  onAction: () => void
}) {
  return (
    <div className="flex items-start justify-between gap-6">
      <div>
        <p className="text-sm font-semibold text-blue-700">
          {solution.name} · Version {solution.versions.at(-1)?.number}
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-3 text-slate-600">{description}</p>
      </div>
      <button className="button-primary" onClick={onAction} disabled={actionDisabled}>
        {actionLabel}
      </button>
    </div>
  )
}

function ListHeader({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children?: ReactNode
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
      <div>
        <h2 className="font-semibold text-slate-950">{title}</h2>
        <p className="mt-0.5 text-sm text-slate-500">{description}</p>
      </div>
      {children}
    </div>
  )
}

function ArtifactActions({
  label,
  busy,
  onEdit,
  onDelete,
}: {
  label: string
  busy: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex items-center gap-2" aria-label={`Actions for ${label}`}>
      <button className="button-secondary" onClick={onEdit} disabled={busy}>
        Edit
      </button>
      <button
        className="rounded-md px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
        onClick={onDelete}
        disabled={busy}
      >
        Delete
      </button>
    </div>
  )
}

function EmptyState({
  title,
  description,
  action,
  disabled = false,
  onAction,
}: {
  title: string
  description: string
  action: string
  disabled?: boolean
  onAction: () => void
}) {
  return (
    <div className="px-6 py-14 text-center">
      <div className="mx-auto grid size-12 place-items-center rounded-xl bg-blue-50 text-xl text-blue-700">
        +
      </div>
      <h2 className="mt-4 text-lg font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">{description}</p>
      <button className="button-primary mt-5" onClick={onAction} disabled={disabled}>
        {action}
      </button>
    </div>
  )
}

function relationshipLabel(
  relationship: ObjectRelationship,
  objects: { id: string; label: string }[],
) {
  const child = objects.find((object) => object.id === relationship.childObjectId)
  const parent = objects.find((object) => object.id === relationship.parentObjectId)
  return `${child?.label ?? 'Unknown'} to ${parent?.label ?? 'Unknown'}`
}
