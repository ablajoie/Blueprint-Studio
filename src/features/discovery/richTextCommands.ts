export type RichTextCommand =
  | 'bold'
  | 'createLink'
  | 'formatBlock'
  | 'insertHTML'
  | 'insertOrderedList'
  | 'insertUnorderedList'
  | 'italic'

export function applyRichTextCommand(
  editor: HTMLElement,
  storedRange: Range | null,
  command: RichTextCommand,
  value = '',
): Range {
  const range = usableRange(editor, storedRange)
  if (command === 'insertHTML') return insertHtml(range, value)
  if (command === 'bold') return wrapSelection(range, 'strong')
  if (command === 'italic') return wrapSelection(range, 'em')
  if (command === 'createLink') return wrapSelection(range, 'a', { href: value })
  if (command === 'formatBlock') return formatBlock(editor, range, value)
  return toggleList(editor, range, command === 'insertOrderedList' ? 'ol' : 'ul')
}

export function showRange(range: Range) {
  const selection = window.getSelection()
  selection?.removeAllRanges()
  selection?.addRange(range)
}

function usableRange(editor: HTMLElement, storedRange: Range | null): Range {
  if (storedRange && editor.contains(storedRange.commonAncestorContainer)) {
    return storedRange.cloneRange()
  }
  const range = document.createRange()
  range.selectNodeContents(editor)
  range.collapse(false)
  return range
}

function insertHtml(range: Range, html: string): Range {
  const template = document.createElement('template')
  template.innerHTML = html
  const lastNode = template.content.lastChild
  range.deleteContents()
  range.insertNode(template.content)
  return lastNode ? caretAfter(lastNode) : range
}

function wrapSelection(
  range: Range,
  tagName: 'a' | 'em' | 'strong',
  attributes: Record<string, string> = {},
): Range {
  const wrapper = document.createElement(tagName)
  Object.entries(attributes).forEach(([name, value]) => {
    wrapper.setAttribute(name, value)
  })

  if (range.collapsed) {
    const placeholder = document.createTextNode('\u200B')
    wrapper.appendChild(placeholder)
    range.insertNode(wrapper)
    const nextRange = document.createRange()
    nextRange.setStart(placeholder, placeholder.length)
    nextRange.collapse(true)
    return nextRange
  }

  wrapper.appendChild(range.extractContents())
  range.insertNode(wrapper)
  const nextRange = document.createRange()
  nextRange.selectNodeContents(wrapper)
  return nextRange
}

function formatBlock(editor: HTMLElement, range: Range, value: string): Range {
  const tagName = value.replace(/[<>]/g, '').toLowerCase()
  if (!['blockquote', 'h2', 'h3', 'p'].includes(tagName)) return range
  const block = closestBlock(editor, range.startContainer)
  const replacement = document.createElement(tagName)

  if (block) {
    replacement.append(...Array.from(block.childNodes))
    block.replaceWith(replacement)
  } else if (!range.collapsed) {
    replacement.appendChild(range.extractContents())
    range.insertNode(replacement)
  } else {
    replacement.appendChild(document.createElement('br'))
    range.insertNode(replacement)
  }

  return caretAtEnd(replacement)
}

function toggleList(editor: HTMLElement, range: Range, tagName: 'ol' | 'ul'): Range {
  const element = closestElement(range.startContainer)
  const listItem = element?.closest('li')
  if (listItem && editor.contains(listItem)) {
    const existingList = listItem.parentElement
    if (existingList?.tagName.toLowerCase() === tagName) {
      const paragraph = document.createElement('p')
      paragraph.append(...Array.from(listItem.childNodes))
      existingList.insertAdjacentElement('beforebegin', paragraph)
      listItem.remove()
      if (!existingList.children.length) existingList.remove()
      return caretAtEnd(paragraph)
    }
    if (existingList && ['OL', 'UL'].includes(existingList.tagName)) {
      const replacement = document.createElement(tagName)
      replacement.append(...Array.from(existingList.childNodes))
      existingList.replaceWith(replacement)
      return caretAtEnd(listItem)
    }
  }

  const block = closestBlock(editor, range.startContainer)
  const list = document.createElement(tagName)
  const item = document.createElement('li')
  list.appendChild(item)
  if (block) {
    item.append(...Array.from(block.childNodes))
    block.replaceWith(list)
  } else if (!range.collapsed) {
    item.appendChild(range.extractContents())
    range.insertNode(list)
  } else {
    item.appendChild(document.createElement('br'))
    range.insertNode(list)
  }
  return caretAtEnd(item)
}

function closestBlock(editor: HTMLElement, node: Node): HTMLElement | null {
  const element = closestElement(node)
  const block = element?.closest('blockquote,h2,h3,p')
  return block && editor.contains(block) ? (block as HTMLElement) : null
}

function closestElement(node: Node): Element | null {
  return node instanceof Element ? node : node.parentElement
}

function caretAfter(node: Node): Range {
  const range = document.createRange()
  range.setStartAfter(node)
  range.collapse(true)
  return range
}

function caretAtEnd(element: Node): Range {
  const range = document.createRange()
  range.selectNodeContents(element)
  range.collapse(false)
  return range
}
