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
      className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 px-4 py-3"
      role="toolbar"
      aria-label="Discovery formatting"
    >
      <select
        className="mr-2 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
      <ToolbarDivider />
      <ToolbarButton
        label="Bulleted list"
        onClick={() => {
          onCommand('insertUnorderedList')
        }}
      >
        • List
      </ToolbarButton>
      <ToolbarButton
        label="Numbered list"
        onClick={() => {
          onCommand('insertOrderedList')
        }}
      >
        1. List
      </ToolbarButton>
      <ToolbarDivider />
      <ToolbarButton label="Add link" onClick={onInsertLink}>
        Link
      </ToolbarButton>
      <ToolbarButton label="Insert table" onClick={onInsertTable}>
        Table
      </ToolbarButton>
      <ToolbarButton label="Insert image" onClick={onInsertImage}>
        Image
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
      className="rounded-md px-2.5 py-1.5 text-sm text-slate-700 hover:bg-white hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-200"
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
  return <span className="mx-1 h-6 w-px bg-slate-300" aria-hidden="true" />
}
