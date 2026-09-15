import { useEffect, useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { UpdateState } from '../../../shared/relay/types'
export function UpdateSettings() {
  const [state, setState] = useState<UpdateState>()
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    const off = window.relay.onUpdate((value) => {
      if (active) {
        setState(value)
      }
    })
    void window.relay
      .getUpdate()
      .then((value) => {
        if (active) {
          setState(value)
        }
      })
      .catch((e) => setError(String(e)))
    return () => {
      active = false
      off()
    }
  }, [])
  const busy = !state || ['checking', 'downloading', 'restarting'].includes(state.phase)
  return (
    <section className="space-y-3 border-t pt-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Updates</h3>
        <span className="text-xs text-muted-foreground">{state?.version}</span>
      </div>
      <p className="text-xs text-muted-foreground">
        {state?.message || 'Loading update settings…'}{' '}
        {state?.phase === 'downloading' && `${Math.round(state.percent || 0)}%`}
      </p>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={busy || state?.phase === 'unsupported'}
          onClick={() => {
            setError('')
            void window.relay
              .runUpdate()
              .then(setState)
              .catch((e) => setError(String(e)))
          }}
        >
          {busy ? <Loader2 className="animate-spin" /> : <Download />}Update from GitHub
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            if (state) {
              void window.relay.openExternal(state.releaseUrl)
            }
          }}
        >
          View releases
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {state?.phase === 'unsupported'
          ? 'Replacing the app preserves your workspaces and running terminal sessions.'
          : 'Installs the latest release and restarts Relay. Terminal sessions keep running.'}
      </p>
    </section>
  )
}
