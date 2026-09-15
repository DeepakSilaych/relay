import { createContext, useContext, useState } from 'react'
import type { Workspace, Session } from '../../../shared/relay/types'
import type { FormKind } from './forms'
import { copyPath, command, type Action } from './action-menu'
import { SessionConfirmation } from './session-confirmation'
type Menus = {
  workspace: (w: Workspace) => Action[]
  terminal: (w: Workspace, t: Session) => Action[]
  end: (w: Workspace, t: Session) => void
}
export const InteractionContext = createContext<Menus>({
  workspace: () => [],
  terminal: () => [],
  end: () => {}
})
export const useInteractions = () => useContext(InteractionContext)
export function useWorkspaceActions({
  host,
  workspaceId,
  refresh,
  report,
  select,
  form
}: {
  host: string
  workspaceId: string
  refresh: () => void
  report: (e: unknown) => void
  select: (workspace: string, terminal?: string) => void
  form: (kind: FormKind) => void
}) {
  const [target, setTarget] = useState<{ workspace: Workspace; terminal?: Session }>()
  const [pending, setPending] = useState(false)
  const create = async (w: Workspace, terminal?: Session, axis?: 'columns' | 'rows') => {
    setPending(true)
    try {
      const result = await window.relay.request<{ id: string }>(
        host,
        terminal ? 'terminal_split' : 'terminal_new',
        { workspace: w.id, terminal: terminal?.id, axis }
      )
      select(w.id, result.id)
      refresh()
    } finally {
      setPending(false)
    }
  }
  const menus: Menus = {
    end: (workspace, terminal) => setTarget({ workspace, terminal }),
    workspace: (w) => [
      { label: 'New terminal', disabled: pending, shortcut: `${command}T`, run: () => create(w) },
      {
        label: 'Attach repositories',
        run: () => {
          select(w.id)
          form('attach')
        }
      },
      { label: 'Copy workspace path', run: () => copyPath(w.path) },
      {
        label: 'Archive workspace',
        danger: true,
        disabled: pending || !!w.permanent,
        run: () => setTarget({ workspace: w })
      }
    ],
    terminal: (w, t) => [
      {
        label: 'Split side by side',
        disabled: pending,
        shortcut: `${command}D`,
        run: () => create(w, t, 'columns')
      },
      {
        label: 'Split above/below',
        disabled: pending,
        shortcut: `${command}⇧D`,
        run: () => create(w, t, 'rows')
      },
      {
        label: 'Copy current path',
        run: async () => {
          const result = await window.relay.request<{ path: string }>(host, 'terminal_cwd', {
            workspace: w.id,
            terminal: t.id
          })
          await copyPath(result.path)
        }
      },
      {
        label: 'End terminal session',
        danger: true,
        run: () => setTarget({ workspace: w, terminal: t })
      }
    ]
  }
  return {
    menus,
    pending,
    confirming: !!target,
    dialog: target && (
      <SessionConfirmation
        kind={target.terminal ? 'terminal' : 'archive'}
        name={target.terminal?.name || target.workspace.name}
        busy={pending}
        close={() => setTarget(undefined)}
        confirm={async () => {
          setPending(true)
          try {
            await window.relay.request(
              host,
              target.terminal ? 'terminal_remove' : 'workspace_archive',
              { workspace: target.workspace.id, terminal: target.terminal?.id }
            )
            if (!target.terminal && target.workspace.id === workspaceId) {
              select('genral')
            }
            refresh()
            setTarget(undefined)
          } catch (e) {
            report(e)
          } finally {
            setPending(false)
          }
        }}
      />
    )
  }
}
