import type { MouseEvent, ReactNode } from 'react'
import type { RichTextCommand } from './richTextCommands'

type DiscoveryToolbarProps = {
  onCaptureSelection: () => void
  onCommand: (command: RichTextCommand, value?: string) => void
  onInsertLink: () => void
  onInsertTable: () => void
  onInsertImage: () => void
}

export function DiscoveryToolbar({
  onCaptureSelection,
  onCommand,
  onInsertLink,
  onInsertTable,
  onInsertImage,
}: DiscoveryToolbarProps) {
  return (
    <div
      className="sticky top-0 z-30 flex h-14 items-center gap-1 overflow-x-auto rounded-t-xl border-b border-slate-200 bg-slate-50 px-4 py-2 shadow-sm"
      role="toolbar"
      aria-label="Discovery formatting"
    >
      <select
        className="mr-2 shrink-0 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        aria-label="Text style"
        defaultValue="p"
        onMouseDown={onCaptureSelection}
        onChange={(event) => {
          onCommand('formatBlock', `<${event.target.value}>`)
        }}
      >
        <option value="p">Paragraph</option>
        <option value="h2">Heading</option>
        <option value="h3">Subheading</option>
        <option value="blockquote">Quote</option>
      </select>
      <ToolbarButton
        label="Bold"
        shortcut="Ctrl+B"
        onClick={() => {
          onCommand('bold')
        }}
      >
        <strong>B</strong>
      </ToolbarButton>
      <ToolbarButton
        label="Italic"
        shortcut="Ctrl+I"
        onClick={() => {
          onCommand('italic')
        }}
      >
        <em>I</em>
      </ToolbarButton>
      <ToolbarButton
        label="Underline"
        shortcut="Ctrl+U"
        onClick={() => {
          onCommand('underline')
        }}
      >
        <span className="underline underline-offset-2">U</span>
      </ToolbarButton>
      <ToolbarDivider />
      <ToolbarButton
        label="Bulleted list"
        onClick={() => {
          onCommand('insertUnorderedList')
        }}
      >
        <ListIcon ordered={false} />
      </ToolbarButton>
      <ToolbarButton
        label="Numbered list"
        onClick={() => {
          onCommand('insertOrderedList')
        }}
      >
        <ListIcon ordered />
      </ToolbarButton>
      <ToolbarDivider />
      <ToolbarButton label="Insert table" onClick={onInsertTable}>
        Table
      </ToolbarButton>
      <ToolbarButton label="Insert image" onClick={onInsertImage}>
        Image
      </ToolbarButton>
      <ToolbarButton label="Add link" onClick={onInsertLink}>
        Link
      </ToolbarButton>
    </div>
  )
}

function ToolbarButton({
  label,
  shortcut,
  children,
  onClick,
}: {
  label: string
  shortcut?: string
  children: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className="shrink-0 rounded-md px-2.5 py-1.5 text-sm text-slate-700 hover:bg-white hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-200"
      aria-label={label}
      title={shortcut ? `${label} (${shortcut})` : label}
      onMouseDown={(event: MouseEvent<HTMLButtonElement>) => {
        event.preventDefault()
      }}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function ToolbarDivider() {
  return <span className="mx-1 h-6 w-px shrink-0 bg-slate-300" aria-hidden="true" />
}

function ListIcon({ ordered }: { ordered: boolean }) {
  return (
    <span
      className="grid w-8 grid-cols-[0.75rem_1fr] items-center gap-x-1 gap-y-0.5"
      aria-hidden="true"
    >
      {[1, 2, 3].map((item) => (
        <span key={item} className="contents">
          <span className="text-right text-[9px] leading-none">
            {ordered ? `${String(item)}.` : '•'}
          </span>
          <span className="h-px w-4 bg-current opacity-70" />
        </span>
      ))}
    </span>
  )
}
