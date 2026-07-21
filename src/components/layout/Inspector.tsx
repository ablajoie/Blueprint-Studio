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
  const selectedSolution = blueprint?.solutions.find(
    (solution) => solution.id === selectedSolutionId,
  )
  const version = selectedSolution?.versions.at(-1)
  const field = version?.metadata.fields.find((item) => item.id === selectedArtifactId)
  const object = version?.metadata.objects.find((item) => item.id === selectedArtifactId)

  return (
    <aside className="overflow-auto border-l border-slate-200 bg-white p-5" aria-label="Inspector">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Inspector</p>
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
      ) : (
        <div className="mt-6 text-center">
          <div className="mx-auto grid size-10 place-items-center rounded-full bg-slate-100 text-slate-400">
            i
          </div>
          <p className="mt-3 text-sm font-medium">Nothing selected</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Select an item to view its properties.
          </p>
        </div>
      )}
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
