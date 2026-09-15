import type { IBufferRange } from '@xterm/xterm'

type Fragment = { row: number; start: number; end: number }
export type TableLink = { url: string; fragments: Fragment[] }

// Hard wraps inside table cells aren't xterm soft wraps. Require a closed parenthesized URL.
export function tableLinks(lines: string[]): TableLink[] {
  const links: TableLink[] = []
  lines.forEach((line, row) => {
    for (const match of line.matchAll(/\(https?:\/\/[^\s<>"'`)]*/g)) {
      const start = match.index + 1
      let url = match[0].slice(1)
      if (line[start + url.length] === ')') {
        continue
      }
      const prefix = line.slice(0, match.index)
      const boundaries = [...prefix.matchAll(/ {2,}|[│|]/g)]
      const boundary = boundaries.at(-1)
      const cellStart = boundary ? boundary.index + boundary[0].length : 0
      const left = cellStart + (line.slice(cellStart).match(/^\s*/)?.[0].length || 0)
      const fragments: Fragment[] = [{ row, start, end: start + url.length }]
      for (let next = row + 1; next < Math.min(lines.length, row + 9); next++) {
        const continuation = lines[next]
        if (continuation.slice(0, left).trim() && !/^[ │|]*$/.test(continuation.slice(0, left))) {
          break
        }
        const token = continuation.slice(left).match(/^[^\s<>"'`│|]+/)?.[0]
        if (!token || /^https?:/.test(token)) {
          break
        }
        const close = token.indexOf(')')
        const part = close === -1 ? token : token.slice(0, close)
        if (!part || !/^[\w\-./~:%?#[\]@!$&*+,;=]+$/.test(part)) {
          break
        }
        url += part
        fragments.push({ row: next, start: left, end: left + part.length })
        if (url.length > 8192) {
          break
        }
        if (close !== -1) {
          try {
            const parsed = new URL(url)
            if (parsed.hostname && !parsed.username && !parsed.password) {
              links.push({ url, fragments })
            }
          } catch {
            /* Incomplete URLs stay plain text. */
          }
          break
        }
      }
    }
  })
  return links
}

export function fragmentRange(
  fragment: Fragment,
  positions: { x: number; y: number }[][]
): IBufferRange {
  return {
    start: positions[fragment.row][fragment.start],
    end: positions[fragment.row][fragment.end - 1]
  }
}
