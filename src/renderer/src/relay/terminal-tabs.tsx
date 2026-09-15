import { TerminalAgentIcon } from './agent-icon'
import { useEffect, useRef } from 'react'
import { FileTabs, type useFileTabs, fileKey } from './file-tabs'
import { ReorderList } from './reorder-list'
import { terminalTabs } from '../../../shared/relay/types'
import { RenameItem } from './rename-item'
import { Plus, X, Ellipsis, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Workspace, Session } from '../../../shared/relay/types'
import type { OpenFile } from './editor'
import { ActionMenu } from './action-menu'
import { useInteractions } from './workspace-actions'
export function TerminalTabs({
  fileTabs,
  host,
  refresh,
  workspace,
  terminal,
  file,
  busy,
  setTerminalId,
  setFile,
  terminalNew,
  reveal
}: {
  fileTabs: ReturnType<typeof useFileTabs>
  host: string
  refresh: () => void
  workspace?: Workspace
  terminal?: Session
  file?: OpenFile
  busy: boolean
  setTerminalId: (id: string) => void
  setFile: (file?: OpenFile) => void
  terminalNew: () => Promise<void>
  reveal: (file: OpenFile) => void
}) {
  const tabs = terminalTabs(workspace?.terminals || []),
    menus = useInteractions(),
    strip = useRef<HTMLDivElement>(null)
  const activeFileKey = file && fileKey(file)
  useEffect(() => {
    strip.current
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [terminal?.id, activeFileKey, tabs.length, fileTabs.files.length])
  const choose = (t: Session) => {
    setTerminalId(t.id)
    setFile(undefined)
  }
  return (
    <div className="flex h-11 shrink-0 items-center overflow-hidden border-b">
      <div
        ref={strip}
        className="flex h-full min-w-0 flex-1 items-center overflow-x-auto scrollbar-sleek"
      >
        <ReorderList
          items={tabs}
          horizontal
          disabled={busy}
          reorder={async (ids) => {
            await window.relay.request(host, 'terminal_reorder', {
              workspace: workspace?.id,
              ids: ids.map((id) => {
                const t = tabs.find((t) => t.id === id)!
                return t.tab_id || t.id
              })
            })
            refresh()
          }}
        >
          {(t) => (
            <RenameItem
              key={t.id}
              name={t.name}
              kind="terminal"
              selected={(terminal?.tab_id || terminal?.id) === (t.tab_id || t.id) && !file}
              enabled={!busy}
              actions={workspace ? menus.terminal(workspace, t) : []}
              end={
                <button
                  data-no-drag
                  title="End terminal session"
                  aria-label={`End session ${t.name}`}
                  className="p-2 text-muted-foreground hover:text-destructive"
                  disabled={busy}
                  onClick={() => workspace && menus.end(workspace, t)}
                >
                  <X className="size-3" />
                </button>
              }
              select={() => choose(t)}
              rename={async (name) => {
                await window.relay.request(host, 'terminal_rename', {
                  workspace: workspace?.id,
                  terminal: t.id,
                  name
                })
                refresh()
              }}
              className={`flex h-full shrink-0 items-center gap-2 px-3 text-xs ${(terminal?.tab_id || terminal?.id) === (t.tab_id || t.id) && !file ? 'border-b-2 border-b-foreground bg-accent' : 'text-muted-foreground hover:bg-accent'}`}
              leading={
                <TerminalAgentIcon
                  siblings={workspace?.terminals
                    .filter((s) => (s.tab_id || s.id) === (t.tab_id || t.id))
                    .map((s) => s.id)}
                  terminal={
                    (terminal?.tab_id || terminal?.id) === (t.tab_id || t.id) ? terminal!.id : t.id
                  }
                />
              }
            />
          )}
        </ReorderList>
        <FileTabs
          files={fileTabs.files}
          active={file}
          select={setFile}
          close={fileTabs.close}
          closeOthers={fileTabs.closeOthers}
          reveal={reveal}
        />
      </div>
      {workspace && (
        <div className="flex h-full shrink-0 items-center border-l px-1">
          <Button
            aria-label="New terminal"
            title="New terminal"
            variant="ghost"
            size="icon-sm"
            disabled={busy}
            onClick={() => void terminalNew()}
          >
            <Plus />
          </Button>
          <ActionMenu
            dropdown
            actions={[
              ...tabs.map((t) => ({ label: `Terminal: ${t.name}`, run: () => choose(t) })),
              ...fileTabs.files.map((f) => ({
                label: `File: ${f.path}${f.scope ? ` (${f.scope})` : ''}`,
                run: () => setFile({ ...f, line: undefined, column: undefined })
              }))
            ]}
          >
            <Button aria-label="All tabs" title="All tabs" size="icon-sm" variant="ghost">
              <ChevronDown />
            </Button>
          </ActionMenu>
          <ActionMenu dropdown actions={menus.workspace(workspace)}>
            <Button
              aria-label="Workspace actions"
              title="Workspace actions"
              variant="ghost"
              size="icon-sm"
            >
              <Ellipsis />
            </Button>
          </ActionMenu>
        </div>
      )}
    </div>
  )
}
