import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { createSessSubprocess } from './sess-subprocess'
import { SessSessionOwner } from './sess-session-owner'
import { quotePosixShell } from '../../../shared/wsl-login-shell-command'
import { runProcess } from '../../../shared/child-process/run-process'

const posix = process.platform === 'win32' ? describe.skip : describe
posix('sess durable process ownership', () => {
  it('reattaches the same shell, does not replay startup, and stops only on explicit end', async () => {
    const root = await mkdtemp(join(tmpdir(), "orca-sess-test's-"))
    const env = {
      PATH: process.env.PATH ?? '/usr/bin:/bin',
      HOME: process.env.HOME ?? root,
      SHELL: '/bin/bash',
      TERM: 'xterm-256color',
      ORCA_SESS_DIR: root,
      ORCA_SESS_EXECUTABLE: resolve('resources/relay/backend/sess-legacy')
    }
    const opts = {
      sessionId: 'durable-pane',
      cols: 80,
      rows: 24,
      cwd: root,
      command: `printf "started\\n" >> ${quotePosixShell(join(root, 'starts'))}`
    }
    const owner = new SessSessionOwner(root, opts.sessionId, env)
    let first: Awaited<ReturnType<typeof createSessSubprocess>> | undefined
    let second: typeof first
    try {
      first = await createSessSubprocess(opts, { ...env }, '/bin/bash', root)
      let output = ''
      first.onData((data) => {
        output += data
      })
      await vi.waitFor(async () =>
        expect(await readFile(join(root, 'starts'), 'utf8')).toBe('started\n')
      )
      first.write('printf "hello-from-%s\\n" sess\r')
      await vi.waitFor(() => expect(output).toContain('hello-from-sess'))
      const initial = await owner.observe()
      expect(initial.state).toBe('live')
      first.dispose()
      expect((await owner.observe()).state).toBe('live')
      second = await createSessSubprocess(opts, { ...env }, '/bin/bash', root)
      expect(second.pid).toBe(first.pid)
      expect(await readFile(join(root, 'starts'), 'utf8')).toBe('started\n')
      expect(second.startupCommandDeliveredInShellArgs).toBe(true)
      second.resize(110, 35)
      second.onData((data) => {
        output += data
      })
      second.write('printf "reattached-%s\\n" ok\r')
      await vi.waitFor(() => expect(output).toContain('reattached-ok'))
      const exited = vi.fn()
      second.onExit(exited)
      await runProcess({
        program: 'tmux',
        args: ['detach-client', '-s', owner.name],
        env,
        timeoutMs: 3000
      })
      await vi.waitFor(async () => {
        const clients = await runProcess({
          program: 'tmux',
          args: ['list-clients', '-t', owner.name, '-F', '#{client_pid}'],
          env,
          timeoutMs: 3000
        })
        expect(clients.stdout.trim()).not.toBe('')
      })
      second.write('printf "recovered-%s\\n" transport\r')
      await vi.waitFor(() => expect(output).toContain('recovered-transport'))
      expect(exited).not.toHaveBeenCalled()
      expect(await readFile(join(root, 'starts'), 'utf8')).toBe('started\n')
      second.kill()
      await vi.waitFor(async () => expect((await owner.observe()).state).toBe('exited'))
      await vi.waitFor(() => expect(exited).toHaveBeenCalledOnce())
      await expect(createSessSubprocess(opts, { ...env }, '/bin/bash', root)).rejects.toThrow(
        'has exited'
      )
    } finally {
      first?.dispose()
      second?.dispose()
      await runProcess({
        program: 'tmux',
        args: ['kill-session', '-t', `=${owner.name}`],
        env,
        timeoutMs: 3000
      })
      await rm(root, { recursive: true, force: true })
    }
  })

  it('serializes concurrent creators and isolates execution roots', async () => {
    const root = await mkdtemp(join(tmpdir(), 'orca-sess-race-'))
    const env = { PATH: process.env.PATH ?? '/usr/bin:/bin', HOME: process.env.HOME ?? root }
    const a = new SessSessionOwner(root, 'same-pane', env)
    const b = new SessSessionOwner(root, 'same-pane', env)
    expect(new SessSessionOwner(`${root}-other`, 'same-pane', env).name).not.toBe(a.name)
    try {
      const args = { cwd: root, shell: '/bin/bash', cols: 80, rows: 24 }
      const results = await Promise.all([a.ensure(args), b.ensure(args)])
      expect(results[0].pid).toBe(results[1].pid)
      expect(results.filter((result) => result.isNew)).toHaveLength(1)
    } finally {
      await runProcess({
        program: 'tmux',
        args: ['kill-session', '-t', `=${a.name}`],
        env,
        timeoutMs: 3000
      })
      await rm(root, { recursive: true, force: true })
    }
  })
})
