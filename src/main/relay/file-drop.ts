import { app, ipcMain } from 'electron'
import { stat } from 'node:fs/promises'
import { join, resolve, isAbsolute } from 'node:path'
import { spawnProcess } from '../../shared/child-process/run-process'
import type { Hosts } from './host-client'
const hasControl = (value: string): boolean =>
  [...value].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)
function runSess(args: string[]): Promise<string[]> {
  const binary = app.isPackaged
    ? join(process.resourcesPath, 'relay/bin/sess')
    : resolve(__dirname, '../../../resources/relay/bin/sess')
  return new Promise((resolve, reject) => {
    const child = spawnProcess({ program: binary, args, stdio: 'pipe' })
    let output = '',
      error = ''
    const timeout = setTimeout(() => {
      child.kill()
      reject(new Error('File transfer timed out.'))
    }, 180_000)
    child.stdout?.on('data', (data) => {
      output = (output + data).slice(-65536)
    })
    child.stderr?.on('data', (data) => {
      error = (error + data).slice(-4096)
    })
    child.on('error', (err) => {
      clearTimeout(timeout)
      reject(err)
    })
    child.on('exit', (code) => {
      clearTimeout(timeout)
      if (code !== 0) {
        reject(new Error(error || 'sess transfer failed'))
        return
      }
      resolve(output.trim().split('\n').filter(Boolean))
    })
    child.stdin?.end()
  })
}
export function installFileDrop(
  hosts: Hosts,
  authorize: (event: Electron.IpcMainInvokeEvent) => void,
  attached: (key: string) => boolean
): void {
  const prepared = new Set<string>()
  ipcMain.handle(
    'relay:drop-files',
    async (event, hostName: string, workspace: string, terminal: string, paths: string[]) => {
      authorize(event)
      const key = JSON.stringify([hostName, workspace, terminal])
      if (!attached(key)) {
        throw new Error('Terminal is disconnected.')
      }
      if (!Array.isArray(paths) || !paths.length || paths.length > 8) {
        throw new Error('Drop up to eight files at a time.')
      }
      let bytes = 0
      for (const path of paths) {
        if (typeof path !== 'string' || !isAbsolute(path) || hasControl(path)) {
          throw new Error('Invalid file path.')
        }
        const info = await stat(path)
        if (!info.isFile()) {
          throw new Error('Drop regular files; folders are not supported.')
        }
        bytes += info.size
      }
      if (bytes > 25 * 1024 * 1024) {
        throw new Error('Files must total 25 MiB or less.')
      }
      const host = await hosts.resolve(hostName)
      if (!host) {
        return paths
      }
      if (!prepared.has(host.ssh)) {
        await runSess(['init', host.ssh])
        prepared.add(host.ssh)
      }
      const result = await runSess(['upload', '--host', host.ssh, '--', ...paths])
      if (
        result.length !== paths.length ||
        result.some((p) => !p.startsWith('/') || hasControl(p))
      ) {
        throw new Error('sess returned an invalid remote path.')
      }
      if (!attached(key)) {
        throw new Error(
          'Files uploaded, but the terminal disconnected. Drop again after reconnecting.'
        )
      }
      return result
    }
  )
}
