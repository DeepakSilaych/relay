import { terminalTabs } from '../../../shared/relay/types'
import { useEffect, useRef } from 'react'
import type { Session, Workspace } from '../../../shared/relay/types'

export function useWorkspaceShortcuts(options: {
  disabled: boolean
  workspaces: Workspace[]
  workspace?: Workspace
  terminal?: Session
  selectWorkspace: (id: string) => void
  selectTerminal: (id: string) => void
  newWorkspace: () => void
  newTerminal: () => Promise<void>
  split: (axis: 'columns' | 'rows') => Promise<void>
  closeTab: () => Promise<void>
  report: (error: unknown) => void
}) {
  const pending = useRef(false)
  useEffect(
    () =>
      window.relay.onShortcut((shortcut) => {
        if (
          options.disabled ||
          pending.current ||
          document.querySelector('[data-relay-renaming]')
        ) {
          return
        }
        if (shortcut === 'split-right' || shortcut === 'split-down') {
          if (!options.terminal) {
            return
          }
          pending.current = true
          void options
            .split(shortcut === 'split-right' ? 'columns' : 'rows')
            .catch(options.report)
            .finally(() => {
              pending.current = false
            })
          return
        }
        if (shortcut === 'new-workspace') {
          options.newWorkspace()
          return
        }
        if (shortcut === 'new-terminal' && !options.workspace) {
          return
        }
        if (shortcut === 'close-tab' || shortcut === 'new-terminal') {
          pending.current = true
          const action = shortcut === 'new-terminal' ? options.newTerminal : options.closeTab
          void action()
            .catch(options.report)
            .finally(() => {
              pending.current = false
            })
          return
        }
        const workspaceNavigation = shortcut.endsWith('workspace')
        const items = workspaceNavigation
          ? options.workspaces
          : terminalTabs(options.workspace?.terminals || [])
        if (!items.length) {
          return
        }
        const current = workspaceNavigation ? options.workspace?.id : options.terminal?.id
        const currentTab = options.terminal?.tab_id || current
        const index = items.findIndex((item) =>
          workspaceNavigation
            ? item.id === current
            : ('tab_id' in item ? item.tab_id || item.id : item.id) === currentTab
        )
        const offset = shortcut.startsWith('previous') ? -1 : 1
        const next = items[(Math.max(0, index) + offset + items.length) % items.length]
        if (workspaceNavigation) {
          options.selectWorkspace(next.id)
        } else {
          options.selectTerminal(next.id)
        }
      }),
    [options]
  )
}
