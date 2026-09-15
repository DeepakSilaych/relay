import { describe, expect, it } from 'vitest'
import { tableLinks } from './terminal-table-links'

describe('hard-wrapped terminal URLs', () => {
  it('reconstructs a table URL without including adjacent columns', () => {
    const rows = [
      '  ENG-42 (https://          IN REVIEW    Other column',
      '  linear.app/example/      unrelated text',
      '  issue/ENG-42)'
    ]
    const [link] = tableLinks(rows)
    expect(link.url).toBe('https://linear.app/example/issue/ENG-42')
    expect(link.fragments.map((f) => rows[f.row].slice(f.start, f.end))).toEqual([
      'https://',
      'linear.app/example/',
      'issue/ENG-42'
    ])
  })
  it('supports HTTP and table borders', () => {
    expect(tableLinks(['│ Task (http:// │', '│ localhost:3000/ │', '│ test) │'])[0].url).toBe(
      'http://localhost:3000/test'
    )
  })
  it('does not merge ordinary prose, separate links, or incomplete URLs', () => {
    for (const rows of [
      ['https://example.com', 'some unrelated words)'],
      ['(https://example.com)', 'another/path)'],
      ['(https://', 'https://different.example/path)'],
      ['(https://', 'some prose with spaces)'],
      ['(https://', 'example.com/path'],
      ['  (https://', 'bad indent)']
    ]) {
      expect(tableLinks(rows)).toEqual([])
    }
  })
})
