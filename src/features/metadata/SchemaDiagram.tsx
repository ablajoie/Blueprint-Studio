import type { ObjectRelationship, SalesforceField, SalesforceObject } from '../../domain/blueprint'
import {
  createSchemaDiagramModel,
  SCHEMA_NODE_HEIGHT,
  SCHEMA_NODE_WIDTH,
} from './schemaDiagramModel'

export function SchemaDiagram({
  objects,
  fields,
  relationships,
  selectedArtifactId,
  onOpenObject,
  onSelectRelationship,
}: {
  objects: SalesforceObject[]
  fields: SalesforceField[]
  relationships: ObjectRelationship[]
  selectedArtifactId: string | null
  onOpenObject: (objectId: string) => void
  onSelectRelationship: (relationshipId: string) => void
}) {
  const model = createSchemaDiagramModel(objects, fields, relationships)

  return (
    <div className="bg-slate-50/70">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3 text-xs text-slate-600">
        <p>
          Objects are arranged automatically. Select a connection to inspect its relationship field.
        </p>
        <div className="flex items-center gap-4" aria-label="Schema legend">
          <LegendItem color="bg-blue-600" label="Object" />
          <LegendItem color="bg-cyan-500" label="Relationship field" />
        </div>
      </div>
      <div className="overflow-auto p-4" aria-label="Data model diagram">
        <div
          className="relative rounded-xl border border-slate-200 bg-white shadow-inner"
          style={{ width: model.width, height: model.height }}
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-50"
            style={{
              backgroundImage:
                'radial-gradient(circle at 1px 1px, rgb(203 213 225) 1px, transparent 0)',
              backgroundSize: '22px 22px',
            }}
          />
          <svg
            className="pointer-events-none absolute inset-0 overflow-visible"
            width={model.width}
            height={model.height}
            aria-hidden="true"
          >
            {model.edges.map((edge) => (
              <path
                key={edge.relationship.id}
                d={edge.path}
                fill="none"
                stroke={edge.relationship.id === selectedArtifactId ? '#0369a1' : '#67e8f9'}
                strokeWidth={edge.relationship.id === selectedArtifactId ? 3 : 2}
              />
            ))}
          </svg>

          {model.nodes.map((node) => {
            const selected = node.object.id === selectedArtifactId
            return (
              <button
                key={node.object.id}
                type="button"
                aria-label={`Open ${node.object.label} object`}
                className={`absolute overflow-hidden rounded-xl border bg-white text-left shadow-md transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 ${selected ? 'border-blue-600 ring-2 ring-blue-100' : 'border-slate-200'}`}
                style={{
                  left: node.x,
                  top: node.y,
                  width: SCHEMA_NODE_WIDTH,
                  height: SCHEMA_NODE_HEIGHT,
                }}
                onClick={() => {
                  onOpenObject(node.object.id)
                }}
              >
                <span className="block border-b border-slate-100 bg-slate-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                  {node.object.kind.replaceAll('-', ' ')}
                </span>
                <span className="block px-4 pt-3 text-sm font-semibold text-slate-950">
                  {node.object.label}
                </span>
                <span className="mt-1 block truncate px-4 font-mono text-[11px] text-slate-500">
                  {node.object.apiName || 'API name not assigned'}
                </span>
                <span className="mt-3 flex items-center gap-3 px-4 text-xs text-slate-600">
                  <span>{node.fieldCount} fields</span>
                  <span aria-hidden="true">·</span>
                  <span>{node.relationshipCount} connections</span>
                </span>
              </button>
            )
          })}

          {model.edges.map((edge) => {
            const selected = edge.relationship.id === selectedArtifactId
            return (
              <button
                key={edge.relationship.id}
                type="button"
                className={`absolute max-w-44 -translate-x-1/2 -translate-y-1/2 rounded-full border bg-white px-3 py-1.5 text-left text-[11px] font-semibold shadow-sm transition hover:border-cyan-400 hover:text-cyan-900 focus:outline-none focus:ring-2 focus:ring-cyan-400 ${selected ? 'border-cyan-600 text-cyan-900 ring-2 ring-cyan-100' : 'border-cyan-200 text-slate-700'}`}
                style={{ left: edge.labelX, top: edge.labelY }}
                aria-label={`Inspect ${edge.field?.label ?? edge.relationship.relationshipName ?? 'relationship'} relationship`}
                title={`${edge.child.label} → ${edge.parent.label}`}
                onClick={() => {
                  onSelectRelationship(edge.relationship.id)
                }}
              >
                <span className="block truncate">
                  {edge.field?.label ?? edge.relationship.relationshipName ?? 'Relationship'}
                </span>
                <span className="block text-[10px] font-medium capitalize text-slate-500">
                  {edge.relationship.type.replaceAll('-', ' ')}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`size-2.5 rounded-full ${color}`} aria-hidden="true" />
      {label}
    </span>
  )
}
