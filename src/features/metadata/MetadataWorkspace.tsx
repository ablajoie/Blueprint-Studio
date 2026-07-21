import { useState } from 'react'
import type { SalesforceField, SalesforceObject, Solution } from '../../domain/blueprint'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { CreateFieldDialog } from './CreateFieldDialog'

export function MetadataWorkspace({
  solution,
  onCreateObject,
}: {
  solution: Solution
  onCreateObject: () => void
}) {
  const selectedObjectId = useWorkspaceStore((state) => state.selectedObjectId)
  const selectedArtifactId = useWorkspaceStore((state) => state.selectedArtifactId)
  const openObject = useWorkspaceStore((state) => state.openObject)
  const showObjectList = useWorkspaceStore((state) => state.showObjectList)
  const selectArtifact = useWorkspaceStore((state) => state.selectArtifact)
  const [creatingField, setCreatingField] = useState(false)
  const version = solution.versions.at(-1)
  const objects = version?.metadata.objects ?? []
  const fields = version?.metadata.fields ?? []
  const selectedObject = objects.find((object) => object.id === selectedObjectId)

  if (selectedObject) {
    return (
      <>
        <ObjectWorkspace
          solution={solution}
          object={selectedObject}
          fields={fields.filter((field) => field.objectId === selectedObject.id)}
          selectedArtifactId={selectedArtifactId}
          onBack={showObjectList}
          onCreateField={() => {
            setCreatingField(true)
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
  onBack,
  onCreateField,
  onSelectField,
}: {
  solution: Solution
  object: SalesforceObject
  fields: SalesforceField[]
  selectedArtifactId: string | null
  onBack: () => void
  onCreateField: () => void
  onSelectField: (id: string) => void
}) {
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
        <button className="button-primary" onClick={onCreateField}>
          New Field
        </button>
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
            <button className="button-primary mt-5" onClick={onCreateField}>
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
          <tr key={object.id} className="hover:bg-slate-50">
            <td className="p-0">
              <button
                className="w-full px-6 py-4 text-left font-semibold text-slate-900"
                onClick={() => {
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
            className={field.id === selectedId ? 'bg-blue-50' : 'hover:bg-slate-50'}
          >
            <td className="p-0">
              <button
                className="w-full px-6 py-4 text-left font-semibold text-slate-900"
                onClick={() => {
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
