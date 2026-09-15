import type { editor } from 'monaco-editor'
import type { OpenFile } from './editor'
import { fileKey } from './file-tabs'
export function restoreEditor(
  editor: editor.IStandaloneCodeEditor,
  host: string,
  workspace: string,
  file: OpenFile
) {
  const key = `relay.editor:${JSON.stringify([host, workspace, fileKey(file)])}`
  try {
    const saved = JSON.parse(localStorage.getItem(key) || '{}')
    if (Number.isFinite(saved.top)) {
      editor.setScrollTop(saved.top)
    }
    if (Number.isFinite(saved.left)) {
      editor.setScrollLeft(saved.left)
    }
    if (Number.isInteger(saved.line) && Number.isInteger(saved.column)) {
      editor.setPosition({ lineNumber: saved.line, column: saved.column })
    }
  } catch {
    /* Ignore state from older builds. */
  }
  if (file.line) {
    editor.setPosition({ lineNumber: file.line, column: file.column || 1 })
    editor.revealLineInCenter(file.line)
  }
  let timer: ReturnType<typeof setTimeout> | undefined
  const read = () => ({
    top: editor.getScrollTop(),
    left: editor.getScrollLeft(),
    line: editor.getPosition()?.lineNumber,
    column: editor.getPosition()?.column
  })
  let state = read()
  const save = () => {
    clearTimeout(timer)
    localStorage.setItem(key, JSON.stringify(state))
  }
  const schedule = () => {
    state = read()
    clearTimeout(timer)
    timer = setTimeout(save, 250)
  }
  const scroll = editor.onDidScrollChange(schedule),
    position = editor.onDidChangeCursorPosition(schedule)
  const dispose = editor.onDidDispose(save)
  return () => {
    save()
    scroll.dispose()
    position.dispose()
    dispose.dispose()
  }
}
