import { useState } from 'react'
import { DeleteConfirmationDialog } from '../../components/ui/DeleteConfirmationDialog'
import type { SalesforceField, SalesforceObject, Solution } from '../../domain/blueprint'
import { getFieldDeleteDependencies } from '../../domain/blueprintFactory'
import { getObjectDeleteImpact } from '../../domain/blueprintLifecycle'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { ObjectDialog } from './CreateObjectDialog'
import { CreateFieldDialog, FieldDialog } from './CreateFieldDialog'
import { DeleteFieldDialog } from './DeleteFieldDialog'

export function MetadataWorkspace({
  solution,
  onCreateObject,
}: {
  solution: Solution
  onCreateObject: () => void
}) {
  const selectedObjectId = useWorkspaceStore((state) => state.selectedObjectId)
  const selectedArtifactId = useWorkspaceStore((state) => state.selectedArtifactId)
  const blueprint = useWorkspaceStore((state) => state.blueprint)
  const openObject = useWorkspaceStore((state) => state.openObject)
  const showObjectList = useWorkspaceStore((state) => state.showObjectList)
  const selectArtifact = useWorkspaceStore((state) => state.selectArtifact)
  const duplicateField = useWorkspaceStore((state) => state.duplicateField)
  const deleteField = useWorkspaceStore((state) => state.deleteField)
  const deleteObject = useWorkspaceStore((state) => state.deleteObject)
  const status = useWorkspaceStore((state) => state.status)
  const errorMessage = useWorkspaceStore((state) => state.errorMessage)
  const clearError = useWorkspaceStore((state) => state.clearError)
  const [creatingField, setCreatingField] = useState(false)
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null)
  const [deletingFieldId, setDeletingFieldId] = useState<string | null>(null)
  const [editingObject, setEditingObject] = useState(false)
  const [deletingObject, setDeletingObject] = useState(false)
  const version = solution.versions.at(-1)
  const objects = version?.metadata.objects ?? []
  const fields = version?.metadata.fields ?? []
  const selectedObject = objects.find((object) => object.id === selectedObjectId)
  const editingField = fields.find((field) => field.id === editingFieldId)
  const deletingField = fields.find((field) => field.id === deletingFieldId)

  if (selectedObject) {
    return (
      <>
        <ObjectWorkspace
          solution={solution}
          object={selectedObject}
          fields={fields.filter((field) => field.objectId === selectedObject.id)}
          selectedArtifactId={selectedArtifactId}
          actionPending={status === 'saving'}
          onBack={showObjectList}
          onEditObject={() => {
            if (status === 'error') clearError()
            setEditingObject(true)
          }}
          onDeleteObject={() => {
            if (status === 'error') clearError()
            setDeletingObject(true)
          }}
          onCreateField={() => {
            if (status === 'error') clearError()
            setCreatingField(true)
          }}
          onEditField={(fieldId) => {
            if (status === 'error') clearError()
            selectArtifact(fieldId)
            setEditingFieldId(fieldId)
          }}
          onDuplicateField={(fieldId) => {
            void duplicateField(fieldId)
          }}
          onDeleteField={(fieldId) => {
            if (status === 'error') clearError()
            selectArtifact(fieldId)
            setDeletingFieldId(fieldId)
          }}
          onSelectField={selectArtifact}
        />
        {creatingField ? (
          <CreateFieldDialog
            object={selectedObject}
            availableObjects={objects}
            onClose={() => {
              setCreatingField(false)
            }}
          />
        ) : null}
        {editingObject ? (
          <ObjectDialog
            object={selectedObject}
            onClose={() => {
              setEditingObject(false)
            }}
          />
        ) : null}
        {deletingObject && blueprint ? (
          <DeleteConfirmationDialog
            title={`Delete ${selectedObject.label}?`}
            description="This permanently removes the object and the design artifacts it owns."
            itemName={selectedObject.label}
            {...getObjectDeleteImpact(blueprint, solution.id, selectedObject.id)}
            confirmLabel="Delete object"
            busy={status === 'saving'}
            errorMessage={errorMessage}
            onConfirm={async () => {
              await deleteObject(selectedObject.id)
              if (useWorkspaceStore.getState().status === 'ready') setDeletingObject(false)
            }}
            onClose={() => {
              setDeletingObject(false)
            }}
          />
        ) : null}
        {editingField ? (
          <FieldDialog
            object={selectedObject}
            availableObjects={objects}
            field={editingField}
            onClose={() => {
              setEditingFieldId(null)
            }}
          />
        ) : null}
        {deletingField ? (
          <DeleteFieldDialog
            field={deletingField}
            dependencies={
              blueprint ? getFieldDeleteDependencies(blueprint, solution.id, deletingField.id) : []
            }
            onConfirm={() => deleteField(deletingField.id)}
            onClose={() => {
              setDeletingFieldId(null)
            }}
          />
        ) : null}
      </>
    )
  }

  return (
    <section className="mx-auto max-w-6xl p-8">
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-sm font-semibold text-blue-700">
            {solution.name} · Version {version?.number}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Metadata</h1>
          <p className="mt-3 text-slate-600">
            Model the Salesforce building blocks this solution needs.
          </p>
        </div>
        <button className="button-primary" onClick={onCreateObject}>
          New Object
        </button>
      </div>

      <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="font-semibold text-slate-950">Objects</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {objects.length} modeled in this design version
            </p>
          </div>
        </div>
        {objects.length ? (
          <ObjectTable objects={objects} fields={fields} onSelect={openObject} />
        ) : (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-xl bg-blue-50 text-xl text-blue-700">
              ▦
            </div>
            <h2 className="mt-4 text-lg font-semibold">Let’s add your first object</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
              Start with the standard, custom, external, or configuration object at the center of
              this solution.
            </p>
            <button className="button-primary mt-5" onClick={onCreateObject}>
              New Object
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

function ObjectWorkspace({
  solution,
  object,
  fields,
  selectedArtifactId,
  actionPending,
  onBack,
  onEditObject,
  onDeleteObject,
  onCreateField,
  onEditField,
  onDuplicateField,
  onDeleteField,
  onSelectField,
}: {
  solution: Solution
  object: SalesforceObject
  fields: SalesforceField[]
  selectedArtifactId: string | null
  actionPending: boolean
  onBack: () => void
  onEditObject: () => void
  onDeleteObject: () => void
  onCreateField: () => void
  onEditField: (id: string) => void
  onDuplicateField: (id: string) => void
  onDeleteField: (id: string) => void
  onSelectField: (id: string) => void
}) {
  const selectedField = fields.find((field) => field.id === selectedArtifactId)

  return (
    <section className="mx-auto max-w-6xl p-8">
      <button className="text-sm font-semibold text-blue-700 hover:underline" onClick={onBack}>
        ← Objects
      </button>
      <div className="mt-5 flex items-start justify-between gap-6">
        <div>
          <p className="text-sm font-semibold text-blue-700">{solution.name} · Metadata</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{object.label}</h1>
          <p className="mt-2 font-mono text-xs text-slate-500">{object.apiName}</p>
          {object.description ? (
            <p className="mt-3 max-w-3xl text-slate-600">{object.description}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button className="button-secondary" onClick={onEditObject} disabled={actionPending}>
            Edit object
          </button>
          <button
            className="rounded-lg px-3 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
            onClick={onDeleteObject}
            disabled={actionPending}
          >
            Delete object
          </button>
          <button className="button-primary" onClick={onCreateField} disabled={actionPending}>
            New Field
          </button>
        </div>
      </div>

      <div className="mt-7 flex gap-6 border-b border-slate-200 text-sm font-semibold">
        <span className="border-b-2 border-blue-700 px-1 pb-3 text-blue-800">Fields</span>
        <span className="px-1 pb-3 text-slate-400">Relationships</span>
        <span className="px-1 pb-3 text-slate-400">Layouts</span>
        <span className="px-1 pb-3 text-slate-400">Security</span>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="font-semibold text-slate-950">Fields</h2>
            <p className="mt-0.5 text-sm text-slate-500">{fields.length} defined on this object</p>
          </div>
          {selectedField ? (
            <div
              className="flex items-center gap-2"
              aria-label={`Actions for ${selectedField.label}`}
            >
              <button
                type="button"
                className="button-secondary"
                disabled={actionPending}
                onClick={() => {
                  onEditField(selectedField.id)
                }}
              >
                Edit
              </button>
              <button
                type="button"
                className="button-secondary"
                disabled={actionPending}
                onClick={() => {
                  onDuplicateField(selectedField.id)
                }}
              >
                Duplicate
              </button>
              <button
                type="button"
                className="rounded-md px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                disabled={actionPending}
                onClick={() => {
                  onDeleteField(selectedField.id)
                }}
              >
                Delete
              </button>
            </div>
          ) : null}
        </div>
        {fields.length ? (
          <FieldTable fields={fields} selectedId={selectedArtifactId} onSelect={onSelectField} />
        ) : (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-xl bg-blue-50 text-xl text-blue-700">
              ＋
            </div>
            <h2 className="mt-4 text-lg font-semibold">Let’s add the first field</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
              Define what this object needs to capture. Blueprint will keep the Salesforce metadata
              and design notes together.
            </p>
            <button
              className="button-primary mt-5"
              onClick={onCreateField}
              disabled={actionPending}
            >
              New Field
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

function ObjectTable({
  objects,
  fields,
  onSelect,
}: {
  objects: SalesforceObject[]
  fields: SalesforceField[]
  onSelect: (id: string) => void
}) {
  return (
    <table className="w-full text-left text-sm">
      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
        <tr>
          <th className="px-6 py-3 font-semibold">Label</th>
          <th className="px-6 py-3 font-semibold">API name</th>
          <th className="px-6 py-3 font-semibold">Type</th>
          <th className="px-6 py-3 text-right font-semibold">Fields</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {objects.map((object) => (
          <tr
            key={object.id}
            className="cursor-pointer hover:bg-slate-50"
            onClick={() => {
              onSelect(object.id)
            }}
          >
            <td className="p-0">
              <button
                className="w-full px-6 py-4 text-left font-semibold text-slate-900"
                onClick={(event) => {
                  event.stopPropagation()
                  onSelect(object.id)
                }}
              >
                {object.label}
              </button>
            </td>
            <td className="px-6 py-4 font-mono text-xs text-slate-600">{object.apiName}</td>
            <td className="px-6 py-4 capitalize text-slate-600">
              {object.kind.replaceAll('-', ' ')}
            </td>
            <td className="px-6 py-4 text-right text-slate-500">
              {fields.filter((field) => field.objectId === object.id).length}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function FieldTable({
  fields,
  selectedId,
  onSelect,
}: {
  fields: SalesforceField[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <table className="w-full text-left text-sm">
      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
        <tr>
          <th className="px-6 py-3 font-semibold">Field</th>
          <th className="px-6 py-3 font-semibold">API name</th>
          <th className="px-6 py-3 font-semibold">Data type</th>
          <th className="px-6 py-3 font-semibold">Required</th>
          <th className="px-6 py-3 font-semibold">Documentation</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {fields.map((field) => (
          <tr
            key={field.id}
            aria-selected={field.id === selectedId}
            className={
              field.id === selectedId
                ? 'cursor-pointer bg-blue-50'
                : 'cursor-pointer hover:bg-slate-50'
            }
            onClick={() => {
              onSelect(field.id)
            }}
          >
            <td className="p-0">
              <button
                className="w-full px-6 py-4 text-left font-semibold text-slate-900"
                onClick={(event) => {
                  event.stopPropagation()
                  onSelect(field.id)
                }}
              >
                {field.label}
              </button>
            </td>
            <td className="px-6 py-4 font-mono text-xs text-slate-600">{field.apiName}</td>
            <td className="px-6 py-4 capitalize text-slate-600">
              {field.dataType.replaceAll('-', ' ')}
            </td>
            <td className="px-6 py-4 text-slate-600">{field.required ? 'Yes' : 'No'}</td>
            <td className="px-6 py-4">
              <DocumentationBadge complete={Boolean(field.description && field.helpText)} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function DocumentationBadge({ complete }: { complete: boolean }) {
  return complete ? (
    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
      Complete
    </span>
  ) : (
    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
      Needs details
    </span>
  )
}
