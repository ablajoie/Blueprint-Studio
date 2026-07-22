const allowedTags = new Set([
  'A',
  'BLOCKQUOTE',
  'BR',
  'DIV',
  'EM',
  'H2',
  'H3',
  'HR',
  'IMG',
  'LI',
  'OL',
  'P',
  'STRONG',
  'TABLE',
  'TBODY',
  'TD',
  'TH',
  'THEAD',
  'TR',
  'UL',
])

const removeWithContent = new Set(['IFRAME', 'OBJECT', 'SCRIPT', 'STYLE', 'TEMPLATE'])
const safeImageSource = /^(?:https:\/\/|data:image\/(?:png|jpeg|gif|webp);base64,)/i

export function sanitizeDiscoveryHtml(html: string): string {
  if (!html.trim()) return ''
  const parsed = new DOMParser().parseFromString(
    `<div id="discovery-root">${html}</div>`,
    'text/html',
  )
  const root = parsed.getElementById('discovery-root')
  if (!root) return ''

  Array.from(root.querySelectorAll('*')).forEach((element) => {
    if (removeWithContent.has(element.tagName)) {
      element.remove()
      return
    }
    if (!allowedTags.has(element.tagName)) {
      element.replaceWith(...Array.from(element.childNodes))
      return
    }

    Array.from(element.attributes).forEach((attribute) => {
      const keep =
        (element.tagName === 'A' && attribute.name === 'href') ||
        (element.tagName === 'IMG' && ['src', 'alt'].includes(attribute.name)) ||
        (['TD', 'TH'].includes(element.tagName) && ['colspan', 'rowspan'].includes(attribute.name))
      if (!keep) element.removeAttribute(attribute.name)
    })

    if (element instanceof HTMLAnchorElement) {
      const href = normalizeDiscoveryLink(element.getAttribute('href') ?? '')
      if (href) {
        element.setAttribute('href', href)
        element.setAttribute('target', '_blank')
        element.setAttribute('rel', 'noopener noreferrer')
      } else {
        element.removeAttribute('href')
      }
    }

    if (element instanceof HTMLImageElement) {
      const source = element.getAttribute('src') ?? ''
      if (!safeImageSource.test(source)) element.remove()
    }

    if (['TD', 'TH'].includes(element.tagName)) {
      normalizeSpanAttribute(element, 'colspan')
      normalizeSpanAttribute(element, 'rowspan')
    }
  })

  return root.innerHTML.trim()
}

export function normalizeDiscoveryLink(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  const candidate = /^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const parsed = new URL(candidate)
    return ['http:', 'https:', 'mailto:'].includes(parsed.protocol) ? candidate : ''
  } catch {
    return ''
  }
}

function normalizeSpanAttribute(element: Element, name: 'colspan' | 'rowspan') {
  const value = Number(element.getAttribute(name))
  if (!Number.isInteger(value) || value < 1 || value > 12) element.removeAttribute(name)
}
