import { createContext, useContext, type ReactNode } from 'react'
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem
} from '@/components/ui/context-menu'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from '@/components/ui/dropdown-menu'
export type Action = {
  label: string
  icon?: ReactNode
  run: () => void | Promise<unknown>
  disabled?: boolean
  danger?: boolean
  shortcut?: string
}
export const Feedback = createContext<(error: unknown) => void>(() => {})
export function ActionMenu({
  actions,
  children,
  dropdown = false
}: {
  actions: Action[]
  children: ReactNode
  dropdown?: boolean
}) {
  const report = useContext(Feedback)
  const run = (action: Action) => {
    void Promise.resolve().then(action.run).catch(report)
  }
  const items = actions.map((a) => {
    const Item = dropdown ? DropdownMenuItem : ContextMenuItem
    return (
      <Item
        key={a.label}
        disabled={a.disabled}
        variant={a.danger ? 'destructive' : 'default'}
        onSelect={() => run(a)}
      >
        {a.icon}
        {a.label}
        {a.shortcut && (
          <span aria-hidden="true" className="ml-auto pl-4 text-xs text-muted-foreground">
            {a.shortcut}
          </span>
        )}
      </Item>
    )
  })
  return dropdown ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent className="bg-popover text-popover-foreground">
        {items}
      </DropdownMenuContent>
    </DropdownMenu>
  ) : (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="bg-popover text-popover-foreground">
        {items}
      </ContextMenuContent>
    </ContextMenu>
  )
}
export const copyPath = (path: string) => window.relay.copyText(path)
export const command = navigator.userAgent.includes('Mac') ? '⌘' : 'Ctrl+'
