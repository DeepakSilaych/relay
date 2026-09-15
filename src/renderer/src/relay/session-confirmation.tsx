import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
export function SessionConfirmation({
  name,
  kind,
  busy,
  close,
  confirm
}: {
  name?: string
  kind: 'archive' | 'terminal'
  busy: boolean
  close: () => void
  confirm: () => Promise<void>
}) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) {
          close()
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {kind === 'archive' ? 'Archive workspace?' : 'End terminal session?'}{' '}
            {name && <span className="font-normal">{name}</span>}
          </DialogTitle>
          <DialogDescription>
            {kind === 'archive'
              ? 'Worktrees and running sessions are retained on the host. This removes the workspace from the sidebar.'
              : 'This stops the shell and any agents running in this terminal. Switching tabs or closing Relay keeps sessions running.'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2">
          <Button variant="outline" disabled={busy} onClick={close}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={busy} onClick={() => void confirm()}>
            {kind === 'archive' ? 'Archive' : 'End session'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
