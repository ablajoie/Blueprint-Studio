import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ClipboardEvent,
  type KeyboardEvent,
} from 'react'
import type { DiscoverySectionDefinition } from '../../domain/blueprint'

type DiscoverySectionEditorProps = {
  section: DiscoverySectionDefinition
  initialHtml: string
  onRegister: (sectionId: string, editor: HTMLDivElement | null) => void
  onInput: (sectionId: string, html: string) => void
  onSelectionChange: (sectionId: string) => void
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>, sectionId: string) => void
  onPaste: (event: ClipboardEvent<HTMLDivElement>) => void
}

export function DiscoverySectionEditor({
  section,
  initialHtml,
  onRegister,
  onInput,
  onSelectionChange,
  onKeyDown,
  onPaste,
}: DiscoverySectionEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLElement>(null)
  const initialHtmlRef = useRef(initialHtml)
  const [headerHeight, setHeaderHeight] = useState(84)

  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    editor.innerHTML = initialHtmlRef.current
    onRegister(section.id, editor)
    return () => {
      onRegister(section.id, null)
    }
  }, [onRegister, section.id])

  useEffect(() => {
    const header = headerRef.current
    if (!header) return
    const measure = () => {
      setHeaderHeight(header.getBoundingClientRect().height || 84)
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(header)
    return () => {
      observer.disconnect()
    }
  }, [section.description, section.title])

  return (
    <article
      id={`discovery-${section.id}`}
      className="discovery-section border-b border-slate-200 last:border-b-0"
      style={{ '--discovery-section-header-height': `${String(headerHeight)}px` } as CSSProperties}
    >
      <header ref={headerRef} className="discovery-section-header">
        <h2 className="text-xl font-semibold tracking-tight text-slate-950">{section.title}</h2>
        <p className="mt-1 text-sm leading-5 text-slate-600">{section.description}</p>
      </header>
      <div
        ref={editorRef}
        className="discovery-editor min-h-44 px-10 py-7 outline-none"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-label={`${section.title} discovery section`}
        aria-multiline="true"
        data-placeholder={
          section.contentType === 'table'
            ? 'Use the starter table or add notes below it.'
            : `Start capturing ${section.title.toLowerCase()}…`
        }
        onFocus={() => {
          onSelectionChange(section.id)
        }}
        onInput={(event) => {
          onInput(section.id, event.currentTarget.innerHTML)
        }}
        onKeyDown={(event) => {
          onKeyDown(event, section.id)
        }}
        onKeyUp={() => {
          onSelectionChange(section.id)
        }}
        onMouseUp={() => {
          onSelectionChange(section.id)
        }}
        onPaste={onPaste}
      />
    </article>
  )
}
