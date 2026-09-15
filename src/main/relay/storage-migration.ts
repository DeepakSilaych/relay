import { existsSync, renameSync, symlinkSync } from 'node:fs'
import { join } from 'node:path'
export function relayProfile(appData: string): string {
  const target = join(appData, 'relay'),
    legacy = join(appData, 'magi-orca')
  if (!existsSync(target) && existsSync(legacy)) {
    renameSync(legacy, target)
    symlinkSync(target, legacy, 'dir')
  }
  return target
}
