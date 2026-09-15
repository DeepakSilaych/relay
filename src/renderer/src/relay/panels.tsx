import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { PanelLeft, PanelRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSidebarResize } from '@/hooks/useSidebarResize'
import relayIcon from '../../../../resources/relay/brand/icon.svg'
type Side = 'left' | 'right'
type Panel = { width: number; open: boolean }
const defaults = { left: { width: 240, open: true }, right: { width: 320, open: true } }
function readPanels(): Record<Side, Panel> {
  try {
    const saved = JSON.parse(localStorage.getItem('relay.panels') || '{}')
    const read = (side: Side): Panel => ({
      width: Number.isFinite(saved[side]?.width)
        ? Math.max(200, Math.min(480, saved[side].width))
        : defaults[side].width,
      open: typeof saved[side]?.open === 'boolean' ? saved[side].open : true
    })
    return { left: read('left'), right: read('right') }
  } catch {
    return defaults
  }
}
export function usePanels() {
  const [panels, setPanels] = useState(readPanels)
  const [viewport, setViewport] = useState(window.innerWidth)
  useEffect(() => {
    const resize = () => setViewport(window.innerWidth)
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])
  useEffect(() => {
    localStorage.setItem('relay.panels', JSON.stringify(panels))
  }, [panels])
  const update = useCallback((side: Side, values: Partial<Panel>) => {
    setPanels((current) => ({ ...current, [side]: { ...current[side], ...values } }))
  }, [])
  const max = Math.max(200, Math.min(480, (viewport - 340) / 2))
  return { panels, update, max }
}
type Layout = ReturnType<typeof usePanels>
export function WorkspaceHeader({
  host,
  name,
  layout
}: {
  host: string
  name?: string
  layout: Layout
}) {
  return (
    <header className="relay-drag flex h-10 shrink-0 items-center gap-3 border-b px-4">
      <span
        className={`flex items-center gap-2 text-sm font-semibold ${navigator.platform.includes('Mac') ? 'ml-20' : ''}`}
      >
        <img src={relayIcon} alt="" className="size-5" />
        Relay
      </span>
      <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
        {host === 'local' ? 'Local' : host}
        {name && ` / ${name}`}
      </span>
      <div className="flex gap-1">
        {(['left', 'right'] as const).map((side) => {
          const label = `${layout.panels[side].open ? 'Hide' : 'Show'} ${side === 'left' ? 'workspaces' : 'repositories'}`
          const Icon = side === 'left' ? PanelLeft : PanelRight
          return (
            <Button
              key={side}
              size="icon-xs"
              variant="ghost"
              aria-label={label}
              title={label}
              aria-pressed={layout.panels[side].open}
              onClick={() => layout.update(side, { open: !layout.panels[side].open })}
            >
              <Icon />
            </Button>
          )
        })}
      </div>
    </header>
  )
}
export function ResizableSidebar({
  side,
  layout,
  children
}: {
  side: Side
  layout: Layout
  children: ReactNode
}) {
  const panel = layout.panels[side]
  const width = Math.min(panel.width, layout.max)
  const update = layout.update
  const setWidth = useCallback((value: number) => update(side, { width: value }), [update, side])
  const { containerRef, isResizing, onResizeStart } = useSidebarResize<HTMLDivElement>({
    isOpen: panel.open,
    width,
    minWidth: 200,
    maxWidth: layout.max,
    deltaSign: side === 'left' ? 1 : -1,
    setWidth
  })
  return (
    <div
      ref={containerRef}
      data-sidebar={side}
      className={`relative min-h-0 shrink-0 ${panel.open ? '' : 'hidden'}`}
    >
      {children}
      <div
        role="separator"
        tabIndex={0}
        aria-orientation="vertical"
        aria-label={`Resize ${side === 'left' ? 'workspaces' : 'repositories'}`}
        aria-valuemin={200}
        aria-valuemax={Math.round(layout.max)}
        aria-valuenow={Math.round(width)}
        title="Drag to resize; double-click to reset"
        className={`group absolute inset-y-0 z-20 flex w-3 cursor-col-resize justify-center ${side === 'left' ? '-right-1.5' : '-left-1.5'} ${isResizing ? 'bg-ring/10' : ''}`}
        onMouseDown={onResizeStart}
        onDoubleClick={() => setWidth(defaults[side].width)}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
            return
          }
          event.preventDefault()
          const delta = (event.key === 'ArrowRight' ? 16 : -16) * (side === 'left' ? 1 : -1)
          setWidth(Math.min(layout.max, Math.max(200, width + delta)))
        }}
      >
        <div className="h-full w-px bg-border group-hover:bg-ring/50" />
      </div>
    </div>
  )
}
