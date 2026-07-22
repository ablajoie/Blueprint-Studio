import { Select, TextArea, TextInput } from '../../components/ui/FormControls'
import type { DiscoverySectionDefinition } from '../../domain/blueprint'
import {
  createCustomDiscoverySection,
  MAX_DISCOVERY_SECTIONS,
} from '../../domain/discoveryTemplate'

export function DiscoveryTemplateSettings({
  sections,
  onChange,
}: {
  sections: DiscoverySectionDefinition[]
  onChange: (sections: DiscoverySectionDefinition[]) => void
}) {
  const update = (id: string, change: Partial<DiscoverySectionDefinition>) => {
    onChange(sections.map((section) => (section.id === id ? { ...section, ...change } : section)))
  }

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= sections.length) return
    const next = [...sections]
    const current = next[index]
    const adjacent = next[target]
    if (!current || !adjacent) return
    next[index] = adjacent
    next[target] = current
    onChange(next)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        These sections guide every solution in this project. Hidden sections retain their existing
        notes and can be shown again later.
      </div>
      <div className="space-y-3">
        {sections.map((section, index) => (
          <article
            key={section.id}
            className={`rounded-xl border p-4 ${
              section.enabled ? 'border-slate-200 bg-white' : 'border-slate-200 bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <input
                  type="checkbox"
                  checked={section.enabled}
                  onChange={(event) => {
                    update(section.id, { enabled: event.target.checked })
                  }}
                  className="size-4 accent-blue-700"
                />
                Show section
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-35"
                  aria-label={`Move ${section.title} up`}
                  disabled={index === 0}
                  onClick={() => {
                    move(index, -1)
                  }}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-35"
                  aria-label={`Move ${section.title} down`}
                  disabled={index === sections.length - 1}
                  onClick={() => {
                    move(index, 1)
                  }}
                >
                  ↓
                </button>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-[minmax(0,1fr)_10rem] gap-3">
              <TextInput
                aria-label={`Section ${String(index + 1)} title`}
                maxLength={80}
                required
                value={section.title}
                onChange={(event) => {
                  update(section.id, { title: event.target.value })
                }}
              />
              <Select
                aria-label={`${section.title} starting format`}
                value={section.contentType}
                onChange={(event) => {
                  update(section.id, {
                    contentType: event.target.value as DiscoverySectionDefinition['contentType'],
                  })
                }}
              >
                <option value="rich-text">Open notes</option>
                <option value="table">Starter table</option>
              </Select>
            </div>
            <TextArea
              className="mt-3"
              aria-label={`${section.title} help text`}
              rows={2}
              maxLength={280}
              value={section.description}
              onChange={(event) => {
                update(section.id, { description: event.target.value })
              }}
            />
          </article>
        ))}
      </div>
      <button
        type="button"
        className="button-secondary w-full"
        disabled={sections.length >= MAX_DISCOVERY_SECTIONS}
        onClick={() => {
          onChange([...sections, createCustomDiscoverySection()])
        }}
      >
        + Add section
      </button>
    </div>
  )
}
