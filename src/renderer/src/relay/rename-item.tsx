import { ActionMenu, type Action } from './action-menu'
import { useRef, useState, type ReactNode } from 'react'
import { Input } from '@/components/ui/input'

export function RenameItem({
  actions,
  end,
  name,
  kind,
  selected,
  className,
  leading,
  trailing,
  select,
  rename,
  enabled = true
}: {
  actions?: Action[]
  end?: ReactNode
  name: string
  kind: 'workspace' | 'terminal'
  selected: boolean
  className: string
  leading: ReactNode
  trailing?: ReactNode
  select: () => void
  rename: (name: string) => Promise<void>
  enabled?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(name)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const pending = useRef(false)
  const cancelled = useRef(false)
  const input = useRef<HTMLInputElement>(null)
  const begin = () => {
    if (!enabled) {
      return
    }
    cancelled.current = false
    setValue(name)
    setError('')
    setEditing(true)
  }
  const save = async () => {
    if (pending.current || cancelled.current) {
      return
    }
    const next = value.trim()
    if (!next) {
      setError('Enter a name.')
      input.current?.focus()
      return
    }
    if (next === name) {
      setEditing(false)
      return
    }
    pending.current = true
    setSaving(true)
    try {
      await rename(next)
      setEditing(false)
    } catch (e) {
      setError(String(e))
      input.current?.focus()
    } finally {
      pending.current = false
      setSaving(false)
    }
  }
  if (editing) {
    return (
      <div
        className={kind === 'terminal' ? 'h-full min-w-0 shrink-0' : 'min-w-0'}
        data-relay-renaming
      >
        <div className={className}>
          {leading}
          <Input
            ref={input}
            aria-label={`Rename ${kind}`}
            aria-invalid={!!error}
            value={value}
            maxLength={120}
            autoFocus
            onFocus={(e) => e.target.select()}
            readOnly={saving}
            className="h-7 min-w-0 text-xs"
            onChange={(e) => {
              setValue(e.target.value)
              setError('')
            }}
            onBlur={() => {
              void save()
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void save()
              }
              if (e.key === 'Escape' && !pending.current) {
                e.preventDefault()
                cancelled.current = true
                setEditing(false)
              }
            }}
          />
        </div>
        {error && (
          <p role="alert" className="px-2 text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
    )
  }
  return (
    <ActionMenu
      actions={[
        { label: `Rename ${kind}`, run: begin, disabled: !enabled, shortcut: 'F2' },
        ...(actions || [])
      ]}
    >
      <div className="flex h-full min-w-0 flex-1 items-center">
        <button
          className={className}
          aria-selected={selected}
          onClick={(e) => {
            if (
              selected &&
              e.detail > 0 &&
              e.target instanceof Element &&
              e.target.closest('[data-rename-label]')
            ) {
              begin()
            } else {
              select()
            }
          }}
          onDoubleClick={(e) => {
            if (e.target instanceof Element && e.target.closest('[data-rename-label]')) {
              begin()
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'F2') {
              e.preventDefault()
              begin()
            }
          }}
        >
          {leading}
          <span data-rename-label className="min-w-0 max-w-56 flex-1 truncate">
            {name}
          </span>
          {trailing}
        </button>
        {end}
      </div>
    </ActionMenu>
  )
}
