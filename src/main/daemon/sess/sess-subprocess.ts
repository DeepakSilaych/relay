import * as pty from 'node-pty'
import { isAbsolute } from 'node:path'
import { access } from 'node:fs/promises'
import type { PtySubprocessOptions } from '../pty-subprocess'
import type { SubprocessHandle } from '../session-subprocess-handle'
import { PtyPreListenerEvents } from '../pty-subprocess/pre-listener-events'
import { SessSessionOwner } from './sess-session-owner'

export async function createSessSubprocess(
  opts: PtySubprocessOptions,
  env: Record<string, string>,
  shell: string,
  cwd: string
): Promise<SubprocessHandle> {
  if (process.platform === 'win32') {
    throw new Error('sess requires a POSIX execution host; use a Linux host from Windows')
  }
  const executable = env.ORCA_SESS_EXECUTABLE
  const root = env.ORCA_SESS_DIR
  if (!executable || !root || !isAbsolute(executable) || !isAbsolute(root)) {
    throw new Error('ORCA_SESS_EXECUTABLE and ORCA_SESS_DIR must be absolute execution-host paths')
  }
  await access(executable)
  delete env.TMUX
  delete env.TMUX_PANE
  const owner = new SessSessionOwner(root, opts.sessionId, env)
  const created = await owner.ensure({
    cwd,
    shell,
    command: opts.command,
    cols: opts.cols,
    rows: opts.rows
  })
  const events = new PtyPreListenerEvents()
  let proc: pty.IPty | undefined
  let disposed = false
  let ended = false
  let paused = false
  let retry: ReturnType<typeof setTimeout> | undefined
  let retryDelay = 100
  let cols = opts.cols
  let rows = opts.rows
  let foreground: string | null = null
  const inspect = async () => {
    const observation = await owner.observe()
    foreground = observation.state === 'live' ? observation.command : null
    return observation
  }
  const recover = async () => {
    if (disposed || ended) {
      return
    }
    const observation = await inspect()
    if (disposed || ended) {
      return
    }
    if (observation.state === 'exited') {
      ended = true
      events.acceptExit({ exitCode: -1, hostReportsChildExitStatus: false })
      return
    }
    if (observation.state === 'live') {
      try {
        attach()
        return
      } catch {
        /* Retry attachment without recreating the owner. */
      }
    }
    retryDelay = Math.min(retryDelay * 2, 5000)
    retry = setTimeout(() => {
      void recover()
    }, retryDelay)
    retry.unref()
  }
  const attach = () => {
    const attached = pty.spawn('/bin/bash', [executable, 'attach', owner.name], {
      name: 'xterm-256color',
      cols,
      rows,
      cwd,
      env: { ...env, SESS_DIR: root, SESS_ATTACH_ONLY: '1', RELAY_NO_STATUS: '1' }
    })
    proc = attached
    if (paused) {
      attached.pause()
    }
    attached.onData((data) => {
      if (!disposed && proc === attached) {
        events.acceptData(data)
      }
    })
    attached.onExit(() => {
      if (proc !== attached) {
        return
      }
      proc = undefined
      if (!disposed) {
        void recover()
      }
    })
  }
  attach()
  const stop = () => {
    if (!ended) {
      owner.end()
    }
  }
  return {
    pid: created.pid,
    ownsExternalSession: true,
    reattachedExternalSession: !created.isNew,
    shellPath: shell,
    shellCwd: cwd,
    shellPathEnv: env.PATH,
    startupCommandDeliveredInShellArgs: true,
    getForegroundProcess: () => foreground,
    confirmForegroundProcess: async () => {
      await inspect()
      return foreground
    },
    // A tmux pane needs host process evidence before claiming it is safe to sweep.
    confirmShellForeground: async () => false,
    write: (data) => {
      if (!disposed && !ended) {
        if (!proc) {
          throw new Error('sess attachment is reconnecting; input was not delivered')
        }
        proc.write(data)
      }
    },
    resize: (c, r) => {
      if (!Number.isInteger(c) || !Number.isInteger(r) || c < 1 || r < 1) {
        return
      }
      cols = c
      rows = r
      proc?.resize(c, r)
    },
    pause: () => {
      paused = true
      proc?.pause()
    },
    resume: () => {
      paused = false
      proc?.resume()
    },
    kill: stop,
    forceKill: stop,
    terminateOwnedTree: () => 'unavailable',
    signal: (sig) => {
      if (sig === 'SIGWINCH') {
        proc?.resize(cols, rows)
      } else if (sig === 'SIGTERM' || sig === 'SIGKILL') {
        stop()
      } else {
        throw new Error('Use terminal input to signal the sess foreground process')
      }
    },
    onData: (cb) => events.onData(cb),
    onExit: (cb) => events.onExit(cb),
    dispose: () => {
      disposed = true
      if (retry) {
        clearTimeout(retry)
      }
      events.clear()
      const attached = proc
      proc = undefined
      attached?.kill()
    }
  }
}
