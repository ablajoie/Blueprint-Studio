import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type SyntheticEvent,
} from 'react'
import { DialogActions, Field, TextInput } from '../../components/ui/FormControls'
import { Modal } from '../../components/ui/Modal'
import type { Solution } from '../../domain/blueprint'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { normalizeDiscoveryLink, sanitizeDiscoveryHtml } from './discoverySanitizer'
import { DiscoveryToolbar } from './DiscoveryToolbar'
import { applyRichTextCommand, showRange, type RichTextCommand } from './richTextCommands'

const AUTO_SAVE_DELAY = 800
const MAX_IMAGE_BYTES = 2_000_000
const supportedImageTypes = new Set(['image/gif', 'image/jpeg', 'image/png', 'image/webp'])

type SaveState = 'saved' | 'unsaved' | 'saving' | 'error'

export function DiscoveryWorkspace({ solution }: { solution: Solution }) {
  const updateDiscovery = useWorkspaceStore((state) => state.updateDiscovery)
  const version = solution.versions.at(-1)
  const initialContentRef = useRef(
    sanitizeDiscoveryHtml(
      version?.discovery.format === 'html' && typeof version.discovery.content === 'string'
        ? version.discovery.content
        : '',
    ),
  )
  const editorRef = useRef<HTMLDivElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const selectionRef = useRef<Range | null>(null)
  const autoSaveTimerRef = useRef<number | null>(null)
  const latestDraftRef = useRef(initialContentRef.current)
  const lastSavedRef = useRef(initialContentRef.current)
  const saveRequestRef = useRef(0)
  const [draftHtml, setDraftHtml] = useState(initialContentRef.current)
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [editorError, setEditorError] = useState<string | null>(null)
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [linkValue, setLinkValue] = useState('')

  const saveHtml = useCallback(
    async (html: string) => {
      const sanitized = sanitizeDiscoveryHtml(html)
      if (sanitized === lastSavedRef.current) {
        setSaveState('saved')
        return
      }
      const requestId = ++saveRequestRef.current
      setSaveState('saving')
      await updateDiscovery(sanitized)
      if (requestId !== saveRequestRef.current) return
      if (html !== latestDraftRef.current) return
      if (useWorkspaceStore.getState().status === 'ready') {
        lastSavedRef.current = sanitized
        latestDraftRef.current = sanitized
        setDraftHtml(sanitized)
        if (editorRef.current && editorRef.current.innerHTML !== sanitized) {
          editorRef.current.innerHTML = sanitized
        }
        setSaveState('saved')
      } else {
        setSaveState('error')
      }
    },
    [updateDiscovery],
  )

  useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = initialContentRef.current
  }, [])

  useEffect(
    () => () => {
      if (autoSaveTimerRef.current !== null) window.clearTimeout(autoSaveTimerRef.current)
      const sanitized = sanitizeDiscoveryHtml(latestDraftRef.current)
      if (sanitized !== lastSavedRef.current) {
        void useWorkspaceStore.getState().updateDiscovery(sanitized)
      }
    },
    [solution.id],
  )

  const scheduleSave = (html: string) => {
    latestDraftRef.current = html
    setDraftHtml(html)
    setSaveState('unsaved')
    setEditorError(null)
    if (autoSaveTimerRef.current !== null) window.clearTimeout(autoSaveTimerRef.current)
    autoSaveTimerRef.current = window.setTimeout(() => {
      autoSaveTimerRef.current = null
      void saveHtml(latestDraftRef.current)
    }, AUTO_SAVE_DELAY)
  }

  const captureSelection = () => {
    const editor = editorRef.current
    const selection = window.getSelection()
    if (!editor || !selection?.rangeCount) return
    const range = selection.getRangeAt(0)
    if (editor.contains(range.commonAncestorContainer)) selectionRef.current = range.cloneRange()
  }

  const restoreSelection = () => {
    const editor = editorRef.current
    if (!editor) return
    editor.focus()
    const selection = window.getSelection()
    selection?.removeAllRanges()
    if (selectionRef.current) selection?.addRange(selectionRef.current)
  }

  const runCommand = (command: RichTextCommand, value?: string) => {
    restoreSelection()
    const editor = editorRef.current
    if (!editor) return
    const nextRange = applyRichTextCommand(editor, selectionRef.current, command, value)
    selectionRef.current = nextRange.cloneRange()
    showRange(nextRange)
    scheduleSave(editor.innerHTML)
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

  const openLinkDialog = () => {
    captureSelection()
    setEditorError(null)
    setLinkDialogOpen(true)
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

  const wordCount = useMemo(() => discoveryWordCount(draftHtml), [draftHtml])

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
          <div className="flex items-center gap-3">
            <SaveStatus state={saveState} />
            <button
              type="button"
              className="button-secondary"
              disabled={saveState === 'saving' || saveState === 'saved'}
              onClick={() => {
                if (autoSaveTimerRef.current !== null) {
                  window.clearTimeout(autoSaveTimerRef.current)
                  autoSaveTimerRef.current = null
                }
                void saveHtml(latestDraftRef.current)
              }}
            >
              Save now
            </button>
          </div>
        </div>

        <div className="mt-7 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <DiscoveryToolbar
            onCaptureSelection={captureSelection}
            onCommand={runCommand}
            onInsertLink={openLinkDialog}
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
          <div
            ref={editorRef}
            className="discovery-editor min-h-[32rem] px-10 py-9 outline-none"
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-label="Discovery notes editor"
            aria-multiline="true"
            data-placeholder="Start with the problem, workshop notes, open questions, or anything the team is still working through…"
            onInput={(event) => {
              scheduleSave(event.currentTarget.innerHTML)
            }}
            onKeyUp={captureSelection}
            onMouseUp={captureSelection}
            onPaste={(event) => {
              handlePaste(event, runCommand)
            }}
          />
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-3 text-xs text-slate-500">
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
  const text = event.clipboardData.getData('text/plain')
  insert('insertHTML', escapeText(text).replaceAll('\n', '<br>'))
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('Image data was unavailable'))
    })
    reader.addEventListener('error', () => {
      reject(reader.error ?? new Error('Image read failed'))
    })
    reader.readAsDataURL(file)
  })
}

function discoveryWordCount(html: string): number {
  if (!html.trim()) return 0
  const parsed = new DOMParser().parseFromString(html, 'text/html')
  const text = parsed.body.textContent?.trim() ?? ''
  return text ? text.split(/\s+/).length : 0
}

function escapeText(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function escapeAttribute(value: string) {
  return escapeText(value)
}
