import { restoreEditor } from './editor-state'
import { useRef } from 'react'
import { useEffect, useState } from 'react'
import Editor, { DiffEditor, loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import { installMonacoDiffEditorDisposalGuard } from '@/lib/monaco-diff-editor-disposal'
import { diffEditorScrollbarOptions } from '@/components/editor/diff-editor-scrollbar-options'
globalThis.MonacoEnvironment = {
  getWorker: (_id, label) => {
    if (label === 'typescript' || label === 'javascript') {
      return new tsWorker()
    }
    if (label === 'json') {
      return new jsonWorker()
    }
    if (['css', 'scss', 'less'].includes(label)) {
      return new cssWorker()
    }
    if (['html', 'handlebars', 'razor'].includes(label)) {
      return new htmlWorker()
    }
    return new editorWorker()
  }
}
installMonacoDiffEditorDisposalGuard(monaco)
monaco.typescript.typescriptDefaults.setDiagnosticsOptions({
  noSemanticValidation: true,
  noSyntaxValidation: true
})
monaco.typescript.javascriptDefaults.setDiagnosticsOptions({
  noSemanticValidation: true,
  noSyntaxValidation: true
})
loader.config({ monaco })
export type OpenFile = {
  absolutePath?: string
  repo: string
  path: string
  scope?: 'working' | 'staged'
  line?: number
  column?: number
}
export function FileViewer({
  revision = 0,
  host,
  workspace,
  file,
  theme
}: {
  revision?: number
  host: string
  workspace: string
  file: OpenFile
  theme: string
}) {
  const disposeView = useRef<(() => void) | undefined>(undefined)
  useEffect(
    () => () => {
      disposeView.current?.()
      disposeView.current = undefined
    },
    []
  )
  const [content, setContent] = useState<{
    text?: string
    original?: string
    modified?: string
    truncated?: boolean
    binary?: boolean
  }>()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const contentKey = JSON.stringify([host, workspace, file.repo, file.path, file.scope])
  const previousKey = useRef('')
  useEffect(() => {
    let active = true
    if (previousKey.current !== contentKey) {
      setContent(undefined)
    }
    previousKey.current = contentKey
    setLoading(true)
    setError('')
    window.relay
      .request<typeof content>(host, file.scope ? 'diff_content' : 'file', {
        workspace,
        repo: file.repo,
        path: file.path,
        scope: file.scope
      })
      .then((value) => {
        if (active) {
          setContent(value)
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })
      .catch((e) => {
        if (active) {
          setError(String(e))
        }
      })
    return () => {
      active = false
    }
  }, [host, workspace, file, revision, contentKey])
  const language =
    {
      ts: 'typescript',
      tsx: 'typescript',
      js: 'javascript',
      jsx: 'javascript',
      py: 'python',
      rs: 'rust',
      json: 'json',
      md: 'markdown',
      css: 'css',
      html: 'html',
      sh: 'shell',
      go: 'go'
    }[file.path.split('.').pop() || ''] || 'plaintext'
  const options = {
    readOnly: true,
    scrollbar: diffEditorScrollbarOptions,
    minimap: { enabled: false },
    fontSize: 13,
    automaticLayout: true,
    scrollBeyondLastLine: false
  }
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-10 shrink-0 items-center border-b px-3 text-xs">
        <span className="flex-1 truncate">
          {file.repo.startsWith('@') ? '' : `${file.repo} / `}
          {file.path}
          {file.scope && ` · ${file.scope} diff`}
        </span>
        <span className="ml-3 shrink-0 text-muted-foreground">
          {loading ? 'Refreshing… · Read-only' : 'Read-only'}
        </span>
      </div>
      {error ? (
        <p role="alert" className="p-4 text-sm text-destructive">
          {error}
        </p>
      ) : !content ? (
        <p className="p-4 text-sm text-muted-foreground">Loading file…</p>
      ) : content.binary || content.truncated ? (
        <p className="p-4 text-sm text-muted-foreground">
          {content.binary
            ? 'Binary file. Preview unavailable.'
            : 'File exceeds the 2 MB preview limit.'}
        </p>
      ) : file.scope ? (
        <DiffEditor
          keepCurrentOriginalModel
          keepCurrentModifiedModel
          onMount={(editor) => {
            const model = editor.getModel()
            disposeView.current = restoreEditor(editor.getModifiedEditor(), host, workspace, file)
            editor.onDidDispose(() => {
              model?.original.dispose()
              model?.modified.dispose()
            })
          }}
          original={content.original}
          modified={content.modified}
          language={language}
          theme={theme === 'light' ? 'vs' : 'vs-dark'}
          options={{ ...options, renderSideBySide: true }}
        />
      ) : (
        <Editor
          onMount={(editor) => {
            disposeView.current = restoreEditor(editor, host, workspace, file)
          }}
          value={content.text}
          language={language}
          theme={theme === 'light' ? 'vs' : 'vs-dark'}
          options={options}
        />
      )}
    </div>
  )
}
