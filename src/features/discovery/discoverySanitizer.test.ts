import { normalizeDiscoveryLink, sanitizeDiscoveryHtml } from './discoverySanitizer'

describe('discovery HTML sanitizer', () => {
  it('preserves supported workshop formatting and removes executable content', () => {
    const sanitized = sanitizeDiscoveryHtml(`
      <h2 onclick="alert('no')">Problem statement</h2>
      <p><strong>Keep this</strong><script>alert('no')</script></p>
      <a href="javascript:alert('no')">Unsafe link</a>
      <img src="x" onerror="alert('no')">
      <table style="color:red"><tbody><tr><td colspan="2">Need</td></tr></tbody></table>
    `)

    expect(sanitized).toContain('<h2>Problem statement</h2>')
    expect(sanitized).toContain('<strong>Keep this</strong>')
    expect(sanitized).toContain('<td colspan="2">Need</td>')
    expect(sanitized).not.toContain('script')
    expect(sanitized).not.toContain('javascript:')
    expect(sanitized).not.toContain('onerror')
    expect(sanitized).not.toContain('<img')
    expect(sanitized).not.toContain('style=')
  })

  it('normalizes ordinary links and rejects unsafe protocols', () => {
    expect(normalizeDiscoveryLink('example.com/notes')).toBe('https://example.com/notes')
    expect(normalizeDiscoveryLink('https://example.com/notes')).toBe('https://example.com/notes')
    expect(normalizeDiscoveryLink('data:text/html,bad')).toBe('')
  })

  it('permits safe embedded raster images but excludes SVG payloads', () => {
    expect(
      sanitizeDiscoveryHtml('<img src="data:image/png;base64,AAAA" alt="Workshop">'),
    ).toContain('data:image/png;base64,AAAA')
    expect(sanitizeDiscoveryHtml('<img src="data:image/svg+xml;base64,AAAA" alt="Unsafe">')).toBe(
      '',
    )
  })
})
