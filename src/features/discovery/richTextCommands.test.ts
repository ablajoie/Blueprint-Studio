import { applyRichTextCommand } from './richTextCommands'

describe('discovery rich-text commands', () => {
  it('applies inline formatting to the selected text', () => {
    const editor = document.createElement('div')
    editor.innerHTML = '<p>Workshop notes</p>'
    document.body.appendChild(editor)
    const text = editor.querySelector('p')?.firstChild
    expect(text).not.toBeNull()
    if (!text) return
    const range = document.createRange()
    range.setStart(text, 0)
    range.setEnd(text, 8)

    applyRichTextCommand(editor, range, 'bold')

    expect(editor.innerHTML).toBe('<p><strong>Workshop</strong> notes</p>')
    editor.remove()
  })

  it('turns the current paragraph into a semantic list', () => {
    const editor = document.createElement('div')
    editor.innerHTML = '<p>Open security question</p>'
    document.body.appendChild(editor)
    const text = editor.querySelector('p')?.firstChild
    expect(text).not.toBeNull()
    if (!text) return
    const range = document.createRange()
    range.setStart(text, 4)
    range.collapse(true)

    applyRichTextCommand(editor, range, 'insertUnorderedList')

    expect(editor.innerHTML).toBe('<ul><li>Open security question</li></ul>')
    editor.remove()
  })

  it('underlines selected text semantically', () => {
    const editor = document.createElement('div')
    editor.innerHTML = '<p>Accepted answer</p>'
    const text = editor.querySelector('p')?.firstChild
    expect(text).not.toBeNull()
    if (!text) return
    const range = document.createRange()
    range.setStart(text, 0)
    range.setEnd(text, 8)

    applyRichTextCommand(editor, range, 'underline')

    expect(editor.innerHTML).toBe('<p><u>Accepted</u> answer</p>')
  })

  it('indents and outdents one list level', () => {
    const editor = document.createElement('div')
    editor.innerHTML = '<ul><li>Parent</li><li>Child</li></ul>'
    const childText = editor.querySelectorAll('li')[1]?.firstChild
    expect(childText).not.toBeNull()
    if (!childText) return
    const range = document.createRange()
    range.setStart(childText, 2)
    range.collapse(true)

    const nestedRange = applyRichTextCommand(editor, range, 'indentListItem')
    expect(editor.innerHTML).toBe('<ul><li>Parent<ul><li>Child</li></ul></li></ul>')

    applyRichTextCommand(editor, nestedRange, 'outdentListItem')
    expect(editor.innerHTML).toBe('<ul><li>Parent</li><li>Child</li></ul>')
  })
})
