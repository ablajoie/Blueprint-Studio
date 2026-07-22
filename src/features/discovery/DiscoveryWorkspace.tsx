import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
  type SyntheticEvent,
} from 'react'
import { DialogActions, Field, TextInput } from '../../components/ui/FormControls'
import { Modal } from '../../components/ui/Modal'
import type { ProjectSettings, Solution } from '../../domain/blueprint'
import {
  readDiscoverySectionContent,
  resolveDiscoverySections,
} from '../../domain/discoveryTemplate'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { DiscoverySectionEditor } from './DiscoverySectionEditor'
import { normalizeDiscoveryLink, sanitizeDiscoveryHtml } from './discoverySanitizer'
import { DiscoveryToolbar } from './DiscoveryToolbar'
import { applyRichTextCommand, showRange, type RichTextCommand } from './richTextCommands'

const AUTO_SAVE_DELAY = 800
const MAX_IMAGE_BYTES = 2_000_000
const supportedImageTypes = new Set(['image/gif', 'image/jpeg', 'image/png', 'image/webp'])

type SaveState = 'saved' | 'unsaved' | 'saving' | 'error'

type DiscoveryWorkspaceProps = {
  solution: Solution
  settings: ProjectSettings
  onConfigureSections: () => void
}

export function DiscoveryWorkspace({
  solution,
  settings,
  onConfigureSections,
}: DiscoveryWorkspaceProps) {
  const updateDiscovery = useWorkspaceStore((state) => state.updateDiscovery)
  const version = solution.versions.at(-1)
  const definitions = useMemo(() => resolveDiscoverySections(settings), [settings])
  const visibleDefinitions = definitions.filter((section) => section.enabled)
  const documentSections = useMemo(
    () =>
      sanitizeSections(
        version
          ? readDiscoverySectionContent(version.discovery, definitions)
          : Object.fromEntries(definitions.map((section) => [section.id, ''])),
      ),
    [definitions, version],
  )
  const initialSectionsRef = useRef(documentSections)
  const editorRefs = useRef(new Map<string, HTMLDivElement>())
  const imageInputRef = useRef<HTMLInputElement>(null)
  const selectionRef = useRef<Range | null>(null)
  const activeSectionIdRef = useRef(visibleDefinitions[0]?.id ?? null)
  const autoSaveTimerRef = useRef<number | null>(null)
  const latestDraftRef = useRef(initialSectionsRef.current)
  const lastSavedRef = useRef(initialSectionsRef.current)
  const saveRequestRef = useRef(0)
  const [draftSections, setDraftSections] = useState(initialSectionsRef.current)
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [editorError, setEditorError] = useState<string | null>(null)
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [linkValue, setLinkValue] = useState('')

  useEffect(
    () => () => {
      if (autoSaveTimerRef.current !== null) window.clearTimeout(autoSaveTimerRef.current)
      const sanitized = sanitizeSections(latestDraftRef.current)
      if (!sameSectionContent(sanitized, lastSavedRef.current)) {
        void useWorkspaceStore.getState().updateDiscovery(sanitized)
      }
    },
    [solution.id],
  )

  const saveSections = useCallback(
    async (sections: Record<string, string>) => {
      const sanitized = sanitizeSections(sections)
      if (sameSectionContent(sanitized, lastSavedRef.current)) {
        setSaveState('saved')
        return
      }
      const requestId = ++saveRequestRef.current
      setSaveState('saving')
      await updateDiscovery(sanitized)
      if (requestId !== saveRequestRef.current) return
      if (!sameSectionContent(sections, latestDraftRef.current)) return
      if (useWorkspaceStore.getState().status === 'ready') {
        lastSavedRef.current = sanitized
        latestDraftRef.current = sanitized
        setDraftSections(sanitized)
        editorRefs.current.forEach((editor, sectionId) => {
          const content = sanitized[sectionId] ?? ''
          if (editor.innerHTML !== content) editor.innerHTML = content
        })
        setSaveState('saved')
      } else {
        setSaveState('error')
      }
    },
    [updateDiscovery],
  )

  const scheduleSave = (sectionId: string, html: string) => {
    const next = { ...latestDraftRef.current, [sectionId]: html }
    latestDraftRef.current = next
    setDraftSections(next)
    setSaveState('unsaved')
    setEditorError(null)
    if (autoSaveTimerRef.current !== null) window.clearTimeout(autoSaveTimerRef.current)
    autoSaveTimerRef.current = window.setTimeout(() => {
      autoSaveTimerRef.current = null
      void saveSections(latestDraftRef.current)
    }, AUTO_SAVE_DELAY)
  }

  const registerEditor = useCallback((sectionId: string, editor: HTMLDivElement | null) => {
    if (editor) editorRefs.current.set(sectionId, editor)
    else editorRefs.current.delete(sectionId)
  }, [])

  const captureSelection = (preferredSectionId?: string) => {
    const selection = window.getSelection()
    if (!selection?.rangeCount) return
    const range = selection.getRangeAt(0)
    const entry = preferredSectionId
      ? ([preferredSectionId, editorRefs.current.get(preferredSectionId)] as const)
      : Array.from(editorRefs.current.entries()).find(([, editor]) =>
          editor.contains(range.commonAncestorContainer),
        )
    if (!entry?.[1] || !entry[1].contains(range.commonAncestorContainer)) return
    activeSectionIdRef.current = entry[0]
    selectionRef.current = range.cloneRange()
  }

  const activeEditor = () => {
    const activeId = activeSectionIdRef.current ?? visibleDefinitions[0]?.id
    const selected = activeId ? editorRefs.current.get(activeId) : null
    if (selected) return selected
    const fallback = visibleDefinitions[0]?.id
    if (fallback) activeSectionIdRef.current = fallback
    return fallback ? (editorRefs.current.get(fallback) ?? null) : null
  }

  const restoreSelection = () => {
    const editor = activeEditor()
    if (!editor) return null
    editor.focus()
    const selection = window.getSelection()
    selection?.removeAllRanges()
    if (selectionRef.current && editor.contains(selectionRef.current.commonAncestorContainer)) {
      selection?.addRange(selectionRef.current)
    }
    return editor
  }

  const runCommand = (command: RichTextCommand, value?: string) => {
    const editor = restoreSelection()
    if (!editor) return
    const nextRange = applyRichTextCommand(editor, selectionRef.current, command, value)
    selectionRef.current = nextRange.cloneRange()
    showRange(nextRange)
    const sectionId = activeSectionIdRef.current
    if (sectionId) scheduleSave(sectionId, editor.innerHTML)
  }

  const handleEditorKeyDown = (event: KeyboardEvent<HTMLDivElement>, sectionId: string) => {
    const shortcut = (event.ctrlKey || event.metaKey) && !event.altKey
    const shortcutCommand = shortcut
      ? ({ b: 'bold', i: 'italic', u: 'underline' } as const)[
          event.key.toLowerCase() as 'b' | 'i' | 'u'
        ]
      : undefined
    if (shortcutCommand) {
      event.preventDefault()
      captureSelection(sectionId)
      runCommand(shortcutCommand)
      return
    }
    if (event.key !== 'Tab') return
    captureSelection(sectionId)
    const editor = editorRefs.current.get(sectionId)
    const range = selectionRef.current
    const listItem = closestListItem(editor, range)
    if (!listItem) return
    event.preventDefault()
    runCommand(event.shiftKey ? 'outdentListItem' : 'indentListItem')
  }

  const insertTable = () => {
    runCommand(
      'insertHTML',
      '<table><thead><tr><th>Topic</th><th>Notes</th><th>Owner</th></tr></thead><tbody><tr><td>New item</td><td>Add workshop notes</td><td>Unassigned</td></tr></tbody></table><p><br></p>',
    )
  }

  const applyLink = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    const safeUrl = normalizeDiscoveryLink(linkValue)
    if (!safeUrl) {
      setEditorError('Enter a valid web or email link.')
      return
    }
    const selectionWasCollapsed = selectionRef.current?.collapsed ?? true
    if (selectionWasCollapsed) {
      runCommand(
        'insertHTML',
        `<a href="${escapeAttribute(safeUrl)}">${escapeText(linkValue.trim() || safeUrl)}</a>`,
      )
    } else {
      runCommand('createLink', safeUrl)
    }
    setLinkValue('')
    setLinkDialogOpen(false)
  }

  const insertImage = async (file: File) => {
    if (!supportedImageTypes.has(file.type)) {
      setEditorError('Use a PNG, JPEG, GIF, or WebP image.')
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setEditorError('Images must be smaller than 2 MB in this local-first release.')
      return
    }
    try {
      const source = await readFileAsDataUrl(file)
      runCommand(
        'insertHTML',
        `<img src="${source}" alt="${escapeAttribute(file.name)}"><p><br></p>`,
      )
    } catch {
      setEditorError('Blueprint Studio could not read that image.')
    }
  }

  const wordCount = useMemo(() => discoveryWordCount(draftSections), [draftSections])

  return (
    <>
      <section className="mx-auto max-w-6xl p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-sm font-semibold text-blue-700">
              {solution.name} · Version {version?.number}
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">Discovery</h1>
            <p className="mt-3 max-w-3xl text-slate-600">
              Capture workshop notes, questions, decisions, and source material before the design
              becomes structured metadata.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <SaveStatus state={saveState} />
            <button type="button" className="button-secondary" onClick={onConfigureSections}>
              Configure sections
            </button>
            <button
              type="button"
              className="button-secondary"
              disabled={saveState === 'saving' || saveState === 'saved'}
              onClick={() => {
                if (autoSaveTimerRef.current !== null) {
                  window.clearTimeout(autoSaveTimerRef.current)
                  autoSaveTimerRef.current = null
                }
                void saveSections(latestDraftRef.current)
              }}
            >
              Save now
            </button>
          </div>
        </div>

        <div className="mt-7 rounded-xl border border-slate-200 bg-white shadow-sm">
          <DiscoveryToolbar
            onCaptureSelection={() => {
              captureSelection()
            }}
            onCommand={runCommand}
            onInsertLink={() => {
              captureSelection()
              setEditorError(null)
              setLinkDialogOpen(true)
            }}
            onInsertTable={insertTable}
            onInsertImage={() => {
              captureSelection()
              imageInputRef.current?.click()
            }}
          />
          {editorError ? (
            <div
              className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-800"
              role="alert"
            >
              {editorError}
            </div>
          ) : null}
          {visibleDefinitions.length ? (
            <div>
              {visibleDefinitions.map((section) => (
                <DiscoverySectionEditor
                  key={section.id}
                  section={section}
                  initialHtml={draftSections[section.id] ?? documentSections[section.id] ?? ''}
                  onRegister={registerEditor}
                  onInput={scheduleSave}
                  onSelectionChange={captureSelection}
                  onKeyDown={handleEditorKeyDown}
                  onPaste={(event) => {
                    captureSelection(section.id)
                    handlePaste(event, runCommand)
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="px-8 py-16 text-center">
              <h2 className="text-lg font-semibold text-slate-900">No sections are visible</h2>
              <p className="mt-2 text-sm text-slate-600">
                Open the project template and show at least one Discovery section.
              </p>
              <button type="button" className="button-primary mt-5" onClick={onConfigureSections}>
                Configure sections
              </button>
            </div>
          )}
          <div className="flex items-center justify-between rounded-b-xl border-t border-slate-200 bg-slate-50 px-5 py-3 text-xs text-slate-500">
            <span>{wordCount} words</span>
            <span>Saved locally with this solution</span>
          </div>
        </div>
      </section>

      <input
        ref={imageInputRef}
        className="sr-only"
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        aria-label="Choose discovery image"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) void insertImage(file)
        }}
      />

      {linkDialogOpen ? (
        <Modal
          title="Add link"
          description="Selected text becomes the link. With no selection, Blueprint inserts the address."
          onClose={() => {
            setLinkDialogOpen(false)
          }}
        >
          <form onSubmit={applyLink}>
            <div className="px-6 py-5">
              <Field label="Web or email address">
                <TextInput
                  autoFocus
                  required
                  value={linkValue}
                  placeholder="https://example.com"
                  onChange={(event) => {
                    setLinkValue(event.target.value)
                  }}
                />
              </Field>
            </div>
            <DialogActions>
              <button
                type="button"
                className="button-secondary"
                onClick={() => {
                  setLinkDialogOpen(false)
                }}
              >
                Cancel
              </button>
              <button type="submit" className="button-primary" disabled={!linkValue.trim()}>
                Add link
              </button>
            </DialogActions>
          </form>
        </Modal>
      ) : null}
    </>
  )
}

function SaveStatus({ state }: { state: SaveState }) {
  const labels: Record<SaveState, string> = {
    saved: 'Saved locally',
    unsaved: 'Unsaved changes',
    saving: 'Saving…',
    error: 'Save needs attention',
  }
  const colors: Record<SaveState, string> = {
    saved: 'bg-emerald-50 text-emerald-800',
    unsaved: 'bg-amber-50 text-amber-800',
    saving: 'bg-blue-50 text-blue-800',
    error: 'bg-red-50 text-red-800',
  }
  return (
    <span
      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${colors[state]}`}
      role="status"
    >
      {labels[state]}
    </span>
  )
}

function handlePaste(
  event: ClipboardEvent<HTMLDivElement>,
  insert: (command: RichTextCommand, value?: string) => void,
) {
  event.preventDefault()
  const clipboardHtml = event.clipboardData.getData('text/html')
  if (clipboardHtml) {
    insert('insertHTML', sanitizeDiscoveryHtml(clipboardHtml))
    return
  }
  const plainText = event.clipboardData.getData('text/plain')
  insert('insertHTML', `<p>${escapeText(plainText).replaceAll('\n', '<br>')}</p>`)
}

function sanitizeSections(sections: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(sections).map(([sectionId, html]) => [sectionId, sanitizeDiscoveryHtml(html)]),
  )
}

function sameSectionContent(first: Record<string, string>, second: Record<string, string>) {
  const keys = new Set([...Object.keys(first), ...Object.keys(second)])
  return Array.from(keys).every((key) => (first[key] ?? '') === (second[key] ?? ''))
}

function closestListItem(editor: HTMLElement | undefined, range: Range | null): Element | null {
  if (!editor || !range || !editor.contains(range.commonAncestorContainer)) return null
  const node = range.startContainer
  const element = node instanceof Element ? node : node.parentElement
  const listItem = element?.closest('li') ?? null
  return listItem && editor.contains(listItem) ? listItem : null
}

function discoveryWordCount(sections: Record<string, string>): number {
  const container = document.createElement('div')
  container.innerHTML = Object.values(sections).join(' ')
  const text = container.textContent?.trim() ?? ''
  return text ? text.split(/\s+/).length : 0
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('Unsupported image result'))
    })
    reader.addEventListener('error', () => {
      reject(reader.error ?? new Error('Image read failed'))
    })
    reader.readAsDataURL(file)
  })
}

function escapeAttribute(value: string): string {
  return escapeText(value).replaceAll('`', '&#96;')
}

function escapeText(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}
