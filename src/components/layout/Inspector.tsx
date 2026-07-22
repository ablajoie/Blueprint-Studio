import { useWorkspaceStore } from '../../store/workspaceStore'

const kindLabels = {
  standard: 'Standard object',
  custom: 'Custom object',
  external: 'External object',
  'big-object': 'Big object',
  'platform-event': 'Platform event',
  'custom-metadata-type': 'Custom metadata type',
}

export function Inspector() {
  const blueprint = useWorkspaceStore((state) => state.blueprint)
  const selectedSolutionId = useWorkspaceStore((state) => state.selectedSolutionId)
  const selectedArtifactId = useWorkspaceStore((state) => state.selectedArtifactId)
  const selectArtifact = useWorkspaceStore((state) => state.selectArtifact)
  const openField = useWorkspaceStore((state) => state.openField)
  const selectedSolution = blueprint?.solutions.find(
    (solution) => solution.id === selectedSolutionId,
  )
  const version = selectedSolution?.versions.at(-1)
  const field = version?.metadata.fields.find((item) => item.id === selectedArtifactId)
  const object = version?.metadata.objects.find((item) => item.id === selectedArtifactId)
  const relationship = version?.metadata.relationships.find(
    (item) => item.id === selectedArtifactId,
  )
  const globalValueSet = version?.metadata.globalValueSets.find(
    (item) => item.id === selectedArtifactId,
  )
  if (!field && !object && !relationship && !globalValueSet) return null
  const relationshipField = version?.metadata.fields.find(
    (item) => item.id === relationship?.fieldId,
  )
  const childObject = version?.metadata.objects.find(
    (item) => item.id === relationship?.childObjectId,
  )
  const parentObject = version?.metadata.objects.find(
    (item) => item.id === relationship?.parentObjectId,
  )

  return (
    <aside className="overflow-auto border-l border-slate-200 bg-white p-5" aria-label="Inspector">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Inspector</p>
        <button
          className="grid size-8 place-items-center rounded-md text-lg leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          aria-label="Close inspector"
          title="Close inspector"
          onClick={() => {
            selectArtifact(null)
          }}
        >
          ×
        </button>
      </div>
      {field ? (
        <div className="mt-5">
          <span className="inline-flex rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold capitalize text-violet-800">
            {field.dataType.replaceAll('-', ' ')}
          </span>
          <h2 className="mt-3 text-lg font-semibold text-slate-950">{field.label}</h2>
          <dl className="mt-5 space-y-4 text-sm">
            <InspectorProperty label="API name" monospace value={field.apiName ?? 'Not assigned'} />
            <InspectorProperty label="Required" value={field.required ? 'Yes' : 'No'} />
            <InspectorProperty label="Description" value={field.description || 'Not added yet'} />
            <InspectorProperty label="Help text" value={field.helpText || 'Not added yet'} />
            {field.globalValueSetId ? (
              <InspectorProperty
                label="Value source"
                value={
                  version?.metadata.globalValueSets.find(
                    (valueSet) => valueSet.id === field.globalValueSetId,
                  )?.label ?? 'Missing global value set'
                }
              />
            ) : field.localPicklistValues ? (
              <InspectorProperty
                label="Local values"
                value={`${String(field.localPicklistValues.length)} defined`}
              />
            ) : null}
            {field.picklistDependency ? (
              <InspectorProperty
                label="Controlled by"
                value={
                  version?.metadata.fields.find(
                    (candidate) => candidate.id === field.picklistDependency?.controllingFieldId,
                  )?.label ?? 'Missing controlling field'
                }
              />
            ) : null}
          </dl>
        </div>
      ) : object ? (
        <div className="mt-5">
          <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800">
            {kindLabels[object.kind]}
          </span>
          <h2 className="mt-3 text-lg font-semibold text-slate-950">{object.label}</h2>
          <dl className="mt-5 space-y-4 text-sm">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                API name
              </dt>
              <dd className="mt-1 break-all font-mono text-xs text-slate-800">{object.apiName}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Status
              </dt>
              <dd className="mt-1 capitalize text-slate-800">
                {object.deploymentStatus?.replace('-', ' ')}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Description
              </dt>
              <dd className="mt-1 leading-5 text-slate-700">
                {object.description || 'Not added yet'}
              </dd>
            </div>
          </dl>
        </div>
      ) : relationship ? (
        <div className="mt-5">
          <span className="inline-flex rounded-full bg-cyan-100 px-2.5 py-1 text-xs font-semibold capitalize text-cyan-900">
            {relationship.type.replaceAll('-', ' ')}
          </span>
          <h2 className="mt-3 text-lg font-semibold text-slate-950">
            {relationshipField?.label ?? relationship.relationshipName ?? 'Relationship'}
          </h2>
          <dl className="mt-5 space-y-4 text-sm">
            <InspectorProperty
              label="Field lives on"
              value={childObject?.label ?? 'Missing object'}
            />
            <InspectorProperty label="References" value={parentObject?.label ?? 'Missing object'} />
            <InspectorProperty
              label="Field API name"
              monospace
              value={relationshipField?.apiName ?? 'Not assigned'}
            />
            <InspectorProperty
              label="Relationship name"
              value={relationship.relationshipName ?? 'Not added yet'}
            />
            <InspectorProperty
              label="Description"
              value={relationship.description ?? relationshipField?.description ?? 'Not added yet'}
            />
          </dl>
          {relationshipField && childObject ? (
            <button
              className="button-secondary mt-5 w-full"
              onClick={() => {
                openField(childObject.id, relationshipField.id)
              }}
            >
              Open underlying field
            </button>
          ) : null}
        </div>
      ) : globalValueSet ? (
        <div className="mt-5">
          <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
            Global value set
          </span>
          <h2 className="mt-3 text-lg font-semibold text-slate-950">{globalValueSet.label}</h2>
          <dl className="mt-5 space-y-4 text-sm">
            <InspectorProperty
              label="API name"
              monospace
              value={globalValueSet.apiName ?? 'Not assigned'}
            />
            <InspectorProperty
              label="Values"
              value={`${String(globalValueSet.values.length)} defined`}
            />
            <InspectorProperty
              label="Used by"
              value={`${String(
                version?.metadata.fields.filter(
                  (candidate) => candidate.globalValueSetId === globalValueSet.id,
                ).length ?? 0,
              )} fields`}
            />
            <InspectorProperty
              label="Display order"
              value={globalValueSet.sorted ? 'Alphabetical' : 'Defined order'}
            />
            <InspectorProperty
              label="Description"
              value={globalValueSet.description ?? 'Not added yet'}
            />
          </dl>
          <div className="mt-5 border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Active values
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {globalValueSet.values
                .filter((value) => value.active)
                .map((value) => (
                  <span
                    key={value.id}
                    className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700"
                  >
                    {value.label}
                    {value.default ? ' · Default' : ''}
                  </span>
                ))}
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  )
}

function InspectorProperty({
  label,
  value,
  monospace = false,
}: {
  label: string
  value: string
  monospace?: boolean
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd
        className={`mt-1 break-words text-slate-800 ${monospace ? 'font-mono text-xs' : 'leading-5'}`}
      >
        {value}
      </dd>
    </div>
  )
}
